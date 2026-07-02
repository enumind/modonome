// @dsCard group="Governance"
import { StatusPill } from "@modonome/design-system";

export const Tones = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    <StatusPill tone="neutral">Queued</StatusPill>
    <StatusPill tone="ok" icon="check-circle">
      Pass
    </StatusPill>
    <StatusPill tone="info">Running</StatusPill>
    <StatusPill tone="attention">Flaky</StatusPill>
    <StatusPill tone="blocked" icon="ban">
      Fail
    </StatusPill>
  </div>
);
