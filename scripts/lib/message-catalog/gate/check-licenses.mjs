export const MESSAGES = {
  "gate.licenses.runtime-deps-declared": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "package.json declares runtime dependencies ({depNames}). The published package must stay at zero runtime dependencies; move these behind an adapter boundary.",
  },
  "gate.licenses.manifest-missing-adapters-array": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'adapters.json must have an "adapters" array (or be a top-level array).',
  },
  "gate.licenses.missing-license": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{label}: missing license.",
  },
  "gate.licenses.refused-license": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '{label}: license "{license}" is copyleft or source-available and is refused.',
  },
  "gate.licenses.apache-missing-adr": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '{label}: Apache-2.0 is allowed only with a truthy "adr" owner note. Add an adr reference.',
  },
  "gate.licenses.not-on-allowlist": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      '{label}: license "{license}" is not on the permissive allowlist (MIT, ISC, BSD-2/3-Clause; Apache-2.0 with an adr note).',
  },
  "gate.licenses.missing-boundary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "{label}: missing boundary.",
  },
  "gate.licenses.boundary-not-permitted": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '{label}: boundary "{boundary}" is not permitted (use process, sidecar, or ci-native).',
  },
  "gate.licenses.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} license/adapter problem(s):\n",
  },
};
