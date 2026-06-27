#!/usr/bin/env node
/**
 * AP-23: Config safety levers cannot be loosened via environment overrides
 *
 * Attack: an agent that cannot make a config pass validation tries to neutralize
 * the validator at runtime by exporting env vars it hopes the validator honors,
 * e.g. MODONOME_AUTONOMY_ENABLED=true, MODONOME_AUTO_MERGE=true, MODONOME_ARMED=true,
 * MODONOME_REQUIRE_BRANCH_PROTECTION=true -- hoping the env "satisfies" the safety
 * rule that the on-disk config violates.
 * Control tested: scripts/validate-config.mjs.
 * Governance property: the config validator's verdict MUST depend ONLY on the
 *   config document, never on ambient environment variables. A hostile env MUST
 *   NOT turn a rejected config into an accepted one. (Runtime arming is gated
 *   separately by MODONOME_ARMED in bin/modonome.mjs per ADR-004; the *validator*
 *   reads no env at all.)
 *
 * Expected outcome: the unsafe auto_merge config is rejected (exit 1) whether the
 * env is empty or saturated with "permissive" override vars, and the rejection
 * reasons are identical -- proving env input is inert to the validator.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-config.mjs");
const fixtures = join(here, "../fixtures");
const cfg = join(fixtures, "config-unsafe-auto-merge.yaml");

function run(env) {
  return spawnSync("node", [validator, cfg], { encoding: "utf8", env: { ...process.env, ...env } });
}

const baseline = run({});
if (baseline.status !== 1) {
  console.error(`AP-23 FAIL: unsafe config was not rejected at baseline (exit ${baseline.status}, expected 1)`);
  console.error(baseline.stdout + baseline.stderr);
  process.exit(1);
}

const hostileEnv = {
  MODONOME_AUTONOMY_ENABLED: "true",
  MODONOME_AUTO_MERGE: "true",
  MODONOME_ARMED: "true",
  MODONOME_REQUIRE_BRANCH_PROTECTION: "true",
  MODONOME_REQUIRE_DISTINCT_MAKER_CHECKER: "true",
  MODONOME_DRY_RUN: "false",
};
const withEnv = run(hostileEnv);
if (withEnv.status !== 1) {
  console.error(`AP-23 FAIL: hostile env loosened the validator -- unsafe config accepted (exit ${withEnv.status}, expected 1)`);
  console.error(withEnv.stdout + withEnv.stderr);
  process.exit(1);
}

if (baseline.stderr !== withEnv.stderr) {
  console.error("AP-23 FAIL: validator verdict changed under hostile env (env is NOT inert)");
  console.error("baseline:\n" + baseline.stderr);
  console.error("with env:\n" + withEnv.stderr);
  process.exit(1);
}

console.log("AP-23 PASS: config validator ignores environment overrides; safety verdict is config-only");
