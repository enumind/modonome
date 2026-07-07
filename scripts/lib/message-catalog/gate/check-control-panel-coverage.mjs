export const MESSAGES = {
  "gate.control-panel-coverage.missing-intro-1": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nThe following config.schema.json field(s) have no reference in any control-panel",
  },
  "gate.control-panel-coverage.missing-intro-2": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "screen and no entry in apps/control-panel/exposure.json explaining why:\n",
  },
  "gate.control-panel-coverage.missing-field": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "  - {field}",
  },
  "gate.control-panel-coverage.missing-footer": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nEither wire it into a screen, or add it to exposure.json with a real reason.",
  },
};
