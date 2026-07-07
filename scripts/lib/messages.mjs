// Central engine for modonome's message catalog. Every failure/warning/info
// message the engine emits (CLI, gate scripts, agent run-cycle) is defined as
// a catalog entry here or in scripts/lib/message-catalog/*.mjs, keyed by a
// stable id, so an operator can retune wording from the control panel
// instead of a code change.
//
// Severity floor: modonome's core guarantee is that a governed repo's own CI
// gates cannot be weakened by the thing they are gating. A catalog entry
// marked non_suppressible therefore has its severity and suppression locked
// to the catalog default; only its wording (`text`) is operator-editable.
// Everything else is fully configurable, including suppression.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validate } from "./jsonschema.mjs";
import { parseFlatYaml } from "./yaml-lite.mjs";
import { CATALOG_PARTIALS } from "./message-catalog/index.mjs";

export const SEVERITY_RANK = { ok: 0, info: 1, attention: 2, blocked: 3 };

const CATALOG_SOURCES = CATALOG_PARTIALS;

function mergeCatalog(sources) {
  const merged = {};
  for (const source of sources) {
    for (const [id, entry] of Object.entries(source)) {
      if (merged[id]) throw new Error(`Duplicate message id "${id}" across catalog sources.`);
      merged[id] = entry;
    }
  }
  return merged;
}

export const MESSAGES = mergeCatalog(CATALOG_SOURCES);

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

// Clamp a requested severity to an entry's floor. Only ever raises severity
// toward (never past) the catalog default for non_suppressible entries.
function clampSeverity(entry, requestedSeverity) {
  if (!entry.non_suppressible) return requestedSeverity;
  const floor = SEVERITY_RANK[entry.severity];
  const requested = SEVERITY_RANK[requestedSeverity];
  return requested < floor ? entry.severity : requestedSeverity;
}

export function loadMessageOverrides(modonomeDir) {
  const file = join(modonomeDir, "messages.yaml");
  if (!existsSync(file)) return {};
  const parsed = parseFlatYaml(readFileSync(file, "utf8"));
  return parsed.overrides || {};
}

// Validate an overrides document (the parsed contents of messages.yaml)
// against both the JSON schema and the severity-floor rule. Shared by
// scripts/check-message-catalog-integrity.mjs (CI) and the control panel
// write path, so both enforce exactly the same rule.
export function checkOverridesIntegrity(overridesDoc, schema) {
  const problems = validate(schema, overridesDoc);
  const overrides = overridesDoc?.overrides || {};
  for (const [id, override] of Object.entries(overrides)) {
    const entry = MESSAGES[id];
    if (!entry) {
      problems.push(`messages.yaml: unknown message id "${id}"`);
      continue;
    }
    if (!entry.non_suppressible) continue;
    if (override.suppressed === true) {
      problems.push(`messages.yaml: "${id}" is non-suppressible; cannot set suppressed: true`);
    }
    if (override.severity && SEVERITY_RANK[override.severity] < SEVERITY_RANK[entry.severity]) {
      problems.push(
        `messages.yaml: "${id}" severity cannot be lowered below "${entry.severity}" (requested "${override.severity}")`
      );
    }
  }
  return problems;
}

// Look up a message by id, apply any operator override (clamped to the
// floor for non_suppressible entries), interpolate {param} tokens, and
// return the resolved { id, severity, suppressed, message } ready to log,
// throw, or render as a Toast.
export function formatMessage(id, params = {}, overrides = {}) {
  const entry = MESSAGES[id];
  if (!entry) throw new Error(`Unknown message id "${id}".`);
  const override = overrides[id] || {};
  const text = override.text ?? entry.template;
  const suppressed = entry.non_suppressible ? false : override.suppressed === true;
  const severity = clampSeverity(entry, override.severity ?? entry.severity);
  return {
    id,
    category: entry.category,
    non_suppressible: !!entry.non_suppressible,
    severity,
    suppressed,
    message: interpolate(text, params),
  };
}

// List every catalog entry with its resolved (override-applied) state, for
// the control panel's Messages tab.
export function listMessages(overrides = {}) {
  return Object.entries(MESSAGES)
    .map(([id, entry]) => {
      const override = overrides[id] || {};
      return {
        id,
        category: entry.category,
        default_severity: entry.severity,
        default_template: entry.template,
        non_suppressible: !!entry.non_suppressible,
        severity: clampSeverity(entry, override.severity ?? entry.severity),
        text: override.text ?? entry.template,
        suppressed: entry.non_suppressible ? false : override.suppressed === true,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
