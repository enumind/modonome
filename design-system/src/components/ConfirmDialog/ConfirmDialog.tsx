import type { ReactNode } from "react";
import { Modal } from "../Modal/Modal";
import { Button } from "../Button/Button";

export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** The dialog heading, for example "Arm the engine?". */
  title: string;
  /** The explanation of what will happen. */
  children: ReactNode;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Visual weight of the confirm action. Use "danger" for destructive or arming actions. */
  tone?: "primary" | "danger";
  /** Called when the operator confirms. */
  onConfirm: () => void;
  /** Called when the operator cancels or dismisses. */
  onCancel: () => void;
}

/**
 * A confirmation dialog for destructive or high-consequence controls. Every control
 * that arms the engine, releases a lease, approves a protected path, or prunes a
 * learning routes through this so an operator always confirms before it fires. It
 * wraps the Modal primitive and puts focus on the cancel action by default.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="mdn-confirm__actions">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="mdn-confirm__body">{children}</div>
    </Modal>
  );
}
