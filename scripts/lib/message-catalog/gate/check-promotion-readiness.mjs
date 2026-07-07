export const MESSAGES = {
  "gate.promotion-readiness.missing-adr": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{name}: {flag} is default-on but no promotion ADR (with observation window, evidence, rollback) was found.",
  },
  "gate.promotion-readiness.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} promotion problem(s):\n",
  },
};
