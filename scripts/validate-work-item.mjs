#!/usr/bin/env node
// Validate a Modonome work item against the schema and governance safety rules.
// Usage: node scripts/validate-work-item.mjs <path/to/item.json>
//
// The actual logic lives in ./lib/work-item-validate.mjs, re-exported here
// unchanged, so this file's shebang never has to travel into a context that
// bundles it as a dependency (see that file's header comment for why that matters).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { modelFamily, governanceErrors, validateWorkItem } from "./lib/work-item-validate.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const overrides = loadMessageOverrides(join(here, "..", ".modonome"));

export { modelFamily, governanceErrors, validateWorkItem };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-work-item.mjs <item.json>");
    process.exit(2);
  }
  const errors = validateWorkItem(JSON.parse(readFileSync(path, "utf8")));
  if (errors.length > 0) {
    console.error(formatMessage("gate.work-item.invalid", { path }, overrides).message);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Work item valid: ${path}`);
}
