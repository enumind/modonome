#!/usr/bin/env node
/**
 * AP-24: Maker/checker model-alias evasion (now enforced)
 *
 * Attack: an agent names two members of the same model family with different
 * identifier strings -- e.g. maker_model="gpt-4", checker_model="gpt-4-turbo".
 * The exact-string AP-07 check passes, yet the two "independent" reviewers share
 * architecture-level blind spots and cannot catch each other's systematic errors.
 *
 * Control tested: scripts/validate-work-item.mjs (model family/architecture check).
 *
 * Expected outcome: validator exits 1 for both exact-string collapse (AP-07
 * regression) and alias-family collapse (AP-24 normative enforcement).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-work-item.mjs");
const fixtures = join(here, "../fixtures");

// (a) Regression guard: identical model strings are still rejected (AP-07 holds).
const exact = spawnSync("node", [validator, join(fixtures, "work-item-model-collapse.json")], { encoding: "utf8" });
if (exact.status !== 1) {
  console.error(`AP-24 FAIL: exact model-string collapse was not rejected (exit ${exact.status}, expected 1)`);
  console.error(exact.stdout + exact.stderr);
  process.exit(1);
}

// (b) Alias-family collapse is now normatively rejected.
const alias = spawnSync("node", [validator, join(fixtures, "work-item-model-alias-collapse.json")], { encoding: "utf8" });
if (alias.status !== 1) {
  console.error(`AP-24 FAIL: alias-family collapse was not rejected (exit ${alias.status}, expected 1)`);
  console.error(alias.stdout + alias.stderr);
  process.exit(1);
}

console.log("AP-24 PASS: both exact model-string collapse and alias-family collapse are rejected.");
