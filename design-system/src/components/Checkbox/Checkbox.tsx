import { useId } from "react";
import { cx } from "../../lib/cx";
import { Icon } from "../Icon/Icon";
import { HelpHint } from "../HelpHint/HelpHint";

export interface CheckboxProps {
  /** Whether the box is checked. The control is fully controlled. */
  checked: boolean;
  /** Called with the next checked state on click or Space/Enter. */
  onCheckedChange: (checked: boolean) => void;
  /** Label text, required since a checkbox without a label is not identifiable. */
  label: string;
  /** Short helper copy surfaced as a HelpHint next to the label. Omitted when falsy. */
  hint?: string;
  /** Disables the control. */
  disabled?: boolean;
}

/**
 * A labeled checkbox for boolean choices in lists and forms, such as opting
 * into a rule or selecting an item in a batch action. Renders a native
 * `<input type="checkbox">` visually replaced by a styled box with a check
 * icon, so screen readers and keyboard users get standard checkbox behavior.
 */
export function Checkbox({ checked, onCheckedChange, label, hint, disabled }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = generatedId;

  return (
    <div className={cx("mdn-checkbox-field", disabled && "mdn-checkbox-field--disabled")}>
      <span className="mdn-checkbox">
        <input
          id={checkboxId}
          className="mdn-checkbox__input"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span className="mdn-checkbox__box" aria-hidden="true">
          {checked ? <Icon name="check" size={12} /> : null}
        </span>
      </span>
      <div className="mdn-checkbox-field__label-row">
        <label className="mdn-checkbox-field__label" htmlFor={checkboxId}>
          {label}
        </label>
        {hint ? <HelpHint>{hint}</HelpHint> : null}
      </div>
    </div>
  );
}
