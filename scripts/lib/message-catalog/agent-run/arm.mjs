// Arming-precondition failures. All non_suppressible: arming waives real
// separation-of-duties guarantees, so an operator can retune wording but not
// silence or downgrade a failed precondition.
export const MESSAGES = {
  "agent-run.arm.no-config": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "No config found at {path}. Run `npx modonome scaffold {target} --write` first.",
  },
  "agent-run.arm.config-parse-error": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Config at {path} does not parse: {error}",
  },
  "agent-run.arm.models-not-set": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "roles.maker.model and roles.checker.model must both be set.",
  },
  "agent-run.arm.models-identical": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: 'maker and checker use the identical model "{model}".',
  },
  "agent-run.arm.models-same-family": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: 'maker ("{makerModel}") and checker ("{checkerModel}") are the same model family ({family}).',
  },
  "agent-run.arm.codeowners-missing": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "protected_paths_extra lists {count} path(s) but no CODEOWNERS file exists at {path}.",
  },
  "agent-run.arm.codeowners-incomplete": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "CODEOWNERS does not protect: {missing} (listed in protected_paths_extra).",
  },
  "agent-run.arm.safety-flag-disabled": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "{key} is set to false.",
  },
  "agent-run.arm.refused": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Arming refused: fix the failed check(s) above, then re-run `npx modonome arm`.",
  },
};
