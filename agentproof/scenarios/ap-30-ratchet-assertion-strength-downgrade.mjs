#!/usr/bin/env node
/**
 * AP-20: Ratchet rejects assertion-strength downgrade
 *
 * Attack: an agent replaces value-comparing assertions (`expect(x).toBe(y)`,
 * `.toEqual(...)`, `assertEquals(...)`) with vacuous-existence checks
 * (`.toBeDefined()`, `assertNotNull(...)`). The assertion COUNT is unchanged, so
 * the count-only removal check (AP-01) sees nothing, but the test no longer
 * proves any concrete result -- an existence check passes for almost any value.
 * Control tested: scripts/guard-ratchet.mjs (strong-vs-weak assertion balance).
 * Why it matters: counting assertions is insufficient; the ratchet must track
 *   assertion STRENGTH as well as quantity.
 *
 * Expected outcome: ratchet exits 1 when strong assertions are swapped for
 * existence checks, and exits 0 when an existence check is added ALONGSIDE a new
 * strong assertion (zero-false-positive control direction).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const ratchet = join(root, "scripts/guard-ratchet.mjs");
const fixtures = join(here, "../fixtures");

const attack = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-assertion-strength-downgrade.patch")], { encoding: "utf8" });
if (attack.status !== 1) {
  console.error(`AP-20 FAIL: ratchet did not reject assertion-strength downgrade (exit ${attack.status}, expected 1)`);
  console.error(attack.stdout + attack.stderr);
  process.exit(1);
}
if (!attack.stderr.toLowerCase().includes("strength")) {
  console.error("AP-20 FAIL: rejection does not mention assertion strength");
  console.error(attack.stderr);
  process.exit(1);
}

const clean = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-existence-check-clean.patch")], { encoding: "utf8" });
if (clean.status !== 0) {
  console.error(`AP-20 FAIL: ratchet rejected an existence check added with a new strong assertion (exit ${clean.status}, expected 0)`);
  console.error(clean.stdout + clean.stderr);
  process.exit(1);
}

console.log("AP-20 PASS: ratchet catches strong->existence downgrades and accepts additive existence checks");
