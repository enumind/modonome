import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `primary` is the teal call to action; `danger` is for destructive controls. */
  variant?: ButtonVariant;
  /** Control height and padding. Defaults to `md`. */
  size?: ButtonSize;
  /** Optional leading icon. */
  iconLeft?: IconName;
  /** Optional trailing icon. */
  iconRight?: IconName;
  /** Stretch to fill the container width. */
  block?: boolean;
  /** Show a spinner and block interaction. */
  loading?: boolean;
  children?: ReactNode;
}

/**
 * The standard action control. Use `primary` for the main action on a screen,
 * `secondary` for supporting actions, `ghost` for low-emphasis inline actions, and
 * `danger` for anything that arms, deletes, or overrides. Every destructive control
 * in the panel should confirm before it fires.
 */
export function Button({
  variant = "secondary",
  size = "md",
  iconLeft,
  iconRight,
  block,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === "lg" ? 17 : size === "sm" ? 14 : 15;
  return (
    <button
      className={cx(
        "mdn-btn",
        `mdn-btn--${variant}`,
        `mdn-btn--${size}`,
        block && "mdn-btn--block",
        loading && "mdn-btn--loading",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="mdn-btn__spinner" aria-hidden="true" /> : iconLeft ? <Icon name={iconLeft} size={iconSize} /> : null}
      {children ? <span className="mdn-btn__label">{children}</span> : null}
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}
