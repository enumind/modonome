import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export type StatusPillTone = "neutral" | "ok" | "info" | "attention" | "blocked";
export type StatusPillSize = "sm" | "md";

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone. Maps to a status color: neutral (muted), ok (primary), info, attention (owner), blocked (danger). Defaults to `neutral`. */
  tone?: StatusPillTone;
  /** Optional leading icon reinforcing the tone so color is never the only signal. */
  icon?: IconName;
  /** Show a small solid dot instead of, or alongside, the icon. */
  dot?: boolean;
  /** Control height and padding. Defaults to `md`. */
  size?: StatusPillSize;
  /** Pill label. Always rendered: status must never be carried by color alone. */
  children?: ReactNode;
}

/**
 * A compact rounded status indicator. Pairs a tinted background and border with the
 * tone's color, and always renders its label text (plus an optional icon or dot) so
 * the status reads correctly even without color vision. Use for work-item states,
 * arming modes, or any short status word in a table row or card header.
 */
export function StatusPill({
  tone = "neutral",
  icon,
  dot,
  size = "md",
  className,
  children,
  ...rest
}: StatusPillProps) {
  const iconSize = size === "sm" ? 11 : 12.5;
  return (
    <span
      className={cx("mdn-statuspill", `mdn-statuspill--${tone}`, `mdn-statuspill--${size}`, className)}
      {...rest}
    >
      {dot ? <span className="mdn-statuspill__dot" aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      <span className="mdn-statuspill__label">{children}</span>
    </span>
  );
}
