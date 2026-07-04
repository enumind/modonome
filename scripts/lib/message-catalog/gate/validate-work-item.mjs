// WI-020's original pain point: these governance-error messages, surfaced by
// scripts/check-work-items.mjs in CI, are now catalog entries so an operator
// can retune their wording without a code change.
export const MESSAGES = {
  "gate.work-item.maker-id-required": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "maker_id is required when state is {state}. Set maker_id before advancing the item.",
  },
  "gate.work-item.checker-id-required": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "checker_id is required when state is {state}. Set checker_id before advancing the item.",
  },
  "gate.work-item.maker-checker-same-identity": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "maker_id and checker_id are the same identity ({id}). Maker cannot review their own work.",
  },
  "gate.work-item.maker-checker-same-model": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "maker_model and checker_model are the same model ({model}). Distinct models are required.",
  },
  "gate.work-item.maker-checker-same-family": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "maker_model ({makerModel}) and checker_model ({checkerModel}) belong to the same model family/architecture ({family}). Distinct families are required so maker and checker do not share architecture-level blind spots.",
  },
  "gate.work-item.protected-path-not-escalated": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      "Item touches a protected path but has no escalation_reason and is in state merge_ready. Protected-path items must be escalated for owner review.",
  },
  "gate.work-item.escalated-without-reason": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Item is in state escalated but has no escalation_reason. Record why the item was escalated.",
  },
  "gate.work-item.attempts-exceed-cap": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "attempts ({attempts}) exceeds max_attempts ({maxAttempts}). Item should be escalated.",
  },
  "gate.work-item.invalid": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "Work item invalid: {path}",
  },
};
