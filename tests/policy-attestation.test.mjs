import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "build-policy-attestation.mjs");
const artifact = join(root, ".modonome", "policy-attestation.json");

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
