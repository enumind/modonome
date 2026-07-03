import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "build-policy-attestation.mjs");
const artifact = join(root, ".modonome", "policy-attestation.json");
const VALID_FIXTURE = join(root, "fixtures", "policy-attestation", "valid", "clean.json");
const TAMPERED_FIXTURE = join(root, "fixtures", "policy-attestation", "invalid", "tampered-generator.json");

function run(args = [], env = {}) {
  return spawnSync("node", [script, ...args], { encoding: "utf8", cwd: root, env: { ...process.env, ...env } });
}

// Restore the committed (current, unsigned) artifact after any test that writes to it, so
// the suite leaves no drift behind.
function preservingArtifact(fn) {
  const orig = readFileSync(artifact);
  try {
    fn();
  } finally {
    writeFileSync(artifact, orig);
  }
}

test("the committed attestation passes --check", () => {
  const r = run(["--check"]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /PASS/);
});

test("--show prints the digest and the disclosure statement", () => {
  const r = run(["--show"]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Digest:\s+sha256:[0-9a-f]{64}/);
  assert.match(r.stdout, /architectural level/);
});

test("--verify reports the default content-addressed posture when unsigned", () => {
  const r = run(["--verify"]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /content-addressed/);
});

test("a fresh write is current under --check", () => {
  preservingArtifact(() => {
    assert.strictEqual(run([]).status, 0);
    assert.strictEqual(run(["--check"]).status, 0);
  });
});

test("--check fails a hand-edited (internally inconsistent) artifact", () => {
  preservingArtifact(() => {
    const m = JSON.parse(readFileSync(artifact, "utf8"));
    m.content_digest = "sha256:" + "0".repeat(64);
    writeFileSync(artifact, JSON.stringify(m, null, 2) + "\n");
    const r = run(["--check"]);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /inconsistent|stale/);
  });
});

test("signing round-trips: a signed artifact verifies and still passes --check", () => {
  preservingArtifact(() => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const key = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
    const w = run([], { MODONOME_SIGNING_KEY: key, MODONOME_ATTESTATION_SIGNED_AT: "2026-01-01T00:00:00.000Z" });
    assert.strictEqual(w.status, 0, w.stderr);
    assert.match(w.stdout, /signed/);
    assert.strictEqual(run(["--verify"]).status, 0);
    // Signing does not move the body digest, so freshness still holds.
    assert.strictEqual(run(["--check"]).status, 0);
  });
});

test("--verify fails when the signature is corrupted", () => {
  preservingArtifact(() => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const key = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
    run([], { MODONOME_SIGNING_KEY: key, MODONOME_ATTESTATION_SIGNED_AT: "2026-01-01T00:00:00.000Z" });
    const m = JSON.parse(readFileSync(artifact, "utf8"));
    m.signature.sig_b64 = Buffer.from("not the real signature").toString("base64");
    writeFileSync(artifact, JSON.stringify(m, null, 2) + "\n");
    const r = run(["--verify"]);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /signature does not verify/);
  });
});

// ---------------------------------------------------------------------------
// Phase 4: policy-pack adoption tooling (ADR-037). --show/--verify generalized to an
// optional foreign-file argument; --diff and --adopt are new. The fixtures are a
// self-consistent, generator-intact pack and the same pack with its generator credit
// altered without the digest recomputed, mirroring the exact "lazy/accidental credit
// strip" failure mode --check already guards for the local artifact.
// ---------------------------------------------------------------------------

test("--show <file> reads a foreign pack and prints its generator credit", () => {
  const r = run(["--show", VALID_FIXTURE]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Generator:\s+modonome \(https:\/\/modonome\.com\)/);
  assert.match(r.stdout, new RegExp(VALID_FIXTURE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("--verify <file> passes the clean fixture and fails the tampered one", () => {
  const ok = run(["--verify", VALID_FIXTURE]);
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /content-addressed/);
  const bad = run(["--verify", TAMPERED_FIXTURE]);
  assert.notStrictEqual(bad.status, 0);
  assert.match(bad.stderr, /content_digest does not match the body/);
});

test("--diff <file> compares a foreign pack's policy against this repo's live policy and always surfaces its generator", () => {
  const r = run(["--diff", VALID_FIXTURE]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Generator:\s+modonome/);
  assert.match(r.stdout, /Branch denylist:|Gates:|Capabilities/);
});

test("--diff fails cleanly on an unreadable path", () => {
  const r = run(["--diff", join(root, "fixtures", "policy-attestation", "does-not-exist.json")]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /could not read or parse/);
});

test("--adopt vendors a clean pack into MODONOME_ROOT's .modonome/policy-packs/<alias>.json", () => {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-adopt-"));
  try {
    const r = run(["--adopt", VALID_FIXTURE, "--alias", "peer-a"], { MODONOME_ROOT: tmp });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /Imported policy pack from modonome/);
    const vendored = JSON.parse(readFileSync(join(tmp, ".modonome", "policy-packs", "peer-a.json"), "utf8"));
    assert.strictEqual(vendored.generator.name, "modonome");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("--adopt refuses a pack whose generator was altered without recomputing the digest, and writes nothing", () => {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-adopt-"));
  try {
    const r = run(["--adopt", TAMPERED_FIXTURE, "--alias", "peer-evil"], { MODONOME_ROOT: tmp });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /internally inconsistent/);
    assert.throws(() => readFileSync(join(tmp, ".modonome", "policy-packs", "peer-evil.json")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("--adopt refuses a pack that fails schema validation (e.g. generator stripped outright)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-adopt-"));
  try {
    const pack = JSON.parse(readFileSync(VALID_FIXTURE, "utf8"));
    delete pack.generator;
    const noGenPath = join(tmp, "no-generator.json");
    writeFileSync(noGenPath, JSON.stringify(pack, null, 2) + "\n");
    const r = run(["--adopt", noGenPath, "--alias", "peer-b"], { MODONOME_ROOT: tmp });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /fails the policy-attestation schema/);
    assert.match(r.stderr, /generator/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("--adopt requires --alias and rejects a path-unsafe alias", () => {
  const noAlias = run(["--adopt", VALID_FIXTURE]);
  assert.notStrictEqual(noAlias.status, 0);
  assert.match(noAlias.stderr, /requires --alias/);
  const badAlias = run(["--adopt", VALID_FIXTURE, "--alias", "../../escape"]);
  assert.notStrictEqual(badAlias.status, 0);
  assert.match(badAlias.stderr, /filesystem-safe name/);
});
