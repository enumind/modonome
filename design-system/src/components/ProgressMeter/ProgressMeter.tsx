import { useId } from "react";
import { cx } from "../../lib/cx";

export type ProgressMeterTone = "primary" | "info" | "owner" | "danger";

export interface ProgressMeterProps {
  /** Current amount. Clamped into `[0, max]` before rendering. */
  value: number;
  /** Maximum amount the meter represents. Defaults to 100. */
  max?: number;
  /** Label shown above the track, e.g. "Budget consumed". */
  label?: string;
  /** Unit suffix appended to the value/max readout, e.g. "credits" or "%". */
  unit?: string;
  /** Semantic tone for the filled bar. Defaults to `primary`. */
  tone?: ProgressMeterTone;
  /** Show the numeric `value / max` readout next to the label. Defaults to true. */
  showValue?: boolean;
}

/**
 * A horizontal meter for bounded quantities such as budget consumed or checker
 * coverage. Renders a label row (with a mono value/max readout) above a track,
 * with a filled bar sized to the current value. Exposes `role="progressbar"` with
 * `aria-valuenow`/`aria-valuemin`/`aria-valuemax` so assistive tech reports progress.
 */
export function ProgressMeter({
  value,
  max = 100,
  label,
  unit,
  tone = "primary",
  showValue = true,
}: ProgressMeterProps) {
  const id = useId();
  const safeMax = max > 0 ? max : 0;
  const clamped = safeMax > 0 ? Math.min(Math.max(value, 0), safeMax) : 0;
  const pct = safeMax > 0 ? (clamped / safeMax) * 100 : 0;
  const labelId = label ? `${id}-label` : undefined;

  return (
    <div className="mdn-progressmeter">
      {label || showValue ? (
        <div className="mdn-progressmeter__row">
          {label ? (
            <span id={labelId} className="mdn-progressmeter__label mdn-label">
              {label}
            </span>
          ) : null}
          {showValue ? (
            <span className="mdn-progressmeter__value mdn-mono">
              {formatNumber(clamped)} / {formatNumber(safeMax)}
              {unit ? ` ${unit}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className="mdn-progressmeter__track"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-labelledby={labelId}
      >
        <div
          className={cx("mdn-progressmeter__fill", `mdn-progressmeter__fill--${tone}`)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
