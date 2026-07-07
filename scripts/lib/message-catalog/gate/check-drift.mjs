// Catalog entries for scripts/check-drift.mjs.
export const MESSAGES = {
  "gate.drift.missing-levers": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{name} is missing levers: {levers}",
  },
  "gate.drift.unexpected-levers": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{name} has unexpected levers: {levers}",
  },
  "gate.drift.prompt-bundle-stale": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "prompt bundle is out of date. Run: node scripts/build-prompt.mjs --write",
  },
  "gate.drift.fail-header": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Drift guard found problems:\n",
  },
};
