// Writes back to the real .modonome files. Scalar/array keys get a line-level patch;
// the four nested maps (roles, models, runners, providers) get a block-level splice
// that preserves every comment attached to an entry that isn't itself being touched.
// Nothing here authors new governance judgment (a gate description, a decision's
// answer) on the operator's behalf; those need real human content and stay out of
// scope for an automated write.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { parseStagedLine } from "./learningsFormat.mjs";
import { validateConfig } from "../../../scripts/lib/config-validate.mjs";

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
// Open maps a config.yaml can carry. Editing one of these sends the whole map as the
// patch value (see configDiff.ts); the block writer below reconciles it against the
// file's existing block entry-by-entry so untouched entries, and any comment attached
// to one, survive byte-for-byte.
const NESTED_CONFIG_KEYS = new Set(["roles", "models", "runners", "providers"]);

// Stable field-emission order per nested map, matching schemas/config.schema.json.
// Only used when (re)serializing an added or changed entry; an untouched entry is
// copied verbatim instead, so this order never has to match what a hand-edited file
// already has.
const ENTRY_FIELD_ORDER = {
  roles: ["runner", "model", "provider", "transport", "trigger", "execution_target"],
  models: ["provider", "base_url", "exec_mode"],
  runners: ["labels", "cli_path", "environment", "reachable_providers", "reachable_endpoints"],
  providers: ["transport", "costClass", "authEnv", "base_url", "defaultBaseUrl"],
};

const ENTRY_INDENT = 2; // spaces, one level under the top-level "key:" line

function formatYamlScalar(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

// A line-level patch, not a full YAML re-serialize, so every hand-written comment in
// config.yaml survives an edit made from the panel. Only top-level, zero-indent scalar
// or array keys are touched here; see rewriteBlock below for the four nested maps.
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

// Locate a top-level `key:` block-opening line (a zero-indent key whose value is
// empty, meaning what follows is a nested map) and the half-open [start, end) line
// range it and its indented content occupy. A comment placed above the key (this
// file's own convention throughout .modonome/config.yaml) sits before `start` and is
// therefore never touched. Returns null when the key has no top-level line at all.
function findBlock(lines, key) {
  const keyLineRe = new RegExp(`^${key}:\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (keyLineRe.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === "" || /^\s/.test(lines[end]))) {
    end++;
  }
  return { start, end };
}

// Split a block's interior lines into ordered segments: a real entry (a line at
// exactly ENTRY_INDENT spaces naming a key, plus every following line indented deeper
// than that), or "other" (blank lines, and comment lines — including an entirely
// commented-out example entry, which never matches the entry-key pattern and so is
// preserved untouched as inert text regardless of what changes around it).
function captureSegments(lines, start, end) {
  const segments = [];
  let i = start;
  const entryLineRe = new RegExp(`^ {${ENTRY_INDENT}}([A-Za-z0-9_.-]+):\\s*$`);
  while (i < end) {
    const line = lines[i];
    if (line.trim() === "") {
      segments.push({ type: "other", lines: [line] });
      i++;
      continue;
    }
    const indent = line.length - line.trimStart().length;
    const m = indent === ENTRY_INDENT ? entryLineRe.exec(line) : null;
    if (m) {
      const entryLines = [line];
      i++;
      while (i < end && lines[i].trim() !== "" && lines[i].length - lines[i].trimStart().length > ENTRY_INDENT) {
        entryLines.push(lines[i]);
        i++;
      }
      segments.push({ type: "entry", key: m[1], lines: entryLines });
      continue;
    }
    segments.push({ type: "other", lines: [line] });
    i++;
  }
  return segments;
}

function serializeEntry(topKey, entryKey, value) {
  const fieldOrder = ENTRY_FIELD_ORDER[topKey] ?? [];
  const lines = [`${" ".repeat(ENTRY_INDENT)}${entryKey}:`];
  const emitted = new Set();
  for (const field of fieldOrder) {
    if (!(field in value) || value[field] === undefined) continue;
    lines.push(`${" ".repeat(ENTRY_INDENT * 2)}${field}: ${formatYamlScalar(value[field])}`);
    emitted.add(field);
  }
  // Any field the known order doesn't list (schema grew, or a host repo extended an
  // entry) still round-trips instead of silently being dropped.
  for (const [field, v] of Object.entries(value)) {
    if (emitted.has(field) || v === undefined) continue;
    lines.push(`${" ".repeat(ENTRY_INDENT * 2)}${field}: ${formatYamlScalar(v)}`);
  }
  return lines;
}

function deepEqualJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Reconcile one nested map's block against its new value, entry by entry. An entry
// present in both, unchanged, is copied verbatim (comments and all); a changed entry
// is re-serialized (dropping any comment attached specifically to it, the same
// trade-off patchYamlText already makes for a changed scalar line); a removed entry
// is dropped; a new entry is appended after the existing ones, in patch order. Every
// blank line and every comment not attached to a changed/removed entry is left
// exactly where it was.
function rewriteBlock(lines, topKey, oldValue, newValue) {
  const block = findBlock(lines, topKey);
  if (!block) {
    const appended = [`${topKey}:`];
    for (const [entryKey, entryValue] of Object.entries(newValue)) {
      appended.push(...serializeEntry(topKey, entryKey, entryValue));
    }
    return [...lines, "", ...appended];
  }

  const segments = captureSegments(lines, block.start + 1, block.end);
  const seen = new Set();
  const body = [];
  for (const seg of segments) {
    if (seg.type === "other") {
      body.push(...seg.lines);
      continue;
    }
    seen.add(seg.key);
    if (!(seg.key in newValue)) continue; // removed
    if (deepEqualJson(oldValue?.[seg.key], newValue[seg.key])) {
      body.push(...seg.lines);
    } else {
      body.push(...serializeEntry(topKey, seg.key, newValue[seg.key]));
    }
  }

  // Pull off any trailing blank lines before appending a new entry. When this block
  // is the last thing in the file, its final "line" is the empty string that
  // String.split("\n") produces after the file's closing newline; appending past it
  // would push that marker into the middle of the file and silently drop the file's
  // trailing newline.
  const trailingBlanks = [];
  while (body.length > 0 && body[body.length - 1].trim() === "") {
    trailingBlanks.unshift(body.pop());
  }
  for (const [entryKey, entryValue] of Object.entries(newValue)) {
    if (seen.has(entryKey)) continue;
    body.push(...serializeEntry(topKey, entryKey, entryValue));
  }
  body.push(...trailingBlanks);

  return [...lines.slice(0, block.start), lines[block.start], ...body, ...lines.slice(block.end)];
}

export function patchConfig(modonomeDir, patch) {
  for (const key of Object.keys(patch)) {
    if (!SCALAR_CONFIG_KEYS.has(key) && !ARRAY_CONFIG_KEYS.has(key) && !NESTED_CONFIG_KEYS.has(key)) {
      throw new Error(`Config key "${key}" is not editable from the panel.`);
    }
  }

  const file = join(modonomeDir, "config.yaml");
  const text = readFileSync(file, "utf8");
  const oldConfig = yaml.load(text) ?? {};

  const scalarArrayPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!NESTED_CONFIG_KEYS.has(key)) scalarArrayPatch[key] = value;
  }

  let lines =
    Object.keys(scalarArrayPatch).length > 0 ? patchYamlText(text, scalarArrayPatch).split("\n") : text.split("\n");

  for (const key of NESTED_CONFIG_KEYS) {
    if (!(key in patch)) continue;
    lines = rewriteBlock(lines, key, oldConfig[key] ?? {}, patch[key]);
  }

  const nextText = lines.join("\n");

  // Validate the prospective full config (old config with the patch overlaid) against
  // the schema and the safety rules — not just a syntax check — so a save that would
  // leave config.yaml schema-invalid, or would put maker and checker on the same
  // model while require_distinct_maker_checker_model is on, never reaches disk.
  const prospective = { ...oldConfig, ...patch };
  const errors = validateConfig(prospective);
  if (errors.length > 0) {
    throw new Error(`Config would be invalid after this change: ${errors.join("; ")}`);
  }

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
