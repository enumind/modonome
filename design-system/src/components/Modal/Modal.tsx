import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { cx } from "../../lib/cx";
import { IconButton } from "../IconButton/IconButton";

export type ModalSize = "sm" | "md";

export interface ModalProps {
  /** Whether the modal is open. When `false`, nothing is rendered. */
  open: boolean;
  /** Called when the modal requests to close: Escape key, scrim click, or the close button. */
  onClose: () => void;
  /** Optional title rendered in the header and used to label the dialog for assistive tech. */
  title?: string;
  /** Modal body content. */
  children?: ReactNode;
  /** Optional footer slot, typically the action buttons (Cancel / Confirm). */
  footer?: ReactNode;
  /** Dialog width. `sm` for a short confirmation, `md` for a form or detail view. Defaults to `md`. */
  size?: ModalSize;
}

/**
 * The generic centered dialog: a panel over a scrim, closable by Escape, a scrim
 * click, or its own close button. Moves focus into the dialog on open. This is the
 * base primitive that composed dialogs, such as a confirmation prompt, wrap with
 * their own content and footer actions. Keep usage here simple and composable rather
 * than adding domain-specific behavior.
 */
export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
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
    <div className="mdn-modal-scrim" onClick={handleScrimClick} role="presentation">
      <div
        className={cx("mdn-modal", `mdn-modal--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mdn-modal__header">
          {title ? (
            <h2 id={titleId} className="mdn-modal__title mdn-heading">
              {title}
            </h2>
          ) : (
            <span className="mdn-modal__title-spacer" />
          )}
          <span ref={closeSlotRef}>
            <IconButton icon="x" label="Close" onClick={onClose} />
          </span>
        </div>
        <div className="mdn-modal__body">{children}</div>
        {footer ? <div className="mdn-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
