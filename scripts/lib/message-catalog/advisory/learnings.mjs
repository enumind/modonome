export const MESSAGES = {
  "advisory.learnings.unterminated-promoted-block": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "LEARNINGS.md: unterminated ```json block under ## Promoted",
  },
  "advisory.learnings.staged-format-invalid": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template:
      'appendStagedEntry: line does not match the staged format "- [YYYY-MM-DD] (signal: gate|review|incident|rework) lesson - evidence: ref": {line}',
  },
  "advisory.learnings.staged-section-full": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template:
      "LEARNINGS.md Staged section is full ({count}/{max}). Promote or prune an entry before adding a new one; entries are never auto-evicted.",
  },
  "advisory.learnings.no-promoted-heading": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "LEARNINGS.md: no ## Promoted heading found; cannot locate the Staged section end.",
  },
};
