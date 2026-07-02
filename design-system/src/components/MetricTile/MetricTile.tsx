import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { HelpHint } from "../HelpHint/HelpHint";
import { Icon, type IconName } from "../Icon/Icon";

export type MetricTileTone = "neutral" | "ok" | "info" | "attention" | "blocked";

export interface MetricTileProps {
  /** Short eyebrow label describing the metric, e.g. "Queue depth". */
  label: string;
  /** The headline number or short string. Rendered large in Space Grotesk. */
  value: string | number;
  /** Unit suffix shown next to the value, e.g. "%", "items", "min". */
  unit?: string;
  /** Explanatory text for a HelpHint rendered next to the label. Omit to hide the hint. */
  hint?: string;
  /** Accent tone applied to the optional icon tile and value. Defaults to `neutral`. */
  tone?: MetricTileTone;
  /** Optional icon shown in a tinted square in the tile's corner. */
  icon?: IconName;
  /** Optional slot for a small trend indicator, typically a sparkline. */
  trend?: ReactNode;
  /** Secondary text under the value, e.g. "up 3 from yesterday". */
  sub?: string;
}

/**
 * A dashboard stat tile: an eyebrow label (with an optional HelpHint), a large value
 * with unit, and optional icon, trend slot, and sub text. This is the core building
 * block of the Overview screen's stat grid.
 */
export function MetricTile({ label, value, unit, hint, tone = "neutral", icon, trend, sub }: MetricTileProps) {
  return (
    <div className={cx("mdn-metrictile", `mdn-metrictile--${tone}`)}>
      <div className="mdn-metrictile__head">
        <span className="mdn-metrictile__label mdn-label">{label}</span>
        {hint ? <HelpHint label={hint} /> : null}
        {icon ? (
          <span className="mdn-metrictile__icon" aria-hidden="true">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
      </div>
      <div className="mdn-metrictile__body">
        <span className="mdn-metrictile__value">
          {value}
          {unit ? <span className="mdn-metrictile__unit">{unit}</span> : null}
        </span>
        {trend ? <span className="mdn-metrictile__trend">{trend}</span> : null}
      </div>
      {sub ? <span className="mdn-metrictile__sub">{sub}</span> : null}
    </div>
  );
}
