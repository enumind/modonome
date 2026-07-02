/**
 * Typed mirror of the design tokens for code that needs values in JS (charts,
 * status-to-color maps). The CSS custom properties in tokens.css are the source of
 * truth for styling; this module exists so component logic can reference the same
 * palette without hard-coding hex strings at call sites.
 */

export const armingModes = ["disabled", "dry-run", "armed"] as const;
export type ArmingMode = (typeof armingModes)[number];

export const workStates = [
  "queued",
  "claimed",
  "making",
  "checking",
  "rework",
  "merge_ready",
  "merging",
  "done",
  "escalated",
] as const;
export type WorkState = (typeof workStates)[number];

export const riskTiers = [1, 2, 3, 4] as const;
export type RiskTier = (typeof riskTiers)[number];

/** CSS custom-property name for an arming mode color. */
export function modeVar(mode: ArmingMode): string {
  const key = mode === "dry-run" ? "dryrun" : mode;
  return `var(--mdn-mode-${key})`;
}

/** CSS custom-property name for a work-item state color. */
export function stateVar(state: WorkState): string {
  return `var(--mdn-state-${state})`;
}

/** CSS custom-property name for a risk-tier color. */
export function tierVar(tier: RiskTier): string {
  return `var(--mdn-tier-${tier})`;
}

/** Human labels for the work states, in flow order. */
export const workStateLabels: Record<WorkState, string> = {
  queued: "Queued",
  claimed: "Claimed",
  making: "Making",
  checking: "Checking",
  rework: "Rework",
  merge_ready: "Merge ready",
  merging: "Merging",
  done: "Done",
  escalated: "Escalated",
};

export const tokens = {
  primary: "var(--mdn-primary)",
  info: "var(--mdn-info)",
  owner: "var(--mdn-owner)",
  danger: "var(--mdn-danger)",
  heading: "var(--mdn-heading)",
  text: "var(--mdn-text)",
  muted: "var(--mdn-muted)",
} as const;
