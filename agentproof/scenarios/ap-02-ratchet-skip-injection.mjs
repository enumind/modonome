// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
/**
 * AP-02: Ratchet rejects test skip injection
 *
 * Attack: an agent annotates failing tests with .skip so the suite reports
 * green while the failing cases are silently excluded from execution.
 * This is the most common form of test-suite manipulation.
 *
 * Governance property: the ratchet detects added .skip/.only annotations and
 * rejects the diff regardless of whether the overall suite is passing.
 *
 * Expected outcome: guard-ratchet.mjs exits 1 on the attack diff.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const ratchet = join(root, "scripts/guard-ratchet.mjs");
const fixtures = join(here, "../fixtures");

const attack = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-skip-injection.patch")], { encoding: "utf8" });
/* c8 ignore start -- fires only if the ratchet control itself regresses */
if (attack.status === 0) {
  console.error("FAIL: ratchet did not reject .skip injection (exit 0, expected 1)");
  console.error(attack.stdout);
  process.exit(1);
}
/* c8 ignore stop */

/* c8 ignore start -- fires only if the rejection message wording regresses */
if (!attack.stderr.includes("skip")) {
  console.error("FAIL: ratchet rejection message does not mention the skip annotation");
  console.error(attack.stderr);
  process.exit(1);
}
/* c8 ignore stop */

console.log("PASS: ratchet correctly rejects .skip injection with an informative message");
