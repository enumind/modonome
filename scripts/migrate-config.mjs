#!/usr/bin/env node
// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
// Version-aware config migration. Adds new levers with safe defaults and bumps
// schema_version while preserving every host override. A missing lever always
// migrates to the disabled, dry-run value, so an upgrade never arms an engine.
// Usage: node scripts/migrate-config.mjs <config.yaml|.json> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
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

if (import.meta.url === `file://${process.argv[1]}`) {
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
