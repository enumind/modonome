import { ConfirmDialog } from "@modonome/design-system";

export const ArmEngine = () => (
  <ConfirmDialog
    open
    title="Arm the engine?"
    tone="danger"
    confirmLabel="Arm engine"
    onConfirm={() => {}}
    onCancel={() => {}}
  >
    Armed mode lets modonome open and merge changes once every gate passes. The MODONOME_ARMED CI
    secret must also be set. You can return to dry-run at any time.
  </ConfirmDialog>
);
