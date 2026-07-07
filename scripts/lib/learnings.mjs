// Shared reader for the promoted-learnings block in .modonome/LESSONS.md.
// Promoted learnings live in a single fenced ```json array so they stay both
// human-readable and machine-auditable (ADR-026). This module also owns the
// Staged section: reading its entries, enforcing its documented cap, and
// appending a new candidate line (the only writer the near-miss widener uses).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./messages.mjs";

export const REQUIRED_FIELDS = [
  "id",
  "lesson",
  "correction_signal_id",
  "observation_date",
  "promotion_date",
  "evidence_summary",
  "gate_added",
  "gate_location",
];

// The Staged section is capped so it stays a short review queue, never a dumping
// ground. LESSONS.md documents this as "Cap at 20 staged entries... Never
// auto-evict." Until now nothing enforced it; appendStagedEntry is the first
// enforcement point.
export const MAX_STAGED_ENTRIES = 20;

// A staged line, per LESSONS.md's own "Staged format":
//   - [YYYY-MM-DD] (signal: gate|review|incident|rework) lesson - evidence: ref
export const STAGED_LINE_RE =
  /^- \[\d{4}-\d{2}-\d{2}\] \(signal: (?:gate|review|incident|rework)\) .+ - evidence: .+$/;

function learningsPath(root) {
  return join(root, ".modonome", "LESSONS.md");
}

// Extract the first fenced json block that appears after the "## Promoted" heading.
export function readPromotedLearnings(root) {
  const text = readFileSync(learningsPath(root), "utf8");
  const promotedIdx = text.indexOf("## Promoted");
  if (promotedIdx === -1) return [];
  const fenceStart = text.indexOf("```json", promotedIdx);
  if (fenceStart === -1) return [];
  const bodyStart = fenceStart + "```json".length;
  const fenceEnd = text.indexOf("```", bodyStart);
  if (fenceEnd === -1)
    throw new Error(formatMessage("advisory.learnings.unterminated-promoted-block", {}, loadMessageOverrides(join(root, ".modonome"))).message);
  return JSON.parse(text.slice(bodyStart, fenceEnd));
}

// Return the staged bullet lines (the "- [date] ..." entries) between the
// "## Staged" and "## Promoted" headings. Lines that do not begin a bullet are
// ignored, so surrounding prose does not count against the cap.
export function readStagedEntries(root) {
  const text = readFileSync(learningsPath(root), "utf8");
  const stagedIdx = text.indexOf("## Staged");
  if (stagedIdx === -1) return [];
  const promotedIdx = text.indexOf("## Promoted", stagedIdx);
  const section = text.slice(stagedIdx, promotedIdx === -1 ? undefined : promotedIdx);
  return section.split("\n").filter((l) => l.startsWith("- ["));
}

// Append one staged candidate line to LESSONS.md, enforcing the format and the
// cap. Never evicts: a full section throws so a human promotes or prunes first.
// Idempotent on an exact-duplicate line. Returns { added, reason }.
export function appendStagedEntry(root, line) {
  const overrides = loadMessageOverrides(join(root, ".modonome"));
  if (typeof line !== "string" || !STAGED_LINE_RE.test(line)) {
    throw new Error(formatMessage("advisory.learnings.staged-format-invalid", { line }, overrides).message);
  }
  const existing = readStagedEntries(root);
  if (existing.includes(line)) return { added: false, reason: "duplicate" };
  if (existing.length >= MAX_STAGED_ENTRIES) {
    throw new Error(
      formatMessage("advisory.learnings.staged-section-full", { count: existing.length, max: MAX_STAGED_ENTRIES }, overrides).message,
    );
  }
  const path = learningsPath(root);
  const lines = readFileSync(path, "utf8").split("\n");
  const promotedLineIdx = lines.findIndex((l) => l.startsWith("## Promoted"));
  if (promotedLineIdx === -1) {
    throw new Error(formatMessage("advisory.learnings.no-promoted-heading", {}, overrides).message);
  }
  // Insert just after the last non-blank line of the Staged section (the last
  // bullet, or the "## Staged" heading when the section is empty), preserving the
  // blank line(s) before "## Promoted".
  let i = promotedLineIdx - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  lines.splice(i + 1, 0, line);
  writeFileSync(path, lines.join("\n"));
  return { added: true, reason: "appended" };
}
