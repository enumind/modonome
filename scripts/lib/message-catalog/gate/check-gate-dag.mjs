export const MESSAGES = {
  "gate.gate-dag.dangling-edge": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "dangling edge: {gate} -> {dep} ({dep} is not a declared gate)",
  },
  "gate.gate-dag.cycle-detected": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "cycle detected: {cycle}",
  },
  "gate.gate-dag.forbidden-import": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{entry} can reach {forbiddenFile} through its import graph. A deterministic detector must never import {why}.",
  },
  "gate.gate-dag.invalid-header": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Gate graph invalid: {path}",
  },
  "gate.gate-dag.boundary-violated-header": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Determinism boundary violated:",
  },
};
