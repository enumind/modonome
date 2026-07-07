export const MESSAGES = {
  "gate.decisions-authority.disallowed-heading": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      '.modonome/DECISIONS.md:{lineNo}: heading "## {title}" is not permitted. Only "## Resolved" and "## Open" are allowed; approval-bearing prose outside those two sections cannot be added this way.',
  },
  "gate.decisions-authority.missing-keys": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '.modonome/DECISIONS.md:{lineNo}: Resolved entry "{id}" is missing required key(s): {missing}.',
  },
  "gate.decisions-authority.github-api-error": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "GitHub API {status} fetching PR #{prNumber} reviews",
  },
  "gate.decisions-authority.no-pr-context": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      ".modonome/DECISIONS.md: {count} new Resolved {entryWord} ({ids}) added, but no PR context (repo/PR number/token) is available to verify who approved {pronoun}. Run this check in CI on the pull request.",
  },
  "gate.decisions-authority.no-codeowners": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "No CODEOWNERS file found; cannot verify Resolved-entry authorship.",
  },
  "gate.decisions-authority.fetch-reviews-failed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: ".modonome/DECISIONS.md: could not fetch PR #{prNumber} reviews: {reason}",
  },
  "gate.decisions-authority.no-eligible-approval": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      ".modonome/DECISIONS.md: new Resolved {entryWord} ({ids}) needs an APPROVED review from a CODEOWNERS-listed account other than the PR author ({author}). Self-approval does not count.",
  },
  "gate.decisions-authority.fail-header": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Decisions-authority gate rejected this change:\n",
  },
  "gate.decisions-authority.fail-footer": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "\nDECISIONS.md records real decisions with real authority behind them. Approval-bearing content cannot be added outside that process.",
  },
};
