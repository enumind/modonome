// Shared parsing for the "## Staged" bullet lines in .modonome/LEARNINGS.md, so the
// reader (list) and the writer (prune) agree on exactly what a line means.
const STAGED_LINE_RE = /^- \[(\d{4}-\d{2}-\d{2})\]\s*\(signal:\s*([a-z]+)\)\s*(.+)$/;
const EVIDENCE_SEP = " - evidence: ";

export function parseStagedLine(line) {
  const m = STAGED_LINE_RE.exec(line.trim());
  if (!m) return null;
  const [, date, signal, rest] = m;
  const evidenceIdx = rest.lastIndexOf(EVIDENCE_SEP);
  const lesson = evidenceIdx >= 0 ? rest.slice(0, evidenceIdx) : rest;
  const evidence = evidenceIdx >= 0 ? rest.slice(evidenceIdx + EVIDENCE_SEP.length) : undefined;
  return { date, signal, lesson, evidence };
}
