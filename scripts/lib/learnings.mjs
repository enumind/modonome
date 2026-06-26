// Shared reader for the promoted-learnings block in .modonome/LEARNINGS.md.
// Promoted learnings live in a single fenced ```json array so they stay both
// human-readable and machine-auditable (ADR-026).
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

// Extract the first fenced json block that appears after the "## Promoted" heading.
export function readPromotedLearnings(root) {
  const text = readFileSync(join(root, ".modonome", "LEARNINGS.md"), "utf8");
  const promotedIdx = text.indexOf("## Promoted");
  if (promotedIdx === -1) return [];
  const fenceStart = text.indexOf("```json", promotedIdx);
  if (fenceStart === -1) return [];
  const bodyStart = fenceStart + "```json".length;
  const fenceEnd = text.indexOf("```", bodyStart);
  if (fenceEnd === -1) throw new Error("LEARNINGS.md: unterminated ```json block under ## Promoted");
  return JSON.parse(text.slice(bodyStart, fenceEnd));
}
