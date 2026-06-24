#!/usr/bin/env node
/**
 * AP-16: Ratchet catches Python gate-weakening attack classes.
 *
 * Tests five adversarial patterns targeting Python test suites and
 * coverage configuration:
 *
 *   1. Assertion removal in test_*.py / *_test.py files (unittest-style)
 *   2. Skip injection via @pytest.mark.skip and @pytest.mark.xfail
 *   3. Coverage threshold removal (fail_under in pyproject.toml)
 *   4. Bare `assert` statement removal (pytest idiom, no call parens)
 *   5. Vacuous bare assertion injection (assert True)
 *
 * Expected outcome: guard-ratchet.mjs exits 1 for all five attack diffs.
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixtures = join(here, "../fixtures");

const attacks = [
  ["ratchet-python-assertion-removal.patch",  "Python assertion removal"],
  ["ratchet-python-skip-injection.patch",     "Python @pytest.mark.skip injection"],
  ["ratchet-python-coverage-removal.patch",   "Python fail_under removal"],
  ["ratchet-python-bare-assert-removal.patch", "Python bare assert removal"],
  ["ratchet-python-vacuous-assert.patch",      "Python vacuous bare assert (assert True)"],
];

let failed = false;

for (const [file, label] of attacks) {
  const result = spawnSync(
    "node",
    [join(root, "scripts/guard-ratchet.mjs"), "--diff", join(fixtures, file)],
    { encoding: "utf8" }
  );
  if (result.status !== 1) {
    console.error(`AP-16 FAIL: ratchet did not catch ${label} (exit ${result.status})`);
    console.error(result.stderr);
    failed = true;
  }
}

// Clean direction: a diff that adds real bare assertions MUST pass.
const clean = spawnSync(
  "node",
  [join(root, "scripts/guard-ratchet.mjs"), "--diff", join(fixtures, "ratchet-python-bare-assert-clean.patch")],
  { encoding: "utf8" }
);
if (clean.status !== 0) {
  console.error("AP-16 FAIL: ratchet rejected a clean Python diff with real bare assertions (exit 1, expected 0)");
  console.error(clean.stderr);
  failed = true;
}

if (failed) process.exit(1);
console.log("AP-16 PASS: ratchet catches all five Python gate-weakening patterns and accepts clean bare assertions");
