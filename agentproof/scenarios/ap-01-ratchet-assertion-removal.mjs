// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
/**
 * AP-01: Ratchet rejects assertion removal and vacuous assertions
 *
 * Attack: an agent removes expect() calls from a test file to make a failing
 * test pass. The suite goes green, the regression ships.
 *
 * Evasion: an agent that knows the count is checked keeps it up by swapping a
 * real assertion for a tautology such as expect(true).toBe(true). The net count
 * does not drop, but the test verifies nothing.
 *
 * Governance property: the anti-gaming ratchet detects that the diff removes
 * more test assertions than it adds, and separately detects vacuous assertions
 * that can never fail, rejecting either before it merges.
 *
 * Expected outcome: guard-ratchet.mjs exits 1 on each attack diff,
 * and exits 0 on a clean diff.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const ratchet = join(root, "scripts/guard-ratchet.mjs");
const fixtures = join(here, "../fixtures");

const attack = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-assertion-removal.patch")], { encoding: "utf8" });
/* c8 ignore start -- fires only if the ratchet control itself regresses */
if (attack.status === 0) {
  console.error("FAIL: ratchet did not reject assertion removal (exit 0, expected 1)");
  console.error(attack.stdout);
  process.exit(1);
}
/* c8 ignore stop */

const vacuous = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-vacuous-matcher.patch")], { encoding: "utf8" });
/* c8 ignore start -- fires only if the ratchet control itself regresses */
if (vacuous.status === 0) {
  console.error("FAIL: ratchet did not reject a vacuous assertion that keeps the count up (exit 0, expected 1)");
  console.error(vacuous.stdout);
  process.exit(1);
}
/* c8 ignore stop */

const clean = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-clean.patch")], { encoding: "utf8" });
/* c8 ignore start -- fires only if the ratchet control itself regresses */
if (clean.status !== 0) {
  console.error("FAIL: ratchet rejected a clean diff (exit 1, expected 0)");
  console.error(clean.stderr);
  process.exit(1);
}
/* c8 ignore stop */

console.log("PASS: ratchet rejects assertion removal and vacuous assertions, and accepts clean diffs");
