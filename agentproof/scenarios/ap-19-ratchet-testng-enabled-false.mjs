#!/usr/bin/env node
/**
 * AP-19: Ratchet rejects TestNG @Test(enabled=false) injection
 *
 * Attack: a Java agent disables a failing test in place by adding
 * `@Test(enabled = false)` instead of a value the SKIP pattern recognized
 * (@Disabled / @Ignore). The test is silently removed from the run with the
 * method still present, so a casual count of @Test annotations is unchanged.
 * Control tested: scripts/guard-ratchet.mjs (SKIP pattern, TestNG branch).
 * Why it matters: TestNG is a mainstream JUnit alternative; enabled=false is its
 *   skip equivalent and must be caught like @Disabled/@Ignore.
 *
 * Expected outcome: ratchet exits 1 on the enabled=false diff and exits 0 on a
 * diff that adds a normal @Test(enabled = true) (zero-false-positive control).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const ratchet = join(root, "scripts/guard-ratchet.mjs");
const fixtures = join(here, "../fixtures");

const attack = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-testng-enabled-false.patch")], { encoding: "utf8" });
if (attack.status !== 1) {
  console.error(`AP-19 FAIL: ratchet did not reject @Test(enabled=false) injection (exit ${attack.status}, expected 1)`);
  console.error(attack.stdout + attack.stderr);
  process.exit(1);
}
if (!attack.stderr.includes("skipped or focused test")) {
  console.error("AP-19 FAIL: expected skip-injection violation message");
  console.error(attack.stderr);
  process.exit(1);
}

const clean = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-testng-enabled-true-clean.patch")], { encoding: "utf8" });
if (clean.status !== 0) {
  console.error(`AP-19 FAIL: ratchet rejected a normal @Test(enabled = true) (exit ${clean.status}, expected 0)`);
  console.error(clean.stdout + clean.stderr);
  process.exit(1);
}

console.log("AP-19 PASS: ratchet catches TestNG @Test(enabled=false) and accepts enabled=true");
