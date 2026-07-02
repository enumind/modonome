import { useId } from "react";
import { cx } from "../../lib/cx";
import { Icon } from "../Icon/Icon";
import { HelpHint } from "../HelpHint/HelpHint";

export interface SelectOption {
  /** The value submitted and passed to `onValueChange`. */
  value: string;
  /** Human-readable text shown in the list and when selected. */
  label: string;
}

export interface SelectProps {
  /** The list of choices, in display order. */
  options: SelectOption[];
  /** Currently selected option value. The control is fully controlled. */
  value: string;
  /** Called with the new value whenever the user picks a different option. */
  onValueChange: (value: string) => void;
  /** Label text rendered above the control and tied to it via htmlFor/id. */
  label?: string;
  /** Short helper copy surfaced as a HelpHint next to the label. Omitted when falsy. */
  hint?: string;
  /** Validation or status message shown below the control in danger tone. */
  error?: string;
  /** Disables the control. */
  disabled?: boolean;
}

/**
 * A styled native `<select>` with a custom chevron. Keeps the real `<select>`
 * element for full assistive-tech and keyboard support while matching the dark
 * surface treatment of the other form controls.
 */
export function Select({
  options,
  value,
  onValueChange,
  label,
  hint,
  error,
  disabled,
}: SelectProps) {
  const generatedId = useId();
  const selectId = generatedId;

  return (
    <div className={cx("mdn-select-field", disabled && "mdn-select-field--disabled")}>
      {label ? (
        <div className="mdn-select-field__label-row">
          <label className="mdn-label mdn-select-field__label" htmlFor={selectId}>
            {label}
          </label>
          {hint ? <HelpHint>{hint}</HelpHint> : null}
        </div>
      ) : null}
      <div className={cx("mdn-select", error && "mdn-select--error")}>
        <select
          id={selectId}
          className="mdn-select__control"
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          onChange={(event) => onValueChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon className="mdn-select__chevron" name="chevron-down" size={14} />
      </div>
      {error ? (
        <p className="mdn-select-field__error" id={`${selectId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
