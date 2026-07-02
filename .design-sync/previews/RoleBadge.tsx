// @dsCard group="Governance"
import { RoleBadge } from "@modonome/design-system";

export const Roles = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    <RoleBadge role="maker" />
    <RoleBadge role="checker" />
    <RoleBadge role="merge-authority" />
    <RoleBadge role="owner" />
    <RoleBadge role="architect" />
    <RoleBadge role="maintainer" />
  </div>
);
