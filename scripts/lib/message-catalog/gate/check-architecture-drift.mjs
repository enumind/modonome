export const MESSAGES = {
  "gate.architecture-drift.unmentioned-script": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[unmentioned-script] {name} exists but is not mentioned anywhere in ARCHITECTURE.md. A new file here is a new execution surface or a new agent-loop component; document it.",
  },
  "gate.architecture-drift.stale-reference": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "[stale-reference] ARCHITECTURE.md cites `{path}`, which does not exist. Update or remove the reference.",
  },
  "gate.architecture-drift.no-agent-loop-section": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '[agent-loop-section] ARCHITECTURE.md has no "## The agent loop" section to check states against.',
  },
  "gate.architecture-drift.unmentioned-state": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      '[unmentioned-state] work-item state "{state}" (schemas/work-item.schema.json) is not named in ARCHITECTURE.md\'s "## The agent loop" section.',
  },
  "gate.architecture-drift.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{count} problem(s). ARCHITECTURE.md is the highest-traffic explanation of the system; keep it current.",
  },
};
