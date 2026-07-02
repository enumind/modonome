import {
  cloneElement,
  useId,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Tooltip body. Keep it short, this is a hint bubble, not a panel. */
  content: ReactNode;
  /** The single trigger element. Receives `aria-describedby`, and its existing hover
   * and focus handlers (if any) are preserved and called alongside the tooltip's own. */
  children: ReactElement;
  /** Which side of the trigger the bubble opens on. Defaults to `top`. */
  side?: TooltipSide;
}

/**
 * A small dark hint bubble anchored to a trigger element. Opens on mouse hover and on
 * keyboard focus of the trigger (never hover-only, so keyboard users see the same
 * information), and closes on blur or mouse leave. Uses `useId` to wire the trigger's
 * `aria-describedby` to the bubble's `role="tooltip"` id.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

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
      hide();
    },
    onFocus: (event: FocusEvent) => {
      (childProps.onFocus as ((e: FocusEvent) => void) | undefined)?.(event);
      show();
    },
    onBlur: (event: FocusEvent) => {
      (childProps.onBlur as ((e: FocusEvent) => void) | undefined)?.(event);
      hide();
    },
  });

  return (
    <span className="mdn-tooltip-wrap">
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={cx("mdn-tooltip", `mdn-tooltip--${side}`, open && "mdn-tooltip--open")}
      >
        {content}
      </span>
    </span>
  );
}
