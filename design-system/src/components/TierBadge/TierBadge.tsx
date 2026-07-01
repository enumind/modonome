import { cx } from "../../lib/cx";

export type Tier = 1 | 2 | 3 | 4;

export interface TierBadgeProps {
  /** Risk tier, 1 (lowest risk) through 4 (highest risk). */
  tier: Tier;
  /** Show the "Tier N" text label next to the swatch. Defaults to true. */
  showLabel?: boolean;
}

const TIER_TITLES: Record<Tier, string> = {
  1: "Tier 1: mechanical, no review required",
  2: "Tier 2: bounded change, checker review",
  3: "Tier 3: owner or frontier review required",
  4: "Tier 4: owner decision only",
};

/**
 * A small pill identifying a risk tier (1-4) by its dedicated tier color, with a
 * title tooltip summarizing what the tier permits. Used on work items, policies, and
 * anywhere a change's review requirement needs to be legible at a glance.
 */
export function TierBadge({ tier, showLabel = true }: TierBadgeProps) {
  return (
    <span className={cx("mdn-tierbadge", `mdn-tierbadge--${tier}`)} title={TIER_TITLES[tier]}>
      <span className="mdn-tierbadge__dot" aria-hidden="true" />
      {showLabel ? <span className="mdn-tierbadge__label">Tier {tier}</span> : <span className="mdn-sr-only">Tier {tier}</span>}
    </span>
  );
}
