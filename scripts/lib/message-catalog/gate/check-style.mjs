// Catalog entries for scripts/check-style.mjs.
export const MESSAGES = {
  "gate.style.em-dash": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}:{line}: em dash. Use a period, comma, colon, or parentheses.",
  },
  "gate.style.not-just": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}:{line}: phrase: not just. State the point directly.",
  },
  "gate.style.not-only": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}:{line}: phrase: not only. State the point directly.",
  },
  "gate.style.it-is-not-x-it-is-y": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}:{line}: phrase: it is not X it is Y. Say what it is.",
  },
  "gate.style.ai-signature": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}:{line}: AI signature. Remove AI authorship signatures.",
  },
  "gate.style.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nStyle check failed with {count} issue(s).",
  },
};
