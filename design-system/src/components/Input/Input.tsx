import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";
import { HelpHint } from "../HelpHint/HelpHint";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text rendered above the control and tied to it via htmlFor/id. */
  label?: string;
  /** Short helper copy surfaced as a HelpHint next to the label. Omitted when falsy. */
  hint?: string;
  /** Validation or status message shown below the control in danger tone. */
  error?: string;
  /** Optional leading icon rendered inside the field, left of the text. */
  iconLeft?: IconName;
}

/**
 * A labeled single-line text input. Shares the labeled-field frame used by every
 * form control in the panel: an optional label, an optional hint bubble, and an
 * optional error message below. Use for free-text config such as names, repo
 * paths, or webhook URLs.
 */
export function Input({
  label,
  hint,
  error,
  iconLeft,
  id,
  className,
  disabled,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cx("mdn-input-field", disabled && "mdn-input-field--disabled", className)}>
      {label ? (
        <div className="mdn-input-field__label-row">
          <label className="mdn-label mdn-input-field__label" htmlFor={inputId}>
            {label}
          </label>
          {hint ? <HelpHint>{hint}</HelpHint> : null}
        </div>
      ) : null}
      <div className={cx("mdn-input", iconLeft && "mdn-input--icon", error && "mdn-input--error")}>
        {iconLeft ? <Icon className="mdn-input__icon" name={iconLeft} size={15} /> : null}
        <input
          id={inputId}
          className="mdn-input__control"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
      </div>
      {error ? (
        <p className="mdn-input-field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
