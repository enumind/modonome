#!/usr/bin/env node
// Drift guard. Proves the prompt, the schema, the template, and the migration
// defaults describe the same set of config levers, and that the prompt bundle is
// up to date. One source of truth, checked by machine.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";
import { SAFE_DEFAULTS } from "./migrate-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const problems = [];

function coreLevers() {
  const text = readFileSync(join(root, "prompts", "modonome.core.md"), "utf8");
  const start = text.indexOf("## Configuration");
  const fenceStart = text.indexOf("```yaml", start);
  const fenceEnd = text.indexOf("```", fenceStart + 7);
  const block = text.slice(fenceStart + 7, fenceEnd);
  return new Set(Object.keys(parseFlatYaml(block)));
}

function schemaLevers() {
  const schema = JSON.parse(readFileSync(join(root, "schemas", "config.schema.json"), "utf8"));
  return new Set(Object.keys(schema.properties));
}

function templateLevers() {
  const text = readFileSync(join(root, "templates", ".modonome", "config.yaml"), "utf8");
  return new Set(Object.keys(parseFlatYaml(text)));
}

const sets = {
  "prompt core": coreLevers(),
  "config schema": schemaLevers(),
  "template config": templateLevers(),
  "migration defaults": new Set(Object.keys(SAFE_DEFAULTS)),
};

const reference = sets["config schema"];
for (const [name, set] of Object.entries(sets)) {
  if (name === "config schema") continue;
  const missing = [...reference].filter((k) => !set.has(k));
  const extra = [...set].filter((k) => !reference.has(k));
  if (missing.length) problems.push(`${name} is missing levers: ${missing.join(", ")}`);
  if (extra.length) problems.push(`${name} has unexpected levers: ${extra.join(", ")}`);
}

try {
  execSync("node scripts/build-prompt.mjs --check", { cwd: root, stdio: "pipe" });
} catch (e) {
  problems.push("prompt bundle is out of date. Run: node scripts/build-prompt.mjs --write");
}

if (problems.length > 0) {
  console.error("Drift guard found problems:\n");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("Drift guard: prompt, schema, template, and migration agree, and the bundle is current.");
