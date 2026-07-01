// @dsCard group="Governance"
import { IdentityChip } from "@modonome/design-system";

export const Maker = () => (
  <IdentityChip name="modonome-maker[bot]" model="llama-3.3-70b" role="maker" />
);

export const Checker = () => (
  <IdentityChip name="modonome-checker[bot]" model="claude-sonnet-4-6" role="checker" />
);

export const Pair = () => (
  <div style={{ display: "flex", gap: 12 }}>
    <IdentityChip name="modonome-maker[bot]" model="llama-3.3-70b" role="maker" />
    <IdentityChip name="modonome-checker[bot]" model="claude-sonnet-4-6" role="checker" />
  </div>
);
