#!/usr/bin/env node
// Validate a Modonome work item against the schema and governance safety rules.
// Usage: node scripts/validate-work-item.mjs <path/to/item.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./lib/jsonschema.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "schemas", "work-item.schema.json"), "utf8"));
const modelFamilies = JSON.parse(readFileSync(join(here, "..", "schemas", "model-families.json"), "utf8")).families;
const overrides = loadMessageOverrides(join(here, "..", ".modonome"));

// Resolve a model name to its family by longest-matching prefix. Returns null
// when no prefix matches, so unrecognized models are treated as distinct
// families (they fall through the family check and are caught only if their
// names are exactly equal).
export function modelFamily(model) {
  let family = null;
  let longest = -1;
  for (const [prefix, fam] of Object.entries(modelFamilies)) {
    if (model.startsWith(prefix) && prefix.length > longest) {
      family = fam;
      longest = prefix.length;
    }
  }
  return family;
}

// Governance rules that JSON Schema cannot express (cross-field invariants).
export function governanceErrors(item, config = {}) {
  const errs = [];

  // Presence guards: identity fields are required once work is in flight.
  // Scoped to active states only so legacy "done" items (no identity fields) stay valid.
  //
  // The maker advances an item to "checking" and opens its pull request before any
  // checker has engaged, so a "checking" item legitimately has no checker_id yet.
  // Requiring it there would fail the maker's own pull request in CI before the
  // checker can act. checker_id is therefore required only at "merge_ready", the
  // gate where a missing checker would mean the maker could merge unreviewed work.
  const makerRequiredStates = ["making", "checking", "rework", "merge_ready"];
  const checkerRequiredStates = ["merge_ready"];
  if (makerRequiredStates.includes(item.state) && !item.maker_id) {
    errs.push(formatMessage("gate.work-item.maker-id-required", { state: item.state }, overrides).message);
  }
  if (checkerRequiredStates.includes(item.state) && !item.checker_id) {
    errs.push(formatMessage("gate.work-item.checker-id-required", { state: item.state }, overrides).message);
  }

  // Separation of duties: maker and checker must be distinct identities.
  if (item.maker_id && item.checker_id && item.maker_id === item.checker_id) {
    errs.push(formatMessage("gate.work-item.maker-checker-same-identity", { id: item.maker_id }, overrides).message);
  }

  // Separation of duties: maker and checker must use distinct models (default on, disabled by config).
  // Exact-string equality is the strict subset; family distinctness is the wider rule, since two
  // models from the same family (architecture) share failure modes and undermine independent review.
  if (config.require_distinct_maker_checker_model !== false) {
    if (item.maker_model && item.checker_model && item.maker_model === item.checker_model) {
      errs.push(formatMessage("gate.work-item.maker-checker-same-model", { model: item.maker_model }, overrides).message);
    } else if (item.maker_model && item.checker_model) {
      const makerFamily = modelFamily(item.maker_model);
      const checkerFamily = modelFamily(item.checker_model);
      if (makerFamily !== null && makerFamily === checkerFamily) {
        errs.push(
          formatMessage(
            "gate.work-item.maker-checker-same-family",
            { makerModel: item.maker_model, checkerModel: item.checker_model, family: makerFamily },
            overrides
          ).message
        );
      }
    }
  }

  // Protected path items must be escalated before reaching merge_ready.
  if (item.touches_protected_path === true && item.state === "merge_ready" && !item.escalation_reason) {
    errs.push(formatMessage("gate.work-item.protected-path-not-escalated", {}, overrides).message);
  }

  // Escalated items must record why.
  if (item.state === "escalated" && !item.escalation_reason) {
    errs.push(formatMessage("gate.work-item.escalated-without-reason", {}, overrides).message);
  }

  // Attempts must not exceed cap.
  if (item.attempts !== undefined && item.max_attempts !== undefined && item.attempts > item.max_attempts) {
    errs.push(
      formatMessage("gate.work-item.attempts-exceed-cap", { attempts: item.attempts, maxAttempts: item.max_attempts }, overrides)
        .message
    );
  }

  return errs;
}

export function validateWorkItem(item, config = {}) {
  return [...validate(schema, item), ...governanceErrors(item, config)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-work-item.mjs <item.json>");
    process.exit(2);
  }
  const errors = validateWorkItem(JSON.parse(readFileSync(path, "utf8")));
  if (errors.length > 0) {
    console.error(formatMessage("gate.work-item.invalid", { path }, overrides).message);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Work item valid: ${path}`);
}
