export const MESSAGES = {
  "gate.self-application.gate-not-wired": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "ci.yml does not run the {name} gate ({needle}).",
  },
  "gate.self-application.not-base-pinned": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "ci.yml does not load {rel} from the base branch before running the gates (trust-isolation kernel).",
  },
  "gate.self-application.unsafe-default": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "templates/.modonome/config.yaml: {lever} should default to {want}, got {got}.",
  },
  "gate.self-application.codeowners-not-in-protected-paths": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'CODEOWNERS protects "{d}/" but protected_paths_extra does not list it.',
  },
  "gate.self-application.protected-path-not-in-codeowners": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'protected_paths_extra lists "{d}/" but CODEOWNERS does not protect it.',
  },
  "gate.self-application.committed-metrics-jsonl": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "A committed .modonome/metrics.jsonl ships activity as if it were real. Use metrics.example.jsonl for samples; let the engine write the live file at runtime.",
  },
  "gate.self-application.invalid-json-metrics": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: ".modonome/{f}:{line}: not valid JSON.",
  },
  "gate.self-application.runner-json-unparseable": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "agentproof/runner.mjs --json did not print parseable JSON.",
  },
  "gate.self-application.badge-score-mismatch": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '{rel} does not contain the current AgentProof score "{score}" (agentproof/runner.mjs --json is the source of truth).',
  },
  "gate.self-application.missing-snapshot-signature": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: ".modonome/snapshot/signature.json is missing. Run: node scripts/snapshot.mjs . (modonome must ship its own snapshot).",
  },
  "gate.self-application.agents-md-missing-snapshot-link": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "AGENTS.md does not point agents at .modonome/snapshot/map.md.",
  },
  "gate.self-application.hook-missing-snapshot-regen": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "scripts/install-hooks.mjs does not regenerate the snapshot in the pre-commit hook.",
  },
  "gate.self-application.ci-missing-snapshot-freshness": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "ci.yml does not run the snapshot freshness gate (snapshot.mjs . --check).",
  },
  "gate.self-application.snapshot-ci-mode-not-fail": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '.modonome/config.yaml: snapshot.ci_mode should be "fail" so modonome\'s own snapshot cannot go stale.',
  },
  "gate.self-application.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} self-application problem(s):\n",
  },
};
