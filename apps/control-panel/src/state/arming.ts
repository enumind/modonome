/**
 * Derive the arming mode and the armed-mode gate checklist from durable config plus
 * the two runtime facts the panel cannot read from config alone: whether the
 * MODONOME_ARMED CI secret is set, and whether any protected path is touched without
 * approval. The checklist mirrors the "Single merge authority" contract in
 * prompts/modules/roles.md: every item must hold before autonomous merge is allowed.
 */
import type {
  ArmingStatus,
  ArmingMode,
  ModonomeConfig,
  GateVM,
  ProtectedPathVM,
} from "./types";

export function deriveMode(config: ModonomeConfig, envArmed: boolean): ArmingMode {
  if (!config.autonomy_enabled) return "disabled";
  if (envArmed && !config.dry_run && config.auto_merge) return "armed";
  return "dry-run";
}

export function deriveArming(
  config: ModonomeConfig,
  envArmed: boolean,
  gates: GateVM[],
  protectedPaths: ProtectedPathVM[],
): ArmingStatus {
  const requiredGatesGreen = gates.filter((g) => g.required).every((g) => g.status === "pass");
  const unapprovedProtected = protectedPaths.filter((p) => p.approvalNeeded && !p.approver);
  const usesRemote = !config.local_model_only_by_default;

  const checklist = [
    {
      label: "Autonomy enabled",
      ok: config.autonomy_enabled,
      reason: config.autonomy_enabled ? "Owner opted in via config." : "autonomy_enabled is false.",
    },
    {
      label: "Dry-run off",
      ok: !config.dry_run,
      reason: config.dry_run ? "Engine is in dry-run; it proposes but does not merge." : "Writes are enabled.",
    },
    {
      label: "Auto-merge on",
      ok: config.auto_merge,
      reason: config.auto_merge ? "Eligible changes may merge after gates pass." : "auto_merge is false.",
    },
    {
      label: "MODONOME_ARMED set in CI",
      ok: envArmed,
      reason: envArmed
        ? "The CI arming secret is present."
        : "Set MODONOME_ARMED=true in CI secrets. Config alone cannot arm the engine.",
      ownerOnly: true,
    },
    {
      label: "Branch protection required",
      ok: config.require_branch_protection,
      reason: config.require_branch_protection
        ? "The target branch must have protection."
        : "Branch protection is not required.",
    },
    {
      label: "Required CI gates green",
      ok: requiredGatesGreen,
      reason: requiredGatesGreen ? "All required checks pass." : "One or more required gates are not passing.",
    },
    {
      label: "No unapproved protected paths",
      ok: unapprovedProtected.length === 0,
      reason:
        unapprovedProtected.length === 0
          ? "No protected path is touched without approval."
          : `${unapprovedProtected.length} protected path(s) await owner approval.`,
    },
    {
      label: "Daily merge cap above zero",
      ok: config.max_merges_per_day > 0,
      reason:
        config.max_merges_per_day > 0
          ? `Up to ${config.max_merges_per_day} merge(s) per day.`
          : "max_merges_per_day is 0; no merges are allowed.",
    },
    {
      label: "Remote budget set when using remote models",
      ok: !usesRemote || config.remote_model_budget_usd_per_day > 0,
      reason: !usesRemote
        ? "Local-only by default; no remote spend."
        : config.remote_model_budget_usd_per_day > 0
          ? `Remote budget is ${config.remote_model_budget_usd_per_day} USD per day.`
          : "Remote models are enabled but the daily budget is 0.",
    },
    {
      label: "Distinct maker and checker",
      ok: config.require_distinct_maker_checker,
      reason: config.require_distinct_maker_checker
        ? "Maker and checker must be different identities."
        : "Distinct maker and checker is not enforced.",
    },
    {
      label: "Distinct maker and checker model",
      ok: config.require_distinct_maker_checker_model,
      reason: config.require_distinct_maker_checker_model
        ? "Maker and checker must run different model families."
        : "Distinct model families are not enforced.",
    },
    {
      label: "Trusted author allowlist set",
      ok: config.trusted_author_allowlist.length > 0,
      reason:
        config.trusted_author_allowlist.length > 0
          ? `${config.trusted_author_allowlist.length} trusted author(s).`
          : "No trusted authors; every change parks for owner review.",
    },
  ];

  return { mode: deriveMode(config, envArmed), envArmed, checklist };
}
