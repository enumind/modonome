import {
  cloneElement,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx";
import { Icon } from "../Icon/Icon";

export type HoverCardSide = "top" | "bottom";

export interface HoverCardSource {
  /** Short citation, for example "prompts/modules/gates.md". */
  label: string;
  /** Optional link. Omit for a plain-text citation with nothing to click. */
  href?: string;
}

export interface HoverCardProps {
  /** Card heading. */
  title: string;
  /** Card body. Keep it to a few sentences; this is a reference card, not a document viewer. */
  body: ReactNode;
  /** Where the content came from, shown as a small citation at the foot of the card. */
  source?: HoverCardSource;
  /** The single trigger element. Receives `aria-describedby` and its existing hover and
   * focus handlers, if any, are preserved and called alongside the card's own. */
  children: ReactElement;
  /** Which side of the trigger the card opens on. Defaults to `bottom`. */
  side?: HoverCardSide;
}

const CLOSE_DELAY_MS = 120;

/**
 * A richer sibling of Tooltip: a small card (heading, body copy, source citation) for
 * reference content pulled from real documentation, rather than a one-line hint. Unlike
 * Tooltip, its content accepts pointer input, so a source link inside it is clickable.
 * Opens on hover or keyboard focus of the trigger; closing is delayed briefly so moving
 * the pointer from the trigger into the card itself does not flicker it shut.
 */
export function HoverCard({ title, body, source, children, side = "bottom" }: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }

  function scheduleHide() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  const child = children as ReactElement<Record<string, unknown>>;
  const childProps = child.props ?? {};

  const trigger = cloneElement(child, {
    "aria-describedby": id,
    onMouseEnter: (event: MouseEvent) => {
      (childProps.onMouseEnter as ((e: MouseEvent) => void) | undefined)?.(event);
      show();
    },
    onMouseLeave: (event: MouseEvent) => {
      (childProps.onMouseLeave as ((e: MouseEvent) => void) | undefined)?.(event);
      scheduleHide();
    },
    onFocus: (event: FocusEvent) => {
      (childProps.onFocus as ((e: FocusEvent) => void) | undefined)?.(event);
      show();
    },
    onBlur: (event: FocusEvent) => {
      (childProps.onBlur as ((e: FocusEvent) => void) | undefined)?.(event);
      scheduleHide();
    },
  });

  return (
    <span className="mdn-hovercard-wrap">
      {trigger}
      <div
        id={id}
        role="tooltip"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        className={cx("mdn-hovercard", `mdn-hovercard--${side}`, open && "mdn-hovercard--open")}
      >
        <p className="mdn-hovercard__title mdn-heading">{title}</p>
        <div className="mdn-hovercard__body">{body}</div>
        {source ? (
          <p className="mdn-hovercard__source mdn-mono">
            <Icon name="book" size={12} />
            {source.href ? (
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            ) : (
              <span>{source.label}</span>
            )}
          </p>
        ) : null}
      </div>
    </span>
  );
}
