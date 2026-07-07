// Governed Remediation (ADR-035) apply-path refusals. All non_suppressible:
// each guards the metadata-only rewrite's safety invariants (arming, branch
// protection, clean tree, usable identity, provable history boundary).
export const MESSAGES = {
  "agent-run.remediate.not-armed": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "remediate apply refused: the engine is not armed for this capability.",
  },
  "agent-run.remediate.plan-hint": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Run `remediate plan` to preview the rewrite without arming.",
  },
  "agent-run.remediate.refusing-branch": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "remediate apply refused: refusing to rewrite history on '{branch}'.",
  },
  "agent-run.remediate.dirty-tree": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "remediate apply refused: the working tree has tracked modifications. Commit or stash first.",
  },
  "agent-run.remediate.identity-invalid": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "remediate apply refused: target identity {name} <{email}> is empty or forbidden.",
  },
  "agent-run.remediate.identity-invalid-hint": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Set git user.name and user.email, or pass --name and --email.",
  },
  "agent-run.remediate.gather-range-error": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "remediate apply refused: {error}",
  },
  "agent-run.remediate.apply-failed": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "remediate apply failed: {error}",
  },
  "agent-run.remediate.unknown-subcommand": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Unknown remediate subcommand: {sub}. Use plan | apply.",
  },
};
