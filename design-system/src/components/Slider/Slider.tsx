import { useId, type CSSProperties } from "react";
import { cx } from "../../lib/cx";
import { HelpHint } from "../HelpHint/HelpHint";

export interface SliderProps {
  /** Current numeric value. The control is fully controlled. */
  value: number;
  /** Called with the next value as the thumb moves. */
  onValueChange: (value: number) => void;
  /** Lower bound of the range. */
  min: number;
  /** Upper bound of the range. */
  max: number;
  /** Increment between reachable values. Defaults to `1`. */
  step?: number;
  /** Label text rendered above the control and tied to it via htmlFor/id. */
  label?: string;
  /** Short unit label rendered in mono after the current value, e.g. `"%"` or `"min"`. */
  unit?: string;
  /** Short helper copy surfaced as a HelpHint next to the label. Omitted when falsy. */
  hint?: string;
  /** Disables the control. */
  disabled?: boolean;
}

/**
 * A styled range input. Keeps the native `<input type="range">` for full
 * keyboard and assistive-tech support (arrow keys, Home/End, screen reader
 * value announcements) while the track and thumb pick up the panel's tokens.
 * The current value is echoed in mono next to the label.
 */
export function Slider({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  label,
  unit,
  hint,
  disabled,
}: SliderProps) {
  const generatedId = useId();
  const sliderId = generatedId;
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={cx("mdn-slider-field", disabled && "mdn-slider-field--disabled")}>
      {label || unit ? (
        <div className="mdn-slider-field__label-row">
          {label ? (
            <label className="mdn-label mdn-slider-field__label" htmlFor={sliderId}>
              {label}
            </label>
          ) : null}
          {hint ? <HelpHint>{hint}</HelpHint> : null}
          <span className="mdn-spacer" />
          <span className="mdn-slider-field__value mdn-mono" aria-hidden="true">
            {value}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      ) : null}
      <input
        id={sliderId}
        className="mdn-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ "--mdn-slider-fill": `${percent}%` } as CSSProperties}
        onChange={(event) => onValueChange(Number(event.target.value))}
      />
    </div>
  );
}
