export const MESSAGES = {
  "gate.state-machine-acyclic.unguarded-cycle": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "unguarded cycle: {cycle}",
  },
  "gate.state-machine-acyclic.non-terminal-sink": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "non-terminal sink: {state} has no outgoing transitions",
  },
  "gate.state-machine-acyclic.unreachable-terminal": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "unreachable terminal: {state} cannot reach any terminal state",
  },
  "gate.state-machine-acyclic.usage": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Usage: node scripts/check-state-machine-acyclic.mjs <fixture.json>",
  },
  "gate.state-machine-acyclic.invalid": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "State machine invalid: {path}",
  },
};
