// Catalog entries for scripts/check-repo-hygiene.mjs.
export const MESSAGES = {
  "gate.repo-hygiene.safe-to-delete-file": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "File marked for deletion exists: {file}. Should either be deleted or moved back.",
  },
  "gate.repo-hygiene.unassigned-adr": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'ADR {file} is "Proposed" but has no Milestone assignment. Either accept+assign to milestone or move to research/.',
  },
  "gate.repo-hygiene.missing-queued-at": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "  warn: {file} has no queued_at field; using mtime (unreliable in CI).",
  },
  "gate.repo-hygiene.stale-work-item": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Work item {id} has been queued for >90 days. Archive it or move to active work.",
  },
  "gate.repo-hygiene.missing-milestone": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "ROADMAP references Milestone {num} but it's not defined.",
  },
  "gate.repo-hygiene.version-field-changed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "package.json version changed from {baseVersion} to {headVersion} without a chore(release): commit. Version bumps must go through scripts/release.mjs.",
  },
  "gate.repo-hygiene.insecure-randomness": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "scripts/{file} uses Math.random(). Use crypto.randomBytes() or crypto.randomUUID() instead (CodeQL js/insecure-randomness).",
  },
  "gate.repo-hygiene.model-identifier-branch": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: 'Branch "{branch}" leads with a model-identifier prefix. Rename it; agent identity must not appear in branch names, history, or pull requests.',
  },
  "gate.repo-hygiene.agent-commit-identity": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Commit {sha} carries an agent identity (author: {author}, committer: {committer}). Re-author with a human or project identity before merge.",
  },
  "gate.repo-hygiene.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "✗ Repo hygiene check FAILED. {count} issue(s) found:\n",
  },
  "gate.repo-hygiene.fail-footer": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Fix these before shipping. Loose ends kill credibility over time.",
  },
};
