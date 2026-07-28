// Base-branch-loaded suppression allowlist for scripts/risk-surface-guard.mjs
// (ADR-047 decision 9). Pure data-handling: no console output here, callers
// format their own messages from the entries/errors this returns.
//
// Trust model: this module and the data file it reads
// (.modonome/risk-surface-allowlist.json) are both base-pinned in ci.yml,
// exactly like scripts/risk-surface-guard.mjs and scripts/lib/risk-surface-rules.mjs
// are. A pull request that adds a suppression entry is judged by the OLD
// (base-branch) allowlist on that same pull request; the new entry only takes
// effect starting with the next pull request opened after this one merges.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./jsonschema.mjs";
import { globToRegExp, RULES_BY_ID } from "./risk-surface-rules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(readFileSync(join(here, "..", "..", "schemas", "risk-surface-allowlist.schema.json"), "utf8"));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// parseAllowlist(text) -> { entries, errors }. Fail-closed is guaranteed at
// this boundary: whenever errors is non-empty, entries is always []. Callers
// never need to remember to check errors before trusting entries.
export function parseAllowlist(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { entries: [], errors: [`invalid JSON: ${e.message}`] };
  }

  const errors = validate(SCHEMA, parsed);
  if (errors.length === 0) {
    const seen = new Set();
    for (const entry of parsed.entries) {
      if (seen.has(entry.id)) errors.push(`duplicate entry id "${entry.id}"`);
      seen.add(entry.id);
      if (!RULES_BY_ID.has(entry.rule)) errors.push(`entry "${entry.id}": unknown rule id "${entry.rule}"`);
      if (entry.expires_at < entry.added_at) errors.push(`entry "${entry.id}": expires_at is before added_at`);
    }
  }

  if (errors.length > 0) return { entries: [], errors };
  return { entries: parsed.entries, errors: [] };
}

// loadAllowlist(path) -> { entries, errors }. A missing file is the default,
// backward-compatible state (zero suppressions), never an error.
export function loadAllowlist(path) {
  if (!existsSync(path)) return { entries: [], errors: [] };
  return parseAllowlist(readFileSync(path, "utf8"));
}

// isSuppressed(finding, entries, today) -> the matching entry, or null.
// `today` is a "YYYY-MM-DD" string passed explicitly by the caller (never
// read from the system clock in here), so this stays deterministic and
// testable without faking the clock. Independently re-validates each entry's
// expires_at shape rather than trusting parseAllowlist already ran on it:
// scripts/lib/jsonschema.mjs is a generic, non-base-pinned utility shared by
// other gates, so a weakened validator plus a malformed entry that slipped
// past review must never silently read as "never expires."
export function isSuppressed(finding, entries, today) {
  for (const entry of entries) {
    if (entry.rule !== finding.id) continue;
    if (typeof entry.file !== "string" || !globToRegExp(entry.file).test(finding.file)) continue;
    if (typeof entry.expires_at !== "string" || !DATE_RE.test(entry.expires_at)) continue;
    if (entry.expires_at < today) continue;
    return entry;
  }
  return null;
}

// applyAllowlist(findings, entries, today) -> findings with a new `suppressed`
// field on each ({entry_id, reason} or null). Every other field is untouched.
export function applyAllowlist(findings, entries, today) {
  return findings.map((f) => {
    const entry = isSuppressed(f, entries, today);
    return { ...f, suppressed: entry ? { entry_id: entry.id, reason: entry.reason } : null };
  });
}
