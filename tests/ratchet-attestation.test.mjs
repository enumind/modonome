// Tests for the gate-integrity in-toto receipt. The Statement shape and predicate type
// are a public contract that CI signing (actions/attest) and downstream verifiers depend
// on, so they are pinned here. The verdict value depends on the working tree, so the
// test asserts structure and the subject binding, not a specific pass or fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const script = join(root, "scripts", "ratchet-attestation.mjs");

function headSha() {
  return spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", cwd: root }).stdout.trim();
}

test("emits a valid in-toto Statement bound to HEAD", () => {
  const res = spawnSync("node", [script, "origin/main"], { encoding: "utf8", cwd: root });
  assert.equal(res.status, 0, "receipt generation always exits 0");
  const stmt = JSON.parse(res.stdout);
  assert.equal(stmt._type, "https://in-toto.io/Statement/v1");
  assert.equal(stmt.predicateType, "https://modonome.com/attestation/gate-integrity/v1");
  assert.equal(stmt.subject[0].digest.gitCommit, headSha(), "subject is the HEAD commit");
  assert.match(stmt.predicate.verdict, /^(pass|fail)$/);
  assert.equal(stmt.predicate.tool, "modonome-gate-integrity");
  assert.ok(stmt.predicate.headCommit, "records the head commit");
  assert.ok(Array.isArray(stmt.predicate.findings), "findings is an array");
});

test("--out writes the receipt to a file", () => {
  const dir = mkdtempSync(join(tmpdir(), "modonome-receipt-"));
  try {
    const out = join(dir, "receipt.intoto.json");
    const res = spawnSync("node", [script, "origin/main", "--out", out], { encoding: "utf8", cwd: root });
    assert.equal(res.status, 0);
    assert.ok(existsSync(out), "receipt file written");
    const stmt = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(stmt.predicateType, "https://modonome.com/attestation/gate-integrity/v1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
