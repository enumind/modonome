#!/usr/bin/env node
// Learning hygiene gate (ADR-026). Verifies that every promoted learning is fully
// traceable: required fields present and non-empty, dates sane, the originating
// signal resolvable, and the deterministic gate it added actually exists. Runs in
// CI with no external call. A promoted learning that cannot be traced is a
// cargo-cult rule, which is exactly what this gate prevents.
//
// Usage: node scripts/check-learning-traceability.mjs
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readPromotedLearnings, REQUIRED_FIELDS } from "./lib/learnings.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));
const problems = [];

// Minimum days a lesson must stay staged before promotion. Owners may raise this.
// Default 0 lets a lesson promoted from a formal audit on the same day pass, while
// still enforcing that promotion never predates observation.
const MIN_STAGE_DAYS = Number(process.env.MODONOME_MIN_STAGE_DAYS || 0);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let learnings;
try {
  learnings = readPromotedLearnings(root);
} catch (e) {
  console.error(formatMessage("gate.learning-traceability.read-error", { reason: e.message }, overrides).message);
  process.exit(1);
}

// an absent or empty Promoted block cannot certify traceability.
if (learnings.length === 0) {
  console.error(formatMessage("gate.learning-traceability.no-learnings", {}, overrides).message);
  process.exit(1);
}

const seen = new Set();
for (const l of learnings) {
  const tag = l.id || JSON.stringify(l).slice(0, 40);

  for (const f of REQUIRED_FIELDS) {
    if (l[f] === undefined || l[f] === null || String(l[f]).trim() === "") {
      problems.push(formatMessage("gate.learning-traceability.missing-field", { tag, field: f }, overrides).message);
    }
  }

  if (l.id) {
    if (seen.has(l.id)) problems.push(formatMessage("gate.learning-traceability.duplicate-id", { tag }, overrides).message);
    seen.add(l.id);
  }

  for (const f of ["observation_date", "promotion_date"]) {
    if (l[f] && !DATE_RE.test(l[f])) {
      problems.push(formatMessage("gate.learning-traceability.bad-date-format", { tag, field: f, value: l[f] }, overrides).message);
    } else if (l[f] && DATE_RE.test(l[f]) && isNaN(Date.parse(l[f]))) {
      // reject calendar-invalid dates like 2026-99-99 that match the regex but
      // are not real calendar dates.
      problems.push(formatMessage("gate.learning-traceability.invalid-calendar-date", { tag, field: f, value: l[f] }, overrides).message);
    }
  }
  if (DATE_RE.test(l.observation_date || "") && DATE_RE.test(l.promotion_date || "")) {
    const obs = Date.parse(l.observation_date);
    const prom = Date.parse(l.promotion_date);
    if (prom < obs) problems.push(formatMessage("gate.learning-traceability.promotion-precedes-observation", { tag }, overrides).message);
    const stagedDays = Math.floor((prom - obs) / 86400000);
    if (stagedDays < MIN_STAGE_DAYS) {
      problems.push(
        formatMessage(
          "gate.learning-traceability.understaged",
          { tag, stagedDays, minStageDays: MIN_STAGE_DAYS },
          overrides
        ).message
      );
    }
  }

  // the gate the learning claims to have added must exist on disk and must
  // live under a recognized gate directory (scripts/, tests/, or .github/).
  if (l.gate_location) {
    const path = String(l.gate_location).split(":")[0];
    const GATE_DIRS = ["scripts/", "tests/", ".github/"];
    const underGateDir = GATE_DIRS.some((dir) => path.startsWith(dir));
    if (!underGateDir) {
      problems.push(formatMessage("gate.learning-traceability.gate-location-wrong-dir", { tag, path }, overrides).message);
    } else if (!existsSync(join(root, path))) {
      problems.push(formatMessage("gate.learning-traceability.gate-location-missing", { tag, path }, overrides).message);
    }
  }

  // correction_signal_id must be a repo-relative path (containing "/") that
  // resolves to an existing file. Non-path identifiers are rejected so the audit
  // trail is self-contained in committed documents (no external resolution).
  if (l.correction_signal_id) {
    const sigId = String(l.correction_signal_id);
    if (!sigId.includes("/")) {
      problems.push(formatMessage("gate.learning-traceability.signal-not-path", { tag, sigId }, overrides).message);
    } else if (!existsSync(join(root, sigId))) {
      problems.push(formatMessage("gate.learning-traceability.signal-missing", { tag, sigId }, overrides).message);
    }
  }
}

console.log("Learning traceability (ADR-026)");
console.log("===============================");
if (problems.length === 0) {
  console.log(`PASS: ${learnings.length} promoted learning(s), all fully traceable.`);
  process.exit(0);
}
console.error(formatMessage("gate.learning-traceability.fail-summary", { count: problems.length }, overrides).message);
for (const p of problems) console.error("  - " + p);
process.exit(1);
