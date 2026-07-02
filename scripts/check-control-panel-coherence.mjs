#!/usr/bin/env node
// Control-panel coherence budget. Turns "don't let this become a den of confusing
// controls" into numbers instead of vibes: a cap on visible controls per screen tab,
// no nested tab bars, and a hint on every value-entry control. Thresholds are set at
// today's cleaned-up baseline plus a working buffer (see lib/control-panel-audit.mjs),
// so this is a ratchet against regression, not an arbitrary ceiling.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { auditCoherence } from "./lib/control-panel-audit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const result = auditCoherence(root);
if (result.skipped) {
  console.log("Control-panel coherence: no apps/control-panel/src/screens found, skipping.");
  process.exit(0);
}

if (result.violations.length > 0) {
  console.error("Control-panel coherence violation(s):\n");
  for (const v of result.violations) console.error(`  [${v.kind}] ${v.detail}`);
  console.error(`\n${result.violations.length} violation(s). See scripts/lib/control-panel-audit.mjs for the budget.`);
  process.exit(1);
}
console.log("PASS: every screen is within the control-density budget and every lever has a hint.");
