#!/usr/bin/env node
/**
 * AP-22: Maker/checker models are architecturally distinct, specifically version-different
 *
 * Attack: Bypass the existing string-inequality check (maker_model !== checker_model)
 * by using different versions of the same model family (sonnet-4-6 maker, sonnet-4-5
 * checker). String inequality passes, but family collapse fails : same architecture
 * cannot catch its own systematic errors.
 *
 * Governance property: maker_model and checker_model MUST resolve to distinct
 * MODEL FAMILIES (architectural distinctness), specifically distinct version strings.
 * Same-family pairs are rejected; distinct-family pairs are accepted.
 *
 * Expected outcome: validate-work-item.mjs rejects same-family fixture and names
 * family/architecture; accepts distinct-family fixture; and AP-07 model-collapse
 * fixture still exits 1 (regression).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-work-item.mjs");
const fixtures = join(here, "../fixtures");

const sameFamily = spawnSync("node", [validator, join(fixtures, "work-item-same-family-models.json")], { encoding: "utf8" });
if (sameFamily.status === 0) {
  console.error("FAIL: validator accepted same-family models (exit 0, expected 1)");
  process.exit(1);
}
if (!(sameFamily.stderr + sameFamily.stdout).toLowerCase().includes("family")) {
  console.error("FAIL: rejection does not mention family/architecture");
  process.exit(1);
}

const distinctFamily = spawnSync("node", [validator, join(fixtures, "work-item-distinct-family-models.json")], { encoding: "utf8" });
if (distinctFamily.status !== 0) {
  console.error("FAIL: validator rejected distinct-family models (exit 1, expected 0)");
  console.error(distinctFamily.stderr);
  process.exit(1);
}

// Regression: AP-07 model-collapse (same exact model string) must still exit 1.
// Adding family-distinctness must not accidentally weaken the original string-equality check.
const modelCollapse = spawnSync("node", [validator, join(fixtures, "work-item-model-collapse.json")], { encoding: "utf8" });
if (modelCollapse.status === 0) {
  console.error("FAIL (regression AP-07): validator accepted same-model collapse (exit 0, expected 1)");
  process.exit(1);
}

console.log("PASS: maker/checker models must be architecturally distinct, specifically version-different");
