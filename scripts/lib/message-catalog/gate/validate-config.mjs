export const MESSAGES = {
  "gate.config.auto-merge-no-cap": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "auto_merge is on but max_merges_per_day is 0.",
  },
  "gate.config.auto-merge-no-distinct-maker-checker": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "auto_merge is on but require_distinct_maker_checker is not true.",
  },
  "gate.config.auto-merge-no-branch-protection": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "auto_merge is on but require_branch_protection is not true.",
  },
  "gate.config.autonomy-empty-allowlist": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "autonomy_enabled is on but trusted_author_allowlist is empty, which means no autonomous action.",
  },
  "gate.config.repo-network-unsafe-sharing": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "repo_network_enabled with share_raw_code_across_repos is unsafe by default.",
  },
  "gate.config.maker-checker-same-model": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'require_distinct_maker_checker_model is on but roles.maker and roles.checker both resolve to primary model "{model}".',
  },
  "gate.config.invalid": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Config invalid: {path}",
  },
};
