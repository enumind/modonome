#!/usr/bin/env node
// Version-aware config migration. Adds new levers with safe defaults and bumps
// schema_version while preserving every host override. A missing lever always
// migrates to the disabled, dry-run value, so an upgrade never arms an engine.
// Usage: node scripts/migrate-config.mjs <config.yaml|.json> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";

export const CURRENT_SCHEMA_VERSION = 1;

// Safe defaults for every lever. Migration fills any missing key from here.
export const SAFE_DEFAULTS = {
  schema_version: CURRENT_SCHEMA_VERSION,
  autonomy_enabled: false,
  dry_run: true,
  auto_merge: false,
  max_attempts_per_item: 3,
  max_open_prs: 3,
  max_diff_lines: 400,
  lease_minutes: 60,
  max_merges_per_day: 0,
  remote_model_budget_usd_per_day: 0,
  local_model_only_by_default: true,
  require_branch_protection: true,
  require_codeowner_review: true,
  require_distinct_maker_checker: true,
  require_distinct_maker_checker_model: true,
  trusted_author_allowlist: [],
  protected_paths_extra: [],
  state_dir: ".modonome",
  market_scan_enabled: false,
  owner_approval_required_for_new_claims: true,
  repo_network_enabled: false,
  repo_network_dry_run: true,
  share_raw_code_across_repos: false,
  share_repo_identifiers_by_default: false,
  remediation_apply_enabled: false,
  // Snapshot utility levers. Safe defaults: freshness check only warns, snapshots
  // are unsigned, and the dependency-free parser is used.
  snapshot: {
    ci_mode: "warn",
    sign: false,
    parser: "heuristic",
    token_budget: 120000,
    strict_redact: false,
  },
  // WS-H: runner and model assignment for cost-bearing agent roles.
  // Defaults preserve existing container/hosted-Claude posture.
  roles: {
    maker: { runner: "container", model: "claude-sonnet-4-6" },
    checker: { runner: "container", model: "claude-opus-4-8" },
    "self-govern": { runner: "container", model: "claude-haiku-4-5-20251001" },
  },
  runners: {
    local: { labels: ["self-hosted", "mac-mini"], cli_path: "claude" },
    container: { labels: ["ubuntu-latest"], cli_path: "claude" },
  },
  models: {
    "claude-sonnet-4-6": { provider: "anthropic" },
    "claude-opus-4-8": { provider: "anthropic" },
    "claude-haiku-4-5": { provider: "anthropic" },
    "local-default": { provider: "local", base_url: "http://mac-mini.local:11434" },
  },
  // Provider registry override/extension (WI-026). Empty by default: the built-in
  // registry in scripts/agent/providers.mjs covers anthropic/local/github-models/
  // openai-compatible without any config entry.
  providers: {},
};

export function migrate(cfg) {
  const out = { ...cfg };
  const added = [];
  for (const [key, value] of Object.entries(SAFE_DEFAULTS)) {
    if (!(key in out)) {
      out[key] = value;
      if (key !== "schema_version") added.push(key);
    }
  }
  out.schema_version = CURRENT_SCHEMA_VERSION;
  return { config: out, added };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  const write = process.argv.includes("--write");
  if (!path) {
    console.error("Usage: node scripts/migrate-config.mjs <config path> [--write]");
    process.exit(2);
  }
  const text = readFileSync(path, "utf8");
  const cfg = extname(path) === ".json" ? JSON.parse(text) : parseFlatYaml(text);
  const { config, added } = migrate(cfg);
  if (added.length === 0 && cfg.schema_version === CURRENT_SCHEMA_VERSION) {
    console.log(`Config already at schema_version ${CURRENT_SCHEMA_VERSION}.`);
    process.exit(0);
  }
  console.log(`Migrated to schema_version ${CURRENT_SCHEMA_VERSION}. Added levers (safe defaults): ${added.join(", ") || "none"}`);
  if (write && extname(path) === ".json") {
    writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
    console.log(`Wrote ${path}`);
  } else if (write) {
    console.log("Refusing to rewrite YAML in place to preserve comments. Apply the added levers by hand, or keep config as JSON.");
  }
}
