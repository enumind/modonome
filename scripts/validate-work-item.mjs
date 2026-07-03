#!/usr/bin/env node
// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
// Validate a Modonome work item against the schema and governance safety rules.
// Usage: node scripts/validate-work-item.mjs <path/to/item.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, loadSchema } from "./lib/jsonschema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = loadSchema(readFileSync(join(here, "..", "schemas", "work-item.schema.json"), "utf8"));

// Governance rules that JSON Schema cannot express (cross-field invariants).
export function governanceErrors(item) {
  const errs = [];

  // Separation of duties: maker and checker must be distinct identities.
  if (item.maker_id && item.checker_id && item.maker_id === item.checker_id) {
    errs.push(`maker_id and checker_id are the same identity (${item.maker_id}). Maker cannot review their own work.`);
  }

  // Separation of duties: maker and checker must use distinct models.
  if (item.maker_model && item.checker_model && item.maker_model === item.checker_model) {
    errs.push(`maker_model and checker_model are the same model (${item.maker_model}). Distinct models are required when require_distinct_maker_checker_model is true.`);
  }

  // Protected path items must be escalated before reaching merge_ready.
  if (item.touches_protected_path === true && item.state === "merge_ready" && !item.escalation_reason) {
    errs.push(`Item touches a protected path but has no escalation_reason and is in state merge_ready. Protected-path items must be escalated for owner review.`);
  }

  // Escalated items must record why.
  if (item.state === "escalated" && !item.escalation_reason) {
    errs.push(`Item is in state escalated but has no escalation_reason. Record why the item was escalated.`);
  }

  // Attempts must not exceed cap.
  if (item.attempts !== undefined && item.max_attempts !== undefined && item.attempts > item.max_attempts) {
    errs.push(`attempts (${item.attempts}) exceeds max_attempts (${item.max_attempts}). Item should be escalated.`);
  }

  return errs;
}

export function validateWorkItem(item) {
  return [...validate(schema, item), ...governanceErrors(item)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-work-item.mjs <item.json>");
    process.exit(2);
  }
  const errors = validateWorkItem(JSON.parse(readFileSync(path, "utf8")));
  if (errors.length > 0) {
    console.error(`Work item invalid: ${path}`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Work item valid: ${path}`);
}
