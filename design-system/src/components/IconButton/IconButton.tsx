import type { ButtonHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export type IconButtonVariant = "ghost" | "secondary" | "danger";
export type IconButtonSize = "sm" | "md";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which glyph to render. */
  icon: IconName;
  /** Accessible name for the control. Required: an icon-only button must always have a label, exposed as `aria-label`. */
  label: string;
  /** Visual weight. `danger` is for destructive controls such as closing an unsaved form. Defaults to `ghost`. */
  variant?: IconButtonVariant;
  /** Control size. Defaults to `md`. */
  size?: IconButtonSize;
}

/**
 * A square, icon-only button. Always carries an `aria-label` built from the required
 * `label` prop so the control has an accessible name even though no text is visible.
 * Use for compact affordances such as closing a drawer, dismissing a card, or opening
 * an overflow menu.
 */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  className,
  disabled,
  ...rest
}: IconButtonProps) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button
      type="button"
      className={cx("mdn-iconbtn", `mdn-iconbtn--${variant}`, `mdn-iconbtn--${size}`, className)}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
