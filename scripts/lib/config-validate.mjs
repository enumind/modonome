// Schema + safety validation for a parsed Modonome config object. Split out of
// scripts/validate-config.mjs (which stays the CLI entry point and re-exports these)
// so this logic can be imported from code that must never pull in a shebang line:
// esbuild chokes on a shebang when it bundles a dependency that isn't its own entry
// point, which is exactly what happens when apps/control-panel/vite.config.ts bundles
// its way down to this file through the panel's config writer.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { validate } from "./jsonschema.mjs";
import { parseFlatYaml } from "./yaml-lite.mjs";
import { formatMessage, loadMessageOverrides } from "./messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "..", "schemas", "config.schema.json"), "utf8"));
const overrides = loadMessageOverrides(join(here, "..", "..", ".modonome"));

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
// A role's primary model: an explicit `model`, else the head of its prioritized
// `models` fallback list. Mirrors primaryModel in scripts/agent/resolve-role.mjs so
// the validator and the resolver agree on what "the maker's model" means.
function primaryRoleModel(roleCfg) {
  if (!roleCfg) return undefined;
  if (roleCfg.model) return roleCfg.model;
  if (Array.isArray(roleCfg.models) && roleCfg.models.length > 0) return roleCfg.models[0];
  return undefined;
}

export function safetyErrors(cfg) {
  const errs = [];
  if (cfg.auto_merge === true) {
    if (!(cfg.max_merges_per_day > 0)) errs.push(formatMessage("gate.config.auto-merge-no-cap", {}, overrides).message);
    if (cfg.require_distinct_maker_checker !== true)
      errs.push(formatMessage("gate.config.auto-merge-no-distinct-maker-checker", {}, overrides).message);
    if (cfg.require_branch_protection !== true)
      errs.push(formatMessage("gate.config.auto-merge-no-branch-protection", {}, overrides).message);
  }
  if (cfg.autonomy_enabled === true && Array.isArray(cfg.trusted_author_allowlist) && cfg.trusted_author_allowlist.length === 0) {
    errs.push(formatMessage("gate.config.autonomy-empty-allowlist", {}, overrides).message);
  }
  if (cfg.repo_network_enabled === true && cfg.share_raw_code_across_repos === true) {
    errs.push(formatMessage("gate.config.repo-network-unsafe-sharing", {}, overrides).message);
  }
  // WS-H: enforce distinct models for maker and checker when the flag is on. The
  // primary model is an explicit `model`, else the head of the prioritized `models`
  // fallback list, so a role configured only with `models` is still checked.
  if (cfg.require_distinct_maker_checker_model !== false) {
    const makerModel = primaryRoleModel(cfg.roles?.maker);
    const checkerModel = primaryRoleModel(cfg.roles?.checker);
    if (makerModel && checkerModel && makerModel === checkerModel) {
      errs.push(formatMessage("gate.config.maker-checker-same-model", { model: makerModel }, overrides).message);
    }
  }
  return errs;
}

export function validateConfig(cfg) {
  return [...validate(schema, cfg), ...safetyErrors(cfg)];
}
