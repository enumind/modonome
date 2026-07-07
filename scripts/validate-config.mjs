#!/usr/bin/env node
// Validate a Modonome config against the schema and the safety rules.
// Usage: node scripts/validate-config.mjs <path/to/config.yaml|.json>
//
// The actual logic lives in ./lib/config-validate.mjs, re-exported here unchanged, so
// this file's shebang never has to travel into a context that bundles it as a
// dependency (see that file's header comment for why that matters).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, safetyErrors, validateConfig } from "./lib/config-validate.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const overrides = loadMessageOverrides(join(here, "..", ".modonome"));

export { loadConfig, safetyErrors, validateConfig };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-config.mjs <config path>");
    process.exit(2);
  }
  const errors = validateConfig(loadConfig(path));
  if (errors.length > 0) {
    console.error(formatMessage("gate.config.invalid", { path }, overrides).message);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Config valid: ${path}`);
}
