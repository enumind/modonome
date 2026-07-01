#!/usr/bin/env node
// Learning promotion scaffolder (ADR-026). Builds a schema-complete, traceable
// staged learning record from an accepted correction, carrying every required field.
// Does not write to .modonome/LEARNINGS.md; prints the record to stdout for review.
//
// Usage:
//   node scripts/promote-learning.mjs \
//     --lesson "example rule" \
//     --evidence-summary "observed in 5 audits" \
//     --correction-signal-id "docs/adr/ADR-026.md" \
//     --gate-added "new gate added" \
//     --gate-location "scripts/check-style.mjs" \
//     [--id "LRN-001"] \
//     [--observation-date "2026-07-01"] \
//     [--promotion-date "2026-07-01"]

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { REQUIRED_FIELDS } from "./lib/learnings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Slugify a lesson into a deterministic ID.
function slugifyId(lesson) {
  return "LRN-" +
    lesson
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30)
      .padEnd(3, "x");
}

// Build a learning record from options.
export function buildLearningRecord(opts = {}) {
  if (!opts.lesson) {
    throw new Error("buildLearningRecord: missing required option 'lesson'");
  }
  if (!opts.evidenceSummary) {
    throw new Error("buildLearningRecord: missing required option 'evidenceSummary'");
  }

  const today = new Date().toISOString().slice(0, 10);

  return {
    id: opts.id || slugifyId(opts.lesson),
    lesson: opts.lesson,
    correction_signal_id: opts.correctionSignalId || "",
    observation_date: opts.observationDate || today,
    promotion_date: opts.promotionDate || today,
    evidence_summary: opts.evidenceSummary,
    gate_added: opts.gateAdded || "",
    gate_location: opts.gateLocation || "",
  };
}

// Validate a learning record.
// Returns an array of error strings. Empty array means valid.
export function validateLearningRecord(record) {
  const errors = [];

  // Check all required fields are present and non-empty.
  for (const field of REQUIRED_FIELDS) {
    if (
      record[field] === undefined ||
      record[field] === null ||
      String(record[field]).trim() === ""
    ) {
      errors.push(`missing or empty required field: ${field}`);
    }
  }

  // Validate gate_location is under a recognized directory.
  if (record.gate_location) {
    const path = String(record.gate_location).split(":")[0];
    const GATE_DIRS = ["scripts/", "tests/", ".github/"];
    const underGateDir = GATE_DIRS.some((dir) => path.startsWith(dir));
    if (!underGateDir) {
      errors.push(
        `gate_location "${path}" must be under scripts/, tests/, or .github/`,
      );
    }
  }

  return errors;
}

// CLI entry point.
if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    const value = process.argv[i + 1];
    if (key === "--lesson") opts.lesson = value;
    else if (key === "--evidence-summary") opts.evidenceSummary = value;
    else if (key === "--correction-signal-id") opts.correctionSignalId = value;
    else if (key === "--observation-date") opts.observationDate = value;
    else if (key === "--promotion-date") opts.promotionDate = value;
    else if (key === "--gate-added") opts.gateAdded = value;
    else if (key === "--gate-location") opts.gateLocation = value;
    else if (key === "--id") opts.id = value;
    else if (key === "--write") {
      // Reserved for future use; not implemented in this PR.
      console.error("error: --write flag not yet implemented");
      process.exit(1);
    }
  }

  try {
    const record = buildLearningRecord(opts);
    const errors = validateLearningRecord(record);
    if (errors.length > 0) {
      console.error("validation errors:");
      for (const err of errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log(JSON.stringify(record, null, 2));
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
