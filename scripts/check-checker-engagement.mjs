#!/usr/bin/env node
// Anti-rubber-stamp gate (ADR-022). A checker that approves run after run with no
// requested changes and no questions is indistinguishable from an absent checker.
// This gate reads checker telemetry and fails if any checker approves
// MODONOME_GHOST_THRESHOLD consecutive runs with zero engagement. Reset by
// requesting changes or raising a question on the next run. No external call.
//
// Telemetry fields per checker decision event (see ADR-022), carried in metrics.jsonl:
//   checker_id, checker_requested_changes (bool), checker_questions_raised (number)
//
// Usage: node scripts/check-checker-engagement.mjs [path/to/metrics.jsonl]
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const metricsPath = process.argv[2] || join(root, ".modonome", "metrics.jsonl");
const THRESHOLD = Number(process.env.MODONOME_GHOST_THRESHOLD || 10);

const problems = [];

function readEvents(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

const events = readEvents(metricsPath);
const consecutive = new Map(); // checker_id -> consecutive non-engaged approvals

for (const e of events) {
  if (!e.checker_id) continue;
  const engaged = e.checker_requested_changes === true || (Number(e.checker_questions_raised) || 0) > 0;
  if (engaged) {
    consecutive.set(e.checker_id, 0);
    continue;
  }
  const n = (consecutive.get(e.checker_id) || 0) + 1;
  consecutive.set(e.checker_id, n);
  if (n === THRESHOLD) {
    problems.push(`Checker "${e.checker_id}" approved ${THRESHOLD} consecutive runs with no engagement. Request changes or raise a question on the next run, or escalate to a different checker.`);
  }
}

console.log("Checker engagement (ADR-022)");
console.log("============================");
if (events.length === 0) {
  console.log("PASS: no checker telemetry yet (the engine writes it at runtime).");
  process.exit(0);
}
if (problems.length === 0) {
  console.log(`PASS: ${events.length} event(s) scanned; no checker ghosting detected.`);
  process.exit(0);
}
console.error(`FAIL: ${problems.length} ghosting pattern(s):\n`);
for (const p of problems) console.error("  - " + p);
process.exit(1);
