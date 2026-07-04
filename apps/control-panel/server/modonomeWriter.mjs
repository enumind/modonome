// Writes back to the real .modonome files. Scoped deliberately: every write here is a
// mechanical edit to a value the operator already sees and controls (a cap, a toggle, a
// lease, a staged learning to discard). Nothing here authors new governance judgment
// (a gate description, a decision's answer) on the operator's behalf; those need real
// human content and stay out of scope for an automated write.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import { parseStagedLine } from "./learningsFormat.mjs";
import { checkOverridesIntegrity } from "../../../scripts/lib/messages.mjs";
import { parseFlatYaml } from "../../../scripts/lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const SCALAR_CONFIG_KEYS = new Set([
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
]);
const ARRAY_CONFIG_KEYS = new Set(["trusted_author_allowlist", "protected_paths_extra"]);

function formatYamlScalar(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

// A line-level patch, not a full YAML re-serialize, so every hand-written comment in
// config.yaml survives an edit made from the panel. Only top-level, zero-indent keys
// are touched; nested maps (roles, models, runners, providers) are read-only from here.
function patchYamlText(text, patch) {
  const lines = text.split("\n");
  const remaining = new Set(Object.keys(patch));
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = /^([A-Za-z0-9_]+):/.exec(line);
    if (m && remaining.has(m[1])) {
      const key = m[1];
      remaining.delete(key);
      out.push(`${key}: ${formatYamlScalar(patch[key])}`);
      i += 1;
      while (i < lines.length && /^\s+-\s/.test(lines[i])) i += 1;
      continue;
    }
    out.push(line);
    i += 1;
  }
  if (remaining.size > 0) {
    throw new Error(`Config key(s) not found in config.yaml: ${[...remaining].join(", ")}`);
  }
  return out.join("\n");
}

export function patchConfig(modonomeDir, patch) {
  for (const key of Object.keys(patch)) {
    if (!SCALAR_CONFIG_KEYS.has(key) && !ARRAY_CONFIG_KEYS.has(key)) {
      throw new Error(`Config key "${key}" is not editable from the panel.`);
    }
  }
  const file = join(modonomeDir, "config.yaml");
  const text = readFileSync(file, "utf8");
  const nextText = patchYamlText(text, patch);
  yaml.load(nextText); // Re-parse before writing so a bad patch never lands on disk.
  writeFileSync(file, nextText);
  return nextText;
}

function workItemFile(modonomeDir, itemId) {
  const file = join(modonomeDir, "work-items", `${itemId}.json`);
  if (!existsSync(file)) throw new Error(`Work item "${itemId}" not found.`);
  return file;
}

export function releaseLease(modonomeDir, itemId) {
  const file = workItemFile(modonomeDir, itemId);
  const item = JSON.parse(readFileSync(file, "utf8"));
  if (item.state === "done") throw new Error(`"${itemId}" is already done; there is no lease to release.`);
  delete item.owner;
  delete item.lease_expires_at;
  item.state = "queued";
  writeFileSync(file, JSON.stringify(item, null, 2) + "\n");
  return item;
}

const messagesSchema = JSON.parse(readFileSync(join(here, "..", "..", "..", "schemas", "messages.schema.json"), "utf8"));

// Merge a patch of { id: { severity?, text?, suppressed? } } into
// .modonome/messages.yaml's overrides map, re-validate against both the
// schema and the severity-floor rule (the same checkOverridesIntegrity()
// scripts/check-message-catalog-integrity.mjs runs in CI), and only then
// write. A patch entry with every field cleared removes that id's override
// entirely, resetting it to the catalog default. The header comment block
// is preserved; only the schema_version/overrides data is re-serialized,
// since (unlike config.yaml) there is no hand-written per-key commentary
// inside the overrides map to lose.
export function patchMessages(modonomeDir, patch) {
  const file = join(modonomeDir, "messages.yaml");
  const text = readFileSync(file, "utf8");
  const headerLines = text.split("\n").filter((l) => l.trim().startsWith("#") || l.trim() === "");
  const header = headerLines.length ? headerLines.join("\n") + "\n" : "";

  const doc = parseFlatYaml(text);
  const overrides = { ...(doc.overrides || {}) };
  for (const [id, fields] of Object.entries(patch || {})) {
    const merged = { ...(overrides[id] || {}), ...fields };
    const cleaned = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined));
    if (Object.keys(cleaned).length === 0) delete overrides[id];
    else overrides[id] = cleaned;
  }
  const nextDoc = { schema_version: doc.schema_version ?? 1, overrides };

  const problems = checkOverridesIntegrity(nextDoc, messagesSchema);
  if (problems.length > 0) throw new Error(`Message override rejected:\n  - ${problems.join("\n  - ")}`);

  const nextText = header + yaml.dump(nextDoc, { lineWidth: -1 });
  yaml.load(nextText); // Re-parse before writing so a bad patch never lands on disk.
  writeFileSync(file, nextText);
  return nextDoc;
}

export function pruneLearning(modonomeDir, lesson) {
  const file = join(modonomeDir, "LEARNINGS.md");
  const lines = readFileSync(file, "utf8").split("\n");
  let removed = false;
  const next = lines.filter((line) => {
    if (!line.trim().startsWith("- [")) return true;
    const parsed = parseStagedLine(line);
    const isMatch = parsed?.lesson === lesson;
    if (isMatch) removed = true;
    return !isMatch;
  });
  if (!removed) throw new Error("Staged learning not found. It may already be promoted or pruned.");
  writeFileSync(file, next.join("\n"));
}
