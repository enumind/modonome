import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { IconButton } from "../IconButton/IconButton";

export interface DrawerProps {
  /** Whether the drawer is open. When `false`, nothing is rendered. */
  open: boolean;
  /** Called when the drawer requests to close: Escape key, scrim click, or the close button. */
  onClose: () => void;
  /** Optional title rendered in the header and used to label the dialog for assistive tech. */
  title?: string;
  /** Panel width in pixels. Defaults to `480`. */
  width?: number;
  /** Drawer body content, scrollable if it overflows. */
  children?: ReactNode;
}

/**
 * A right-side sheet that slides in over a scrim, for focused tasks that need more
 * room than a popover but should not leave the current page's context (inspecting a
 * work item, editing a policy). Traps focus on open by moving it to the close button,
 * closes on Escape or a scrim click, and respects `prefers-reduced-motion` by skipping
 * the slide-in transition.
 */
export function Drawer({ open, onClose, title, width = 480, children }: DrawerProps) {
  const titleId = useId();
  const closeSlotRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      closeSlotRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleScrimClick() {
    onClose();
  }

  return (
    <div className="mdn-drawer-scrim" onClick={handleScrimClick} role="presentation">
      <div
        className="mdn-drawer"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mdn-drawer__header">
          {title ? (
            <h2 id={titleId} className="mdn-drawer__title mdn-heading">
              {title}
            </h2>
          ) : (
            <span className="mdn-drawer__title-spacer" />
          )}
          <span ref={closeSlotRef}>
            <IconButton icon="x" label="Close" onClick={onClose} />
          </span>
        </div>
        <div className="mdn-drawer__body">{children}</div>
      </div>
    </div>
  );
}
