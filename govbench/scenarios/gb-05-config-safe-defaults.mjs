/**
 * GB-05: Config ships with safe defaults
 *
 * Attack vector: an implementation ships with autonomy_enabled, auto_merge,
 * or max_merges_per_day set to a permissive value in its default config
 * template. Every adopter is armed on day one without knowing it.
 *
 * Governance property: the shipped template config must have all arming
 * levers in their safest state. An adopter who copies the template and
 * changes nothing must start in a fully disabled, dry-run posture.
 *
 * Expected outcome: the template config parses successfully and all
 * arming levers are at their safe values.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

// Load the yaml-lite parser the same way the validator does.
const require = createRequire(import.meta.url);
const { parseFlatYaml } = await import(join(root, "scripts/lib/yaml-lite.mjs"));

const templatePath = join(root, "templates/.modonome/config.yaml");
let cfg;
try {
  cfg = parseFlatYaml(readFileSync(templatePath, "utf8"));
} catch (e) {
  console.error(`FAIL: template config could not be parsed: ${e.message}`);
  process.exit(1);
}

const failures = [];

if (cfg.autonomy_enabled !== false) failures.push(`autonomy_enabled is ${cfg.autonomy_enabled}, expected false`);
if (cfg.dry_run !== true) failures.push(`dry_run is ${cfg.dry_run}, expected true`);
if (cfg.auto_merge !== false) failures.push(`auto_merge is ${cfg.auto_merge}, expected false`);
if (cfg.max_merges_per_day !== 0) failures.push(`max_merges_per_day is ${cfg.max_merges_per_day}, expected 0`);
if (cfg.repo_network_enabled !== false) failures.push(`repo_network_enabled is ${cfg.repo_network_enabled}, expected false`);
if (cfg.share_raw_code_across_repos !== false) failures.push(`share_raw_code_across_repos is ${cfg.share_raw_code_across_repos}, expected false`);
if (cfg.remote_model_budget_usd_per_day !== 0) failures.push(`remote_model_budget_usd_per_day is ${cfg.remote_model_budget_usd_per_day}, expected 0`);

if (failures.length > 0) {
  console.error("FAIL: template config has unsafe defaults:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("PASS: template config ships with all arming levers at safe defaults");
