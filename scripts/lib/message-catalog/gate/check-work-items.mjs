export const MESSAGES = {
  "gate.work-items.invalid-json": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{file}: not valid JSON ({reason}).",
  },
  "gate.work-items.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} work item problem(s):\n",
  },
};
