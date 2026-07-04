// Agent run-cycle (WS-B) planning and execution failures. All non_suppressible:
// each represents a separation-of-duties, budget, or turn-cap guarantee, not
// an advisory notice.
export const MESSAGES = {
  "agent-run.run-cycle.target-required": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "run-cycle: --target is required (for example examples/demo-app).",
  },
  "agent-run.run-cycle.maker-checker-same-model": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "maker and checker resolve to the same model ({model}); distinct models are required.",
  },
  "agent-run.run-cycle.model-not-registered": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: '{role} model "{model}" is not in the models registry; pin it in .modonome/config.yaml.',
  },
  "agent-run.run-cycle.max-turns-not-positive": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "max-turns must be a positive integer.",
  },
  "agent-run.run-cycle.max-turns-exceeds-cap": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "max-turns {maxTurns} exceeds the hard cap {cap}.",
  },
  "agent-run.run-cycle.budget-zero": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "A hosted model is selected but remote_model_budget_usd_per_day is 0. Raise the budget or select a local model.",
  },
  "agent-run.run-cycle.session-exit-nonzero": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "{role} session exited with status {status}. See {transcriptDir}/{role}.txt.",
  },
  "agent-run.run-cycle.failed": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "run-cycle failed: {error}",
  },
};
