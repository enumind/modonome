// Catalog entries for scripts/risk-surface-guard.mjs (ADR-047). Covers only the CLI's
// own status, summary, and usage-error strings, per ADR-047 decision 7: a finding's
// reason, reviewer_guidance, and limitation text is authored content that belongs to
// the rule that produced it, defined directly in scripts/lib/risk-surface-rules.mjs,
// not routed through this catalog.
export const MESSAGES = {
  "gate.risk-surface-guard.usage-error": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "usage: risk-surface-guard.mjs <base-ref> [--mode warn|fail] [--sarif] [--json] [--allowlist <file>], or --diff <file>, or --staged",
  },
  "gate.risk-surface-guard.unsafe-ref": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "refusing to diff against unsafe ref: {ref}",
  },
  "gate.risk-surface-guard.invalid-mode": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "invalid --mode value: {value} (expected warn or fail)",
  },
  "gate.risk-surface-guard.diff-failed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "git diff {base}...HEAD failed",
  },
  "gate.risk-surface-guard.staged-diff-failed": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "git diff --cached failed",
  },
  "gate.risk-surface-guard.internal-error": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "internal error: {message}",
  },
  "gate.risk-surface-guard.pass-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "PASS: no risk-surface findings.",
  },
  "gate.risk-surface-guard.warn-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "WARN: {count} risk-surface finding(s). Mode is warn, so this does not block.",
  },
  "gate.risk-surface-guard.fail-block-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} risk-surface finding(s), including a high or critical severity match. Mode is fail.",
  },
  "gate.risk-surface-guard.fail-mode-below-threshold-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "WARN: {count} risk-surface finding(s), none high or critical. Mode is fail but the threshold was not reached.",
  },
  "gate.risk-surface-guard.allowlist-invalid": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "WARN: .modonome/risk-surface-allowlist.json is invalid ({count} error(s)); continuing with zero suppressions applied.",
  },
};
