export const MESSAGES = {
  "gate.evidence-secrets.read-error": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "check-evidence-secrets: cannot read {file}: {reason}",
  },
  "gate.evidence-secrets.pattern-matched": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'FAIL: pattern "{pattern}" matched in {file}',
  },
};
