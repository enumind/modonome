// @dsCard group="Governance"
import { TierBadge } from "@modonome/design-system";

export const Tiers = () => (
  <div style={{ display: "flex", gap: 8 }}>
    <TierBadge tier={1} />
    <TierBadge tier={2} />
    <TierBadge tier={3} />
    <TierBadge tier={4} />
  </div>
);
