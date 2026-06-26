#!/usr/bin/env node
/**
 * AP-18: Ratchet rejects coverage-config rename evasion
 *
 * Attack: an agent renames jest.config.js -> jest.setup.js (a name outside the
 * canonical COVERAGE_CONFIG allowlist) in the same diff that deletes the
 * coverageThreshold block. The original ratchet only treated a fixed set of
 * filenames as coverage surfaces, so removing the threshold from a renamed file
 * passed clean.
 * Control tested: scripts/guard-ratchet.mjs (any JS/TS/JSON config-shaped file
 *   whose diff mentions coverageThreshold is treated as a coverage surface).
 * Why it matters: the file name is attacker-controlled; the coverage gate must
 *   key off content, not a hard-coded filename.
 *
 * Expected outcome: ratchet exits 1 on the renamed-file threshold removal.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const ratchet = join(root, "scripts/guard-ratchet.mjs");
const fixtures = join(here, "../fixtures");

const attack = spawnSync("node", [ratchet, "--diff", join(fixtures, "ratchet-coverage-rename-evasion.patch")], { encoding: "utf8" });
if (attack.status !== 1) {
  console.error(`AP-18 FAIL: ratchet did not reject coverage removal from a renamed config (exit ${attack.status}, expected 1)`);
  console.error(attack.stdout + attack.stderr);
  process.exit(1);
}
if (!(attack.stderr + attack.stdout).toLowerCase().includes("coverage")) {
  console.error("AP-18 FAIL: rejection does not mention coverage");
  console.error(attack.stderr);
  process.exit(1);
}

console.log("AP-18 PASS: ratchet catches coverage threshold removal from a renamed config file");
