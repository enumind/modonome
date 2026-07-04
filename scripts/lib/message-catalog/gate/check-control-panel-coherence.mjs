export const MESSAGES = {
  "gate.control-panel-coherence.violations-header": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Control-panel coherence violation(s):\n",
  },
  "gate.control-panel-coherence.violations-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\n{count} violation(s). See scripts/lib/control-panel-audit.mjs for the budget.",
  },
};
