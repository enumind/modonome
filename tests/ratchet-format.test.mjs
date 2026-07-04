// Tests for the machine-readable ratchet output (--json and --sarif). These lock in
// the stable MR### rule codes and the SARIF 2.1.0 shape that CI annotations, security
// dashboards, and the attestation predicate depend on. The human (default) output is
// covered by the AgentProof scenarios and must stay byte-identical, so it is not
// re-tested here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const ratchet = join(root, "scripts", "guard-ratchet.mjs");
const fixtures = join(root, "agentproof", "fixtures");

function runRatchet(...args) {
  return spawnSync("node", [ratchet, ...args], { encoding: "utf8" });
}

test("--json reports a fail verdict with an MR code on an attack diff", () => {
  const res = runRatchet("--diff", join(fixtures, "ratchet-skip-injection.patch"), "--json");
  assert.equal(res.status, 1, "attack diff must exit 1");
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.tool, "modonome-gate-integrity");
  assert.equal(parsed.result, "fail");
  assert.ok(parsed.findings.length > 0, "expected at least one finding");
  assert.match(parsed.findings[0].code, /^MR\d{3}$/, "finding carries a stable MR code");
  assert.equal(parsed.findings[0].code, "MR102", "skip injection maps to MR102");
  assert.ok(parsed.findings[0].file.length > 0, "finding carries a file location");
  assert.match(parsed.findings[0].helpUri, /modonome\.com\/codes\/MR102$/);
});

test("--json reports a pass verdict with no findings on a clean diff", () => {
  const res = runRatchet("--diff", join(fixtures, "ratchet-clean.patch"), "--json");
  assert.equal(res.status, 0, "clean diff must exit 0");
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.result, "pass");
  assert.equal(parsed.findings.length, 0);
});

test("--sarif emits valid SARIF 2.1.0 with a rule and a located result", () => {
  const res = runRatchet("--diff", join(fixtures, "ratchet-coverage-removal.patch"), "--sarif");
  assert.equal(res.status, 1);
  const sarif = JSON.parse(res.stdout);
  assert.equal(sarif.version, "2.1.0");
  const run = sarif.runs[0];
  assert.equal(run.tool.driver.name, "Modonome");
  assert.ok(run.tool.driver.rules.length > 0, "declares at least one rule");
  assert.match(run.tool.driver.rules[0].id, /^MR\d{3}$/);
  assert.ok(run.results.length > 0, "reports at least one result");
  assert.match(run.results[0].ruleId, /^MR\d{3}$/);
  assert.ok(run.results[0].partialFingerprints, "result carries a dedup fingerprint");
});

test("format flags compose with the diff mode in any order", () => {
  // --sarif before the mode must still resolve the diff correctly.
  const res = runRatchet("--sarif", "--diff", join(fixtures, "ratchet-skip-injection.patch"));
  assert.equal(res.status, 1);
  const sarif = JSON.parse(res.stdout);
  assert.equal(sarif.version, "2.1.0");
});
