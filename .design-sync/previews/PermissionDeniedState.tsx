import { PermissionDeniedState } from "@modonome/design-system";

export const OwnerOnly = () => (
  <PermissionDeniedState
    title="Owner approval required"
    message="Arming the engine is an owner action set in CI."
  />
);
