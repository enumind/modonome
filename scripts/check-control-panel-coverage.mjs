#!/usr/bin/env node
// Control-panel coverage gate. Every lever in schemas/config.schema.json must resolve
// to either a real reference in a control-panel screen or a documented, explicit reason
// in apps/control-panel/exposure.json for staying unexposed. Mirrors check-drift.mjs:
// one source of truth (the schema), checked by machine, so a new lever can never land
// silently unaddressed the way `runners` did before this gate existed.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { auditCoverage } from "./lib/control-panel-audit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const result = auditCoverage(root);
if (result.skipped) {
  console.log("Control-panel coverage: no apps/control-panel/src/screens found, skipping.");
  process.exit(0);
}

console.log(`Control-panel coverage: ${result.fieldCount} config lever(s), ${result.exposureCount} documented exemption(s).`);
if (result.missing.length > 0) {
  console.error("\nThe following config.schema.json field(s) have no reference in any control-panel");
  console.error("screen and no entry in apps/control-panel/exposure.json explaining why:\n");
  for (const field of result.missing) console.error(`  - ${field}`);
  console.error("\nEither wire it into a screen, or add it to exposure.json with a real reason.");
  process.exit(1);
}
console.log("PASS: every config lever is either exposed or documented as intentionally not.");
