/**
 * GB-03: Ratchet rejects broad type escape injection
 *
 * Attack: an agent silences TypeScript type errors by widening function
 * signatures to `any`, bypassing the type checker without fixing the
 * underlying unsafety. The build goes green; the type errors ship.
 *
 * Governance property: the ratchet detects added `: any` and `as any`
 * constructs in non-test TypeScript files and rejects the diff.
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

const attack = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-type-escape.patch")], { encoding: "utf8" });
if (attack.status === 0) {
  console.error("FAIL: ratchet did not reject type escape injection (exit 0, expected 1)");
  console.error(attack.stdout);
  process.exit(1);
}

console.log("PASS: ratchet correctly rejects broad type escape injection");
