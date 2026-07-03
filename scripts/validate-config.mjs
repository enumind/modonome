#!/usr/bin/env node
// Validate a Modonome config against the schema and the safety rules.
// Usage: node scripts/validate-config.mjs <path/to/config.yaml|.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { validate } from "./lib/jsonschema.mjs";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "schemas", "config.schema.json"), "utf8"));

export function loadConfig(path) {
  const text = readFileSync(path, "utf8");
  return extname(path) === ".json" ? JSON.parse(text) : parseFlatYaml(text);
}

// Safety rules beyond structural validation. These keep a config from claiming
// an armed posture without the controls that make arming safe.
//
// Note on arming levers: config values such as autonomy_enabled and auto_merge are
// advisory. They describe the posture an operator intends, but they cannot arm the
// engine on their own. The authoritative gate is the MODONOME_ARMED environment
// variable, enforced at runtime in bin/modonome.mjs (see ADR-004). A config file the
// agent can write therefore cannot self-arm; these rules only check that a claimed
// armed posture is internally consistent.
export function safetyErrors(cfg) {
  const errs = [];
  if (cfg.auto_merge === true) {
    if (!(cfg.max_merges_per_day > 0)) errs.push("auto_merge is on but max_merges_per_day is 0.");
    if (cfg.require_distinct_maker_checker !== true) errs.push("auto_merge is on but require_distinct_maker_checker is not true.");
    if (cfg.require_branch_protection !== true) errs.push("auto_merge is on but require_branch_protection is not true.");
  }
  if (cfg.autonomy_enabled === true && Array.isArray(cfg.trusted_author_allowlist) && cfg.trusted_author_allowlist.length === 0) {
    errs.push("autonomy_enabled is on but trusted_author_allowlist is empty, which means no autonomous action.");
  }
  if (cfg.repo_network_enabled === true && cfg.share_raw_code_across_repos === true) {
    errs.push("repo_network_enabled with share_raw_code_across_repos is unsafe by default.");
  }
  // WS-H: enforce distinct models for maker and checker when the flag is on.
  if (cfg.require_distinct_maker_checker_model !== false) {
    const makerModel = cfg.roles?.maker?.model;
    const checkerModel = cfg.roles?.checker?.model;
    if (makerModel && checkerModel && makerModel === checkerModel) {
      errs.push(
        `require_distinct_maker_checker_model is on but roles.maker.model and roles.checker.model are both "${makerModel}".`
      );
    }
  }
  return errs;
}

export function validateConfig(cfg) {
  return [...validate(schema, cfg), ...safetyErrors(cfg)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-config.mjs <config path>");
    process.exit(2);
  }
  const errors = validateConfig(loadConfig(path));
  if (errors.length > 0) {
    console.error(`Config invalid: ${path}`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Config valid: ${path}`);
}
