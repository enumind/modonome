import { useId, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { HelpHint } from "../HelpHint/HelpHint";

export type ToggleTone = "primary" | "info" | "owner";

export interface ToggleProps {
  /** Whether the switch is on. The control is fully controlled. */
  checked: boolean;
  /** Called with the next checked state on click or Space/Enter. */
  onCheckedChange: (checked: boolean) => void;
  /** Label text rendered beside the control and tied to it via htmlFor/id. */
  label?: string;
  /** Short helper copy surfaced as a HelpHint next to the label. Omitted when falsy. */
  hint?: string;
  /** Disables the control. */
  disabled?: boolean;
  /** Color the track takes when on. Defaults to `primary`. */
  tone?: ToggleTone;
}

/**
 * An accessible switch for boolean config such as dry_run, auto_merge, or
 * local_model_only_by_default. Implemented as a `role="switch"` button rather
 * than a checkbox so the on/off semantics are announced correctly, and is fully
 * operable with the keyboard (Space or Enter toggles).
 */
export function Toggle({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  tone = "primary",
}: ToggleProps) {
  const generatedId = useId();
  const switchId = generatedId;

  const toggle = () => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div className={cx("mdn-toggle-field", disabled && "mdn-toggle-field--disabled")}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        className={cx("mdn-toggle", `mdn-toggle--${tone}`, checked && "mdn-toggle--on")}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
      >
        <span className="mdn-toggle__thumb" aria-hidden="true" />
      </button>
      {label ? (
        <div className="mdn-toggle-field__label-row">
          <label className="mdn-toggle-field__label" htmlFor={switchId}>
            {label}
          </label>
          {hint ? <HelpHint>{hint}</HelpHint> : null}
        </div>
      ) : null}
    </div>
  );
}
