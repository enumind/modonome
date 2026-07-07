export const MESSAGES = {
  "advisory.hygiene.pr-flag-invalid": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "--pr requires a positive integer PR number (got: {val}).",
  },
  "advisory.hygiene.fix-no-pr-support": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template:
      "hygiene fix does not support --pr: editing a PR body or comment via the API is a\nmutating, non-local operation and is out of scope. Use check or explain.",
  },
  "advisory.hygiene.pr-scan-failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Could not scan PR #{prNumber}: {error}",
  },
  "advisory.hygiene.explain-why": {
    category: "advisory",
    severity: "info",
    non_suppressible: false,
    template:
      "Why: these signatures put model or tool identity into the branch,\ncommit history, or review record. The author graph should reflect human\nownership; run `modonome hygiene fix` to apply the safe local remedy.",
  },
  "advisory.hygiene.unknown-subcommand": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Unknown hygiene subcommand: {sub}. Use check | explain | fix.",
  },
  "advisory.hygiene.branch-rename-failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "could not rename branch: {error}",
  },
};
