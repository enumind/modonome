#!/usr/bin/env node
// Validate every work item in .modonome/work-items against the schema and the
// separation-of-duties governance rules (ADR-006). Runs in CI so a malformed item,
// an invalid state, or a maker who is also the checker cannot land. No external call.
//
// Usage: node scripts/check-work-items.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateWorkItem } from "./validate-work-item.mjs";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const configPath = join(root, ".modonome", "config.yaml");
const config = existsSync(configPath) ? parseFlatYaml(readFileSync(configPath, "utf8")) : {};

const dir = join(root, ".modonome", "work-items");
const problems = [];

const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
for (const f of files) {
  let item;
  try {
    item = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch (e) {
    problems.push(`${f}: not valid JSON (${e.message}).`);
    continue;
  }
  for (const e of validateWorkItem(item, config)) problems.push(`${f}: ${e}`);
}

console.log("Work item validation (ADR-006)");
console.log("==============================");
if (problems.length === 0) {
  console.log(`PASS: ${files.length} work item(s) valid; maker and checker stay distinct.`);
  process.exit(0);
}
console.error(`FAIL: ${problems.length} work item problem(s):\n`);
for (const p of problems) console.error("  - " + p);
process.exit(1);
