export const MESSAGES = {
  "gate.trust-boundary.not-executed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{gate} is never executed in the workflow (nothing to guard, or the gate was removed).",
  },
  "gate.trust-boundary.missing-guard": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '{gate} runs without a base-branch checkout guard. Add a step that runs: git checkout "origin/${{ github.base_ref }}" -- {gate}',
  },
  "gate.trust-boundary.guard-after-run": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{gate} is executed (line {runLine}) before it is loaded from the base branch (line {guardLine}). The guard must come first.",
  },
  "gate.trust-boundary.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} unguarded gate(s):\n",
  },
};
