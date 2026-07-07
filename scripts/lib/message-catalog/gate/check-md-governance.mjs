export const MESSAGES = {
  "gate.md-governance.root-not-allowed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[root-allowlist] {entry} is not permitted at the repository root. Move it under docs/ or add it to ROOT_ALLOW_LIST in scripts/check-md-governance.mjs.",
  },
  "gate.md-governance.protected-file-missing": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[protected-file] {p} is missing. This file is agent-critical and must exist at this path. If it was moved, update the manifest and every script that reads it.",
  },
  "gate.md-governance.broken-link": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '[link] {srcFile} links to "{rawTarget}" which does not resolve ({resolved}).',
  },
  "gate.md-governance.hardcoded-blob-url": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "[self-link] {file} hardcodes a github.com blob URL to an in-repo file.",
  },
  "gate.md-governance.adr-number-duplicate": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[adr-number] ADR-{num} is used by {count} files in docs/adr/: {names}. Renumber all but one to the next unused ADR-NNN.",
  },
  "gate.md-governance.adr-number-cross-directory": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[adr-number] ADR-{num} is used in both docs/adr/ ({adrFile}) and docs/research/ ({researchFile}). Research must use the RD-NNN prefix so numbers are never reused.",
  },
  "gate.md-governance.audit-naming-invalid": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "[audit-naming] docs/audits/{f} must match <type>-YYYY-MM-DD.md.",
  },
  "gate.md-governance.not-kebab-case": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "[naming] {file} is not lowercase-kebab-case.",
  },
  "gate.md-governance.missing-last-reviewed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[staleness] {relPath} is missing 'last_reviewed' front-matter. docs/compliance/ and docs/audits/ require it (see docs/guidelines/markdown-governance.md).",
  },
  "gate.md-governance.invalid-last-reviewed-date": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: '[staleness] {relPath}: last_reviewed "{lastReviewed}" is not a YYYY-MM-DD date.',
  },
  "gate.md-governance.stale-doc": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[staleness] {relPath}: last_reviewed is {lastReviewed}, but {count} commits have touched the paths it cites since then (threshold {threshold}). Re-verify the claims and bump last_reviewed, or the doc may describe behavior that has since changed.",
  },
  "gate.md-governance.canonical-topic-conflict": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      '[canonical] topic "{key}" is claimed by both {first} and {second}. A topic has exactly one active source of truth.',
  },
  "gate.md-governance.missing-front-matter-count": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "[front-matter] {count} doc(s) under docs/ have no front-matter. Add status/owner/last_reviewed per docs/guidelines/markdown-governance.md (advisory during migration).",
  },
  "gate.md-governance.docs-index-missing": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "[index] docs/README.md is missing.",
  },
  "gate.md-governance.docs-index-uncovered": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "[index] docs/{f} is not linked from docs/README.md.",
  },
  "gate.md-governance.warning-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "({count} advisory warning(s); not blocking.)",
  },
  "gate.md-governance.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nFAIL: {count} governance violation(s):\n",
  },
};
