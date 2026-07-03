#!/usr/bin/env node
// Generate .modonome/policy-attestation.json (ADR-036): a content-addressed manifest
// disclosing the governance policy this repo enforces and its AI-participation posture. It
// reads from the authoritative sources and never feeds back into the detectors, so
// publishing or verifying a policy pack cannot weaken the base-pinned trust boundary.
//
// Usage:
//   node scripts/build-policy-attestation.mjs           write the attestation
//   node scripts/build-policy-attestation.mjs --check    fail if the committed file is stale or tampered
//   node scripts/build-policy-attestation.mjs --show     print a human-readable summary
//   node scripts/build-policy-attestation.mjs --verify   verify the embedded signature, if any
//
// Signing is optional and off by default. When MODONOME_SIGNING_KEY (base64 PKCS8 DER, a CI
// secret injected like ANTHROPIC_API_KEY) is set at write time, an Ed25519 signature
// envelope is attached over the domain-separated canonical body. The body and its
// content_digest are identical whether or not the file is signed, so --check stays
// deterministic and only a real policy change moves the digest.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalize } from "./lib/canonical-json.mjs";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";
import { validate } from "./lib/jsonschema.mjs";
import { buildPolicyManifest, manifestDigest } from "./lib/policy-manifest.mjs";
import {
  signMessage,
  verifyMessage,
  publicKeyB64,
  publicKeyFromB64,
  privateKeyFromB64Pkcs8,
} from "./lib/ed25519.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const ARTIFACT = join(root, ".modonome", "policy-attestation.json");
const SCHEMA = join(root, "schemas", "policy-attestation.schema.json");

// Domain separation binds a signature to this artifact type so it cannot be replayed as a
// knowledge packet or any other signed structure.
export const ATTESTATION_DOMAIN = "modonome.policy-attestation.v1\n";

function rel(p) {
  return p.slice(root.length + 1);
}
function fail(msg) {
  console.error(`build-policy-attestation: ${msg}`);
  process.exit(1);
}

export function loadInputs(r = root) {
  const config = parseFlatYaml(readFileSync(join(r, ".modonome", "config.yaml"), "utf8"));
  const pkgJson = JSON.parse(readFileSync(join(r, "package.json"), "utf8"));
  return { root: r, config, pkgJson };
}

// The exact bytes a signature covers: the domain tag followed by the JCS of the manifest
// with its signature and content_digest removed (the content_digest is itself derived from
// that body, so signing the body binds the digest too).
export function attestationBytes(manifest) {
  const { signature, content_digest, ...body } = manifest;
  void signature;
  void content_digest;
  return ATTESTATION_DOMAIN + canonicalize(body);
}

function maybeSign(manifest, env) {
  const key = env.MODONOME_SIGNING_KEY;
  if (!key) return manifest;
  const priv = privateKeyFromB64Pkcs8(key);
  const sig_b64 = signMessage(attestationBytes(manifest), priv);
  return {
    ...manifest,
    signature: {
      alg: "ed25519",
      key_alias: env.MODONOME_SIGNING_KEY_ALIAS || "modonome-attestation",
      pubkey_b64: publicKeyB64(priv),
      sig_b64,
      // Deterministic override so tests and reproducible builds can pin the timestamp.
      signed_at: env.MODONOME_ATTESTATION_SIGNED_AT || new Date().toISOString(),
    },
  };
}

function schema() {
  return JSON.parse(readFileSync(SCHEMA, "utf8"));
}

function write(env) {
  const manifest = maybeSign(buildPolicyManifest(loadInputs()), env);
  const errs = validate(schema(), manifest);
  if (errs.length) {
    console.error("build-policy-attestation: generated manifest fails its own schema:");
    for (const e of errs) console.error("  - " + e);
    process.exit(1);
  }
  writeFileSync(ARTIFACT, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote ${rel(ARTIFACT)} (digest ${manifest.content_digest}, ${manifest.signature ? "signed" : "unsigned"}).`);
}

function check() {
  if (!existsSync(ARTIFACT)) {
    fail(`${rel(ARTIFACT)} is missing. Run: node scripts/build-policy-attestation.mjs`);
  }
  const committed = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  const { signature, content_digest: committedDigest, ...committedBody } = committed;
  void signature;
  // Self-consistency: the committed body must hash to its own recorded digest.
  const recomputed = manifestDigest(committedBody);
  if (recomputed !== committedDigest) {
    fail(`${rel(ARTIFACT)} is internally inconsistent: content_digest ${committedDigest} does not match its body (${recomputed}). The file was edited by hand.`);
  }
  // Freshness: the committed digest must match a manifest rebuilt from live policy.
  const fresh = buildPolicyManifest(loadInputs());
  if (committedDigest !== fresh.content_digest) {
    fail(`${rel(ARTIFACT)} is stale: committed digest ${committedDigest} but current policy hashes to ${fresh.content_digest}. Run: node scripts/build-policy-attestation.mjs`);
  }
  console.log(`PASS: ${rel(ARTIFACT)} is current (digest ${committedDigest}).`);
}

function show() {
  const m = existsSync(ARTIFACT) ? JSON.parse(readFileSync(ARTIFACT, "utf8")) : buildPolicyManifest(loadInputs());
  const caps = m.policy.capabilities.map((c) => `${c.name}=${c.default ? "on" : "off"}`).join(", ");
  console.log("Modonome policy attestation");
  console.log("===========================");
  console.log(`Digest:          ${m.content_digest}`);
  console.log(`Signed:          ${m.signature ? `yes (${m.signature.key_alias})` : "no (content-addressed)"}`);
  console.log(`Disclosure:      ${m.disclosure.model}`);
  console.log(`Posture:         autonomy ${m.posture.autonomy_enabled ? "enabled" : "disabled"}, dry_run ${m.posture.dry_run ? "on" : "off"}`);
  console.log(`Capabilities:    ${caps}`);
  console.log(`Branch denylist: ${m.policy.branch_denylist.join(", ")}`);
  console.log(`Gates (${m.policy.gates.length}):      ${m.policy.gates.join(", ")}`);
  console.log("");
  console.log(m.disclosure.statement);
}

function verifyCmd() {
  if (!existsSync(ARTIFACT)) fail(`${rel(ARTIFACT)} is missing.`);
  const m = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  const { signature, content_digest, ...body } = m;
  if (manifestDigest(body) !== content_digest) {
    fail("content_digest does not match the body; the attestation was edited by hand.");
  }
  if (!signature) {
    console.log(`${rel(ARTIFACT)} is content-addressed (digest ${content_digest}) and carries no signature. This is the default posture.`);
    return;
  }
  const ok = verifyMessage(attestationBytes(m), signature.sig_b64, publicKeyFromB64(signature.pubkey_b64));
  if (!ok) fail("signature does not verify against the embedded public key.");
  console.log(`PASS: signature verifies (alg ${signature.alg}, key ${signature.key_alias}, digest ${content_digest}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes("--check")) check();
  else if (argv.includes("--show")) show();
  else if (argv.includes("--verify")) verifyCmd();
  else write(process.env);
}
