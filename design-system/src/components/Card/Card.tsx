import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { HelpHint } from "../HelpHint/HelpHint";

export type CardTone = "default" | "raised";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional title rendered in the header row using the heading font. */
  title?: string;
  /** Optional small mono uppercase label rendered above the title. */
  eyebrow?: string;
  /** Optional help text. Rendered as a HelpHint icon immediately after the title. */
  help?: string;
  /** Optional right-aligned slot in the header row, typically buttons or a menu trigger. */
  actions?: ReactNode;
  /** Whether the body has internal padding. Defaults to `true`. */
  padded?: boolean;
  /** Visual weight. `raised` adds a stronger border and shadow for emphasis. Defaults to `default`. */
  tone?: CardTone;
  /** Card body content. */
  children?: ReactNode;
}

/**
 * The standard container surface for the control panel. Renders an optional header
 * row (eyebrow, title, help hint, and right-aligned actions) above a divider, then the
 * body. When no title, eyebrow, or actions are given, only the padded body is
 * rendered. This is the single most-used container in the app: dashboards, panels,
 * and detail views all sit inside a `Card`.
 */
export function Card({
  title,
  eyebrow,
  help,
  actions,
  padded = true,
  tone = "default",
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(title || eyebrow || actions);

  return (
    <div className={cx("mdn-card", `mdn-card--${tone}`, className)} {...rest}>
      {hasHeader ? (
        <>
          <div className="mdn-card__header">
            <div className="mdn-card__heading">
              {eyebrow ? <span className="mdn-card__eyebrow mdn-label">{eyebrow}</span> : null}
              {title ? (
                <div className="mdn-card__title-row">
                  <h3 className="mdn-card__title mdn-heading">{title}</h3>
                  {help ? <HelpHint>{help}</HelpHint> : null}
                </div>
              ) : null}
            </div>
            {actions ? <div className="mdn-card__actions">{actions}</div> : null}
          </div>
          <div className="mdn-card__divider" role="separator" />
          <div className={cx("mdn-card__body", padded && "mdn-card__body--padded")}>{children}</div>
        </>
      ) : (
        <div className={cx("mdn-card__body", padded && "mdn-card__body--padded")}>{children}</div>
      )}
    </div>
  );
}
