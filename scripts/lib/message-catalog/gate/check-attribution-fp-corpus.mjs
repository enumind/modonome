export const MESSAGES = {
  "gate.attribution-fp-corpus.strict-flags-safe-branch": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'strict detector flags safe branch "{name}".',
  },
  "gate.attribution-fp-corpus.fuzzy-flags-safe-branch": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'near-miss widener flags safe branch "{name}".',
  },
  "gate.attribution-fp-corpus.strict-flags-safe-identity": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'strict detector flags safe identity "{who}".',
  },
  "gate.attribution-fp-corpus.fuzzy-flags-safe-identity": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'near-miss widener flags safe identity "{who}".',
  },
  "gate.attribution-fp-corpus.strict-flags-safe-text": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'strict detector flags safe text: "{snippet}".',
  },
  "gate.attribution-fp-corpus.fuzzy-flags-safe-text": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'near-miss widener flags safe text: "{snippet}".',
  },
  "gate.attribution-fp-corpus.documented-overblock-unflagged": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      'documented over-block "{branch}" is no longer flagged by the strict detector. This known trade-off changed ({reason}). Update the corpus deliberately if intended.',
  },
  "gate.attribution-fp-corpus.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} false-positive regression(s):\n",
  },
  "gate.attribution-fp-corpus.fail-footer": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nA promotion must not flag legitimate input. Narrow the pattern or add an allowlist entry.",
  },
};
