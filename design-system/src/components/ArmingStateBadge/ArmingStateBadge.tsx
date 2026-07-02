import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";
import type { ArmingMode } from "../../tokens/tokens";

export interface ArmingStateBadgeProps {
  /** The engine's effective arming mode. */
  mode: ArmingMode;
  /** Whether the MODONOME_ARMED CI secret is present. Shown as a sub-line. */
  envArmed?: boolean;
  /** Visual scale. Defaults to `md`. */
  size?: "sm" | "md" | "lg";
}

const MODE_META: Record<ArmingMode, { label: string; icon: IconName; blurb: string }> = {
  disabled: { label: "Disabled", icon: "power", blurb: "Engine offline. No proposals." },
  "dry-run": { label: "Dry-run", icon: "play", blurb: "Proposes changes. Writes nothing." },
  armed: { label: "Armed", icon: "shield", blurb: "May open and merge changes once gates pass." },
};

/**
 * The single most important status in the panel: which of the three activation-ladder
 * rungs the engine is on right now. Disabled is gray, dry-run is CI blue, armed is
 * teal. The mode label always renders, so the state never rests on color alone, and
 * the armed state carries a subtle pulse to signal that the engine can write.
 */
export function ArmingStateBadge({ mode, envArmed, size = "md" }: ArmingStateBadgeProps) {
  const meta = MODE_META[mode];
  return (
    <div
      className={cx("mdn-arming", `mdn-arming--${mode}`, `mdn-arming--${size}`)}
      role="status"
      aria-label={`Arming mode: ${meta.label}`}
    >
      <span className="mdn-arming__dot" aria-hidden="true">
        <Icon name={meta.icon} size={size === "lg" ? 20 : size === "sm" ? 14 : 16} />
      </span>
      <span className="mdn-arming__text">
        <span className="mdn-arming__label">{meta.label}</span>
        {size !== "sm" ? <span className="mdn-arming__blurb">{meta.blurb}</span> : null}
      </span>
      {envArmed !== undefined && size === "lg" ? (
        <span className={cx("mdn-arming__env", envArmed && "is-on")}>
          {envArmed ? "MODONOME_ARMED set" : "MODONOME_ARMED not set"}
        </span>
      ) : null}
    </div>
  );
}
