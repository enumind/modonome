// Tests for the AgentProof conformance attestation (ADR-042). The Statement shape and
// predicate type are a public contract that CI signing (actions/attest) and downstream
// verifiers depend on, so they are pinned here. AgentProof's own score depends on the
// working tree passing its own scenarios, so the test asserts structure and the subject
// binding, not a specific score: generation always succeeds regardless of score.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const script = join(root, "scripts", "agentproof-attestation.mjs");

function headSha() {
  return spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", cwd: root }).stdout.trim();
}

test("emits a valid in-toto Statement bound to HEAD", () => {
  const res = spawnSync("node", [script], { encoding: "utf8", cwd: root, timeout: 120000 });
  assert.equal(res.status, 0, "attestation generation always exits 0");
  const stmt = JSON.parse(res.stdout);
  assert.equal(stmt._type, "https://in-toto.io/Statement/v1");
  assert.equal(stmt.predicateType, "https://modonome.com/attestation/agentproof-conformance/v1");
  assert.equal(stmt.subject[0].digest.gitCommit, headSha(), "subject is the HEAD commit");
  assert.equal(stmt.predicate.tool, "modonome-agentproof");
  assert.ok(stmt.predicate.headCommit, "records the head commit");
  assert.match(stmt.predicate.score, /^\d+\/\d+$/, "predicate carries a normative score");
  assert.match(stmt.predicate.level, /^(HARDENED|PARTIAL|UNHARDENED|UNKNOWN)$/, "predicate carries a derived level");
  assert.ok(Array.isArray(stmt.predicate.categories), "categories is an array");
  assert.ok(stmt.predicate.categories.length > 0, "at least one scenario category recorded");
  for (const cat of stmt.predicate.categories) {
    assert.ok(cat.id, "category entry has an id");
    assert.equal(typeof cat.passed, "boolean", "category entry carries a pass/fail boolean");
  }
});

test("--out writes the attestation to a file", () => {
  const dir = mkdtempSync(join(tmpdir(), "modonome-agentproof-attestation-"));
  try {
    const out = join(dir, "agentproof-conformance.intoto.json");
    const res = spawnSync("node", [script, "--out", out], { encoding: "utf8", cwd: root, timeout: 120000 });
    assert.equal(res.status, 0);
    assert.ok(existsSync(out), "attestation file written");
    const stmt = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(stmt.predicateType, "https://modonome.com/attestation/agentproof-conformance/v1");
    assert.ok(stmt.predicate.categories.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
