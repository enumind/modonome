import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";

export interface MdnRootProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * The design-system root. Establishes the dark ground, the body font, and the token
 * scope that every component inherits. Wrap an app or a screen in this (AppShell already
 * does). It is also the wrapper the preview cards render inside, so components show on
 * their intended dark background rather than a bare white card.
 */
export function MdnRoot({ children, className, style, ...rest }: MdnRootProps) {
  return (
    <div
      className={cx("mdn-root", className)}
      style={{ background: "var(--mdn-bg)", color: "var(--mdn-text)", padding: "24px", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
