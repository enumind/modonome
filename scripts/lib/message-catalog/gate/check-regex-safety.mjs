export const MESSAGES = {
  "gate.regex-safety.import-failed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}: could not import to inspect exported regexes: {reason}",
  },
  "gate.regex-safety.catastrophic-backtracking": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file} ({label}): nested-quantifier ReDoS risk near {hit}",
  },
  "gate.regex-safety.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} regex-safety problem(s):\n",
  },
  "gate.regex-safety.fail-footer": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nRewrite the pattern without a nested quantifier before promotion.",
  },
};
