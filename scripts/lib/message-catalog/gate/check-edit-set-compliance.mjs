// Catalog entries for scripts/check-edit-set-compliance.mjs.
export const MESSAGES = {
  "gate.edit-set-compliance.violations-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} file(s) modified outside allowed_edit_set:",
  },
  "gate.edit-set-compliance.violation-item": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "  - {file}",
  },
  "gate.edit-set-compliance.allowed-paths": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Allowed paths: {paths}",
  },
};
