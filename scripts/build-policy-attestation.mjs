#!/usr/bin/env node
// Generate .modonome/policy-attestation.json (ADR-036): a content-addressed manifest
// disclosing the governance policy this repo enforces and its AI-participation posture. It
// reads from the authoritative sources and never feeds back into the detectors, so
// publishing or verifying a policy pack cannot weaken the base-pinned trust boundary.
//
// Usage:
//   node scripts/build-policy-attestation.mjs             write the attestation
//   node scripts/build-policy-attestation.mjs --check      fail if the committed file is stale or tampered
//   node scripts/build-policy-attestation.mjs --show [file]    print a human-readable summary (default: the local committed file)
//   node scripts/build-policy-attestation.mjs --verify [file]  verify the embedded signature, if any (default: the local committed file)
//   node scripts/build-policy-attestation.mjs --diff <file>    compare a foreign pack's policy against this repo's live policy
//   node scripts/build-policy-attestation.mjs --adopt <file> --alias <name>   validate and vendor a foreign pack (ADR-037)
//
// Signing is optional and off by default. When MODONOME_SIGNING_KEY (base64 PKCS8 DER, a CI
// secret injected like ANTHROPIC_API_KEY) is set at write time, an Ed25519 signature
// envelope is attached over the domain-separated canonical body. The body and its
// content_digest are identical whether or not the file is signed, so --check stays
// deterministic and only a real policy change moves the digest.
//
// --diff and --adopt are the Phase 4 policy-pack adoption tooling (ADR-037). Since
// manifest_version 2, every manifest carries a required `generator` credit block, so
// --adopt's schema and digest checks refuse a pack whose credit was stripped or altered
// without also recomputing its digest. This is content-integrity and provenance
// preservation, not a cryptographic trust system: the generator claim is self-asserted, the
// same way a knowledge packet's classification is (ADR-018). For bilateral cryptographic
// trust between repos, use the separate knowledge-packet signing and peer-keys.json path.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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
// Scoped override for --adopt's write destination only (tests redirect vendored packs into
// a temp dir this way). Deliberately narrower than check-self-application.mjs's MODONOME_ROOT:
// SCHEMA/ARTIFACT/loadInputs() always resolve against the real installed package, since a
// bare temp dir has no schemas/ or package.json of its own.
const ADOPT_ROOT = process.env.MODONOME_ROOT || root;

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

// The generator credit line, tolerant of a foreign pack that predates manifest_version 2:
// such a pack is shown honestly as claiming no credit rather than crashing on a missing field.
function generatorLine(m) {
  if (!m.generator || !m.generator.name) return "Generator:       none claimed (pre-v2 pack)";
  return `Generator:       ${m.generator.name} (${m.generator.homepage})`;
}

function readPack(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function show(path) {
  const m = path ? readPack(path) : existsSync(ARTIFACT) ? readPack(ARTIFACT) : buildPolicyManifest(loadInputs());
  const caps = m.policy.capabilities.map((c) => `${c.name}=${c.default ? "on" : "off"}`).join(", ");
  console.log("Modonome policy attestation");
  console.log("===========================");
  console.log(`Source:          ${path || rel(ARTIFACT)}`);
  console.log(`Digest:          ${m.content_digest}`);
  console.log(generatorLine(m));
  console.log(`Signed:          ${m.signature ? `yes (${m.signature.key_alias})` : "no (content-addressed)"}`);
  console.log(`Disclosure:      ${m.disclosure.model}`);
  console.log(`Posture:         autonomy ${m.posture.autonomy_enabled ? "enabled" : "disabled"}, dry_run ${m.posture.dry_run ? "on" : "off"}`);
  console.log(`Capabilities:    ${caps}`);
  console.log(`Branch denylist: ${m.policy.branch_denylist.join(", ")}`);
  console.log(`Gates (${m.policy.gates.length}):      ${m.policy.gates.join(", ")}`);
  console.log("");
  console.log(m.disclosure.statement);
}

function verifyCmd(path) {
  const target = path || ARTIFACT;
  const label = path || rel(ARTIFACT);
  if (!existsSync(target)) fail(`${label} is missing.`);
  const m = readPack(target);
  const { signature, content_digest, ...body } = m;
  if (manifestDigest(body) !== content_digest) {
    fail(`content_digest does not match the body in ${label}; the attestation was edited by hand.`);
  }
  if (!signature) {
    console.log(`${label} is content-addressed (digest ${content_digest}) and carries no signature. This is the default posture.`);
    return;
  }
  const ok = verifyMessage(attestationBytes(m), signature.sig_b64, publicKeyFromB64(signature.pubkey_b64));
  if (!ok) fail(`signature does not verify against the embedded public key (${label}).`);
  console.log(`PASS: signature verifies (alg ${signature.alg}, key ${signature.key_alias}, digest ${content_digest}).`);
}

// Set-valued policy fields (denylist, protected paths, gates): report what the foreign pack
// adds and what it is missing relative to this repo's live policy.
function diffSet(label, local, foreign) {
  const l = new Set(local || []);
  const f = new Set(foreign || []);
  const added = [...f].filter((x) => !l.has(x)).sort();
  const removed = [...l].filter((x) => !f.has(x)).sort();
  if (!added.length && !removed.length) {
    console.log(`${label}: identical (${local.length})`);
    return;
  }
  console.log(`${label}:`);
  if (added.length) console.log(`  + ${added.join(", ")}`);
  if (removed.length) console.log(`  - ${removed.join(", ")}`);
}

function diffCapabilities(local, foreign) {
  const toMap = (arr) => new Map((arr || []).map((c) => [c.name, c.default]));
  const l = toMap(local);
  const f = toMap(foreign);
  const names = [...new Set([...l.keys(), ...f.keys()])].sort();
  const lines = names
    .filter((name) => l.get(name) !== f.get(name))
    .map((name) => `  ${name}: local=${l.has(name) ? (l.get(name) ? "on" : "off") : "absent"} foreign=${f.has(name) ? (f.get(name) ? "on" : "off") : "absent"}`);
  console.log(lines.length ? `Capabilities (differences):\n${lines.join("\n")}` : `Capabilities: identical (${names.length})`);
}

function diffPosture(local, foreign) {
  const f = foreign || {};
  const lines = ["autonomy_enabled", "dry_run"]
    .filter((key) => local[key] !== f[key])
    .map((key) => `  ${key}: local=${local[key]} foreign=${f[key]}`);
  console.log(lines.length ? `Posture (differences):\n${lines.join("\n")}` : "Posture: identical");
}

// Read-only comparison of a foreign pack's disclosed policy against this repo's own live
// policy. Always succeeds (never a pass/fail gate); a human uses this to decide whether to
// adopt. The foreign pack's generator credit is always surfaced, never only its content.
function diffCmd(path) {
  if (!path) fail("--diff requires a file path.");
  let foreign;
  try {
    foreign = readPack(path);
  } catch (e) {
    fail(`could not read or parse ${path}: ${e.message}`);
  }
  const local = buildPolicyManifest(loadInputs());
  console.log(`Comparing this repo's live policy to ${path}`);
  console.log("=".repeat(48));
  console.log(generatorLine(foreign));
  console.log("");
  diffSet("Branch denylist", local.policy.branch_denylist, foreign.policy && foreign.policy.branch_denylist);
  diffSet("Protected paths", local.policy.protected_paths_extra, foreign.policy && foreign.policy.protected_paths_extra);
  diffSet("Gates", local.policy.gates, foreign.policy && foreign.policy.gates);
  diffCapabilities(local.policy.capabilities, foreign.policy && foreign.policy.capabilities);
  diffPosture(local.posture, foreign.posture);
}

const ALIAS_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

// Vendor a foreign policy pack into this repo, refusing on any integrity or credit failure.
// Order matters: schema validation catches a pack whose generator block was stripped
// outright (manifest_version 2 requires it); digest self-consistency catches a pack whose
// body was edited without recomputing content_digest; signature verification catches a
// tampered signed pack. Only on all three passing does anything get written.
function adoptCmd(path, alias) {
  if (!path) fail("--adopt requires a file path.");
  if (!alias) fail("--adopt requires --alias <name>.");
  if (!ALIAS_RE.test(alias)) fail(`--alias "${alias}" must be a plain filesystem-safe name (letters, digits, dot, dash, underscore).`);
  let pack;
  try {
    pack = readPack(path);
  } catch (e) {
    fail(`could not read or parse ${path}: ${e.message}`);
  }
  const schemaErrs = validate(schema(), pack);
  if (schemaErrs.length) {
    console.error(`build-policy-attestation: ${path} fails the policy-attestation schema; refusing to adopt:`);
    for (const e of schemaErrs) console.error("  - " + e);
    process.exit(1);
  }
  const { signature, content_digest, ...body } = pack;
  const recomputed = manifestDigest(body);
  if (recomputed !== content_digest) {
    fail(`${path} is internally inconsistent: content_digest ${content_digest} does not match its body (${recomputed}). Refusing to adopt a pack that fails its own integrity check.`);
  }
  if (signature) {
    const ok = verifyMessage(attestationBytes(pack), signature.sig_b64, publicKeyFromB64(signature.pubkey_b64));
    if (!ok) fail(`${path} carries a signature that does not verify. Refusing to adopt.`);
  }
  const destDir = join(ADOPT_ROOT, ".modonome", "policy-packs");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${alias}.json`);
  writeFileSync(dest, JSON.stringify(pack, null, 2) + "\n");
  console.log(`Imported policy pack from ${pack.generator.name} (${pack.generator.homepage}).`);
  console.log(`Wrote ${dest.startsWith(root) ? rel(dest) : dest}.`);
  console.log("Note: the generator credit is a self-asserted claim by the pack's author, not independently verified identity.");
}

function flagValue(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes("--check")) check();
  else if (argv.includes("--diff")) diffCmd(flagValue(argv, "--diff"));
  else if (argv.includes("--adopt")) adoptCmd(flagValue(argv, "--adopt"), flagValue(argv, "--alias"));
  else if (argv.includes("--show")) show(flagValue(argv, "--show"));
  else if (argv.includes("--verify")) verifyCmd(flagValue(argv, "--verify"));
  else write(process.env);
}
