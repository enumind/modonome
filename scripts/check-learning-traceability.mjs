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

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
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
  console.error(`Learning traceability: ${e.message}`);
  process.exit(1);
}

// an absent or empty Promoted block cannot certify traceability.
if (learnings.length === 0) {
  console.error("FAIL: no promoted learnings found; Promoted block is absent or empty. Gate cannot certify an empty record.");
  process.exit(1);
}

const seen = new Set();
for (const l of learnings) {
  const tag = l.id || JSON.stringify(l).slice(0, 40);

  for (const f of REQUIRED_FIELDS) {
    if (l[f] === undefined || l[f] === null || String(l[f]).trim() === "") {
      problems.push(`${tag}: missing or empty required field "${f}".`);
    }
  }

  if (l.id) {
    if (seen.has(l.id)) problems.push(`${tag}: duplicate learning id.`);
    seen.add(l.id);
  }

  for (const f of ["observation_date", "promotion_date"]) {
    if (l[f] && !DATE_RE.test(l[f])) {
      problems.push(`${tag}: ${f} "${l[f]}" is not YYYY-MM-DD.`);
    } else if (l[f] && DATE_RE.test(l[f]) && isNaN(Date.parse(l[f]))) {
      // reject calendar-invalid dates like 2026-99-99 that match the regex but
      // are not real calendar dates.
      problems.push(`${tag}: ${f} "${l[f]}" is not a valid calendar date.`);
    }
  }
  if (DATE_RE.test(l.observation_date || "") && DATE_RE.test(l.promotion_date || "")) {
    const obs = Date.parse(l.observation_date);
    const prom = Date.parse(l.promotion_date);
    if (prom < obs) problems.push(`${tag}: promotion_date precedes observation_date.`);
    const stagedDays = Math.floor((prom - obs) / 86400000);
    if (stagedDays < MIN_STAGE_DAYS) {
      problems.push(`${tag}: staged ${stagedDays} day(s), below MODONOME_MIN_STAGE_DAYS=${MIN_STAGE_DAYS}.`);
    }
  }

  // the gate the learning claims to have added must exist on disk and must
  // live under a recognized gate directory (scripts/, tests/, or .github/).
  if (l.gate_location) {
    const path = String(l.gate_location).split(":")[0];
    const GATE_DIRS = ["scripts/", "tests/", ".github/"];
    const underGateDir = GATE_DIRS.some((dir) => path.startsWith(dir));
    if (!underGateDir) {
      problems.push(`${tag}: gate_location "${path}" must be under scripts/, tests/, or .github/ (got: "${path}").`);
    } else if (!existsSync(join(root, path))) {
      problems.push(`${tag}: gate_location "${path}" does not exist.`);
    }
  }

  // correction_signal_id must be a repo-relative path (containing "/") that
  // resolves to an existing file. Non-path identifiers are rejected so the audit
  // trail is self-contained in committed documents (no external resolution).
  if (l.correction_signal_id) {
    const sigId = String(l.correction_signal_id);
    if (!sigId.includes("/")) {
      problems.push(`${tag}: correction_signal_id "${sigId}" is not a repo-relative path. All references must be committed documents so the audit trail is self-contained (e.g. docs/audits/claims-audit-2026-06-25.md).`);
    } else if (!existsSync(join(root, sigId))) {
      problems.push(`${tag}: correction_signal_id "${sigId}" looks like a path but does not exist.`);
    }
  }
}

console.log("Learning traceability (ADR-026)");
console.log("===============================");
if (problems.length === 0) {
  console.log(`PASS: ${learnings.length} promoted learning(s), all fully traceable.`);
  process.exit(0);
}
console.error(`FAIL: ${problems.length} traceability problem(s):\n`);
for (const p of problems) console.error("  - " + p);
process.exit(1);
