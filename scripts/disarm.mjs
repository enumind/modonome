#!/usr/bin/env node
// One-command kill switch: writes autonomy_enabled: false to config.yaml.
// Always safe, no preconditions. Reminds the operator to also remove the
// CI-scope MODONOME_ARMED secret, which this command cannot reach by design
// (see bin/modonome.mjs resolveArming: both keys must be unset to disarm).
// Usage: node scripts/disarm.mjs [dir]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFlatYaml, patchTopLevelYaml } from "./lib/yaml-lite.mjs";

const target = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : ".";
const configPath = join(target, ".modonome", "config.yaml");

if (!existsSync(configPath)) {
  console.error(`No config found at ${configPath}. There is nothing to disarm.`);
  process.exit(1);
}

const rawText = readFileSync(configPath, "utf8");
let config;
try {
  config = parseFlatYaml(rawText);
} catch (e) {
  console.error(`Config at ${configPath} does not parse: ${e.message}`);
  process.exit(1);
}

const wasArmed = config.autonomy_enabled === true;
const patched = patchTopLevelYaml(rawText, { autonomy_enabled: false });
if (patched !== rawText) writeFileSync(configPath, patched);

console.log(
  wasArmed
    ? `autonomy_enabled: false written to ${configPath}.`
    : `${configPath} already has autonomy_enabled: false.`
);
console.log("");
console.log("Also remove the CI-scope secret so the environment key drops too, for example:");
console.log("");
console.log("  gh secret delete MODONOME_ARMED");
