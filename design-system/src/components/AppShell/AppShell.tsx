import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export interface NavItem {
  /** Stable id used for the active comparison and the navigate callback. */
  id: string;
  /** Visible label. */
  label: string;
  /** Sidebar icon. */
  icon: IconName;
  /** Optional count or short marker shown after the label. */
  badge?: number | string;
}

export interface AppShellProps {
  /** The primary navigation entries. */
  nav: NavItem[];
  /** The id of the active entry. */
  activeNav: string;
  /** Called when an entry is chosen. */
  onNavigate: (id: string) => void;
  /** Content for the sticky top bar, typically the mode switch, arming badge, and repo identity. */
  topBar?: ReactNode;
  /** Product name shown in the sidebar header. Defaults to "Modonome". */
  brandLabel?: string;
  /** Short tag under the brand. Defaults to "Control panel". */
  brandTag?: string;
  /** Optional sidebar footer, for example a version or environment note. */
  footer?: ReactNode;
  /** The screen body. */
  children: ReactNode;
}

/** The Modonome brand mark: a teal ring with a check on the dark ground. */
function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="mdn-shell__mark">
      <rect width="32" height="32" rx="7" fill="var(--mdn-bg-deep)" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="var(--mdn-primary)" strokeWidth="2" />
      <path
        d="M13 16l2 2 4-4"
        fill="none"
        stroke="var(--mdn-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The application frame: a fixed sidebar of primary navigation, a sticky top bar for
 * the mode switch and arming status, and a scrollable content column. It establishes
 * the mdn-root wrapper (the dark ground, body font, and token scope), so every screen
 * rendered inside it inherits the design system. On narrow viewports the sidebar
 * collapses to a horizontal navigation strip so there is never a horizontal scroll.
 */
export function AppShell({
  nav,
  activeNav,
  onNavigate,
  topBar,
  brandLabel = "Modonome",
  brandTag = "Control panel",
  footer,
  children,
}: AppShellProps) {
  return (
    <div className="mdn-root mdn-shell">
      <aside className="mdn-shell__sidebar" aria-label="Primary">
        <div className="mdn-shell__brand">
          <BrandMark />
          <span className="mdn-shell__brand-text">
            <span className="mdn-shell__brand-name">{brandLabel}</span>
            <span className="mdn-shell__brand-tag">{brandTag}</span>
          </span>
        </div>
        <nav className="mdn-shell__nav">
          {nav.map((item) => {
            const active = item.id === activeNav;
            return (
              <button
                key={item.id}
                type="button"
                className={cx("mdn-shell__navitem", active && "is-active")}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon name={item.icon} size={17} />
                <span className="mdn-shell__navlabel">{item.label}</span>
                {item.badge !== undefined && item.badge !== "" ? (
                  <span className="mdn-shell__navbadge">{item.badge}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        {footer ? <div className="mdn-shell__footer">{footer}</div> : null}
      </aside>

      <div className="mdn-shell__main">
        {topBar ? <header className="mdn-shell__topbar">{topBar}</header> : null}
        <main className="mdn-shell__content">{children}</main>
      </div>
    </div>
  );
}
