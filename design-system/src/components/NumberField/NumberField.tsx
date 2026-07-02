import { useId } from "react";
import { cx } from "../../lib/cx";
import { HelpHint } from "../HelpHint/HelpHint";

export interface NumberFieldProps {
  /** Current numeric value. The field is a controlled component. */
  value: number;
  /** Called with the next value whenever it changes via typing, stepping, or clamping. */
  onValueChange: (value: number) => void;
  /** Lower bound. Values below this are clamped on change. */
  min?: number;
  /** Upper bound. Values above this are clamped on change. */
  max?: number;
  /** Amount added or removed per stepper click. Defaults to `1`. */
  step?: number;
  /** Short unit label rendered in mono after the value, e.g. `"min"` or `"USD/day"`. */
  unit?: string;
  /** Label text rendered above the control and tied to it via htmlFor/id. */
  label?: string;
  /** Short helper copy surfaced as a HelpHint next to the label. Omitted when falsy. */
  hint?: string;
  /** Validation or status message shown below the control in danger tone. */
  error?: string;
  /** Disables typing and both stepper buttons. */
  disabled?: boolean;
}

function clamp(n: number, min?: number, max?: number): number {
  let result = n;
  if (typeof min === "number") result = Math.max(min, result);
  if (typeof max === "number") result = Math.min(max, result);
  return result;
}

/**
 * A numeric field with decrement and increment stepper buttons and an optional
 * unit suffix. Used for caps and budget editors such as max open PRs, max diff
 * lines, lease minutes, and the remote model daily budget.
 */
export function NumberField({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  unit,
  label,
  hint,
  error,
  disabled,
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = generatedId;

  const commit = (next: number) => {
    if (Number.isNaN(next)) return;
    onValueChange(clamp(next, min, max));
  };

  const decrease = () => commit(value - step);
  const increase = () => commit(value + step);

  const atMin = typeof min === "number" && value <= min;
  const atMax = typeof max === "number" && value >= max;

  return (
    <div className={cx("mdn-number-field", disabled && "mdn-number-field--disabled")}>
      {label ? (
        <div className="mdn-number-field__label-row">
          <label className="mdn-label mdn-number-field__label" htmlFor={inputId}>
            {label}
          </label>
          {hint ? <HelpHint>{hint}</HelpHint> : null}
        </div>
      ) : null}
      <div className={cx("mdn-number", error && "mdn-number--error")}>
        <button
          type="button"
          className="mdn-number__step"
          onClick={decrease}
          disabled={disabled || atMin}
          aria-label="Decrease"
        >
          &minus;
        </button>
        <input
          id={inputId}
          className="mdn-number__control"
          type="number"
          inputMode="decimal"
          value={Number.isNaN(value) ? "" : value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            onValueChange(Number.isNaN(next) ? value : next);
          }}
          onBlur={(event) => commit(event.target.valueAsNumber)}
        />
        {unit ? (
          <span className="mdn-number__unit mdn-mono" aria-hidden="true">
            {unit}
          </span>
        ) : null}
        <button
          type="button"
          className="mdn-number__step"
          onClick={increase}
          disabled={disabled || atMax}
          aria-label="Increase"
        >
          +
        </button>
      </div>
      {error ? (
        <p className="mdn-number-field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
