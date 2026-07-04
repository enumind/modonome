/**
 * Compares two ModonomeConfig snapshots and returns only the changed, panel-editable
 * keys, in the shape the live writer expects (server/modonomeWriter.mjs allows exactly
 * this key set as a config.yaml patch). Keeping the key list here in sync with the
 * server's whitelist is deliberate: it lets the UI disable Save with zero changes
 * instead of sending a patch the server would reject.
 */
import type { ModonomeConfig } from "./types";

const SCALAR_KEYS = [
  "autonomy_enabled",
  "dry_run",
  "auto_merge",
  "max_attempts_per_item",
  "max_open_prs",
  "max_diff_lines",
  "lease_minutes",
  "max_merges_per_day",
  "remote_model_budget_usd_per_day",
  "local_model_only_by_default",
  "require_branch_protection",
  "require_codeowner_review",
  "require_distinct_maker_checker",
  "require_distinct_maker_checker_model",
  "market_scan_enabled",
  "owner_approval_required_for_new_claims",
  "repo_network_enabled",
  "repo_network_dry_run",
  "share_raw_code_across_repos",
  "share_repo_identifiers_by_default",
  "remediation_apply_enabled",
] as const satisfies readonly (keyof ModonomeConfig)[];

const ARRAY_KEYS = ["trusted_author_allowlist", "protected_paths_extra"] as const satisfies readonly (keyof ModonomeConfig)[];

// The four open/semi-open maps (roles, models, runners, providers). A change to any
// entry sends the whole new map as the patch value, matching how the nested block
// writer (server/modonomeWriter.mjs) reconciles it against the file on disk entry by
// entry rather than expecting a delta.
const NESTED_KEYS = ["roles", "models", "runners", "providers"] as const satisfies readonly (keyof ModonomeConfig)[];

function nestedMapChanged(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  const ak = Object.keys(a ?? {});
  const bk = Object.keys(b ?? {});
  if (ak.length !== bk.length) return true;
  return bk.some((k) => JSON.stringify((a ?? {})[k]) !== JSON.stringify((b ?? {})[k]));
}

export function diffConfig(base: ModonomeConfig, edited: ModonomeConfig): Partial<ModonomeConfig> {
  const patch: Partial<ModonomeConfig> = {};
  for (const key of SCALAR_KEYS) {
    if (base[key] !== edited[key]) {
      (patch as Record<string, unknown>)[key] = edited[key];
    }
  }
  for (const key of ARRAY_KEYS) {
    const a = base[key] ?? [];
    const b = edited[key] ?? [];
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
      (patch as Record<string, unknown>)[key] = b;
    }
  }
  for (const key of NESTED_KEYS) {
    if (nestedMapChanged(base[key], edited[key])) {
      (patch as Record<string, unknown>)[key] = edited[key];
    }
  }
  return patch;
}
