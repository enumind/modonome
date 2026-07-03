// Builds the read-only remediation view-model for the panel. Pure: it takes already
// read config, the environment arming bit, and the branch commits, and returns the
// RemediationVM shape (see src/state/types.ts). The heavy lifting is the shared, tokenless
// planner in scripts/lib/remediate.mjs, which is dependency-free, so this module and its
// test run under plain `node --test` without the frontend toolchain.
//
// This surfaces the ADR-035 capability; it never applies anything. Apply stays a CLI
// action (`modonome remediate apply`) gated by the authoritative MODONOME_ARMED env var,
// which the panel can only report, never set.
import { planCommitRewrites, remediationFingerprint } from "../../../scripts/lib/remediate.mjs";

export function buildRemediationView({ config = {}, envArmed = false, commits = [], identity = { name: "", email: "" } } = {}) {
  const applyEnabled = config.remediation_apply_enabled === true;

  // The same predicate the CLI enforces (ADR-004 + ADR-024): config opt-in AND the
  // authoritative environment arming bit. Named blockers so the panel shows what is missing.
  const blockers = [];
  if (config.autonomy_enabled !== true) blockers.push("autonomy_enabled is off");
  // dry_run defaults to on (the safe posture) unless explicitly false, matching the
  // reader's normalization, so a missing value blocks apply rather than passing silently.
  if (config.dry_run !== false) blockers.push("dry_run is on");
  if (!applyEnabled) blockers.push("remediation_apply_enabled is off");
  if (!envArmed) blockers.push("MODONOME_ARMED is not set in the environment");

  const plan = { branch: null, commits: planCommitRewrites(commits, identity) };
  const changed = plan.commits.filter((c) => c.changed);

  return {
    applyEnabled,
    ready: blockers.length === 0,
    blockers,
    proposalCount: changed.length,
    proposals: changed.map((c) => ({ sha: c.sha, reasons: c.reasons })),
    fingerprint: remediationFingerprint(plan),
  };
}
