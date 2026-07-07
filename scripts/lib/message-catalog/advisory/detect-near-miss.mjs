export const MESSAGES = {
  "advisory.near-miss.findings-summary": {
    category: "advisory",
    severity: "attention",
    non_suppressible: false,
    template:
      "Found {count} near-miss attribution token(s). These are PROPOSALS\nfor human review, not blocking findings. Promotion into the deterministic\ndenylist stays human-only and must pass the corpus and regex-safety gates.\n",
  },
  "advisory.near-miss.finding-line": {
    category: "advisory",
    severity: "attention",
    non_suppressible: false,
    template: '  [tier {tier} {surface}] token "{token}"  ({where})',
  },
  "advisory.near-miss.staged-proposal-line": {
    category: "advisory",
    severity: "attention",
    non_suppressible: false,
    template: "    staged proposal: {line}",
  },
  "advisory.near-miss.write-failed": {
    category: "advisory",
    severity: "attention",
    non_suppressible: false,
    template: "\nCould not write proposal: {reason}",
  },
};
