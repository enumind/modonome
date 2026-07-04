// Only the gate-graph-cycle failure is catalogued here: runPipeline()'s
// per-gate `reason` strings are a JSON data contract other tooling parses by
// exact text (agentproof, CI log scraping), not a human-facing notification,
// so they stay out of scope for operator wording overrides.
export const MESSAGES = {
  "gate.gate-pipeline.cyclic-graph": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{error}",
  },
};
