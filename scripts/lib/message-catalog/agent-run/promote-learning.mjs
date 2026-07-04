export const MESSAGES = {
  "agent-run.promote-learning.missing-lesson": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "buildLearningRecord: missing required option 'lesson'",
  },
  "agent-run.promote-learning.missing-evidence-summary": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "buildLearningRecord: missing required option 'evidenceSummary'",
  },
  "agent-run.promote-learning.missing-required-field": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "missing or empty required field: {field}",
  },
  "agent-run.promote-learning.invalid-gate-location": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: 'gate_location "{path}" must be under scripts/, tests/, or .github/',
  },
  "agent-run.promote-learning.write-not-implemented": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "error: --write flag not yet implemented",
  },
  "agent-run.promote-learning.validation-errors-header": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "validation errors:",
  },
};
