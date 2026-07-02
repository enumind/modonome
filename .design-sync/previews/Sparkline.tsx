// @dsCard group="Governance"
import { Sparkline } from "@modonome/design-system";

export const Trends = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
    <Sparkline data={[2.1, 3.4, 2.8, 4.1, 3.42]} tone="owner" ariaLabel="Cost trend" />
    <Sparkline data={[62, 68, 71, 77, 81]} tone="primary" ariaLabel="Quality trend" />
    <Sparkline data={[5, 4, 6, 3, 2]} tone="info" ariaLabel="Queue depth trend" />
    <Sparkline data={[1, 0, 2, 1, 3]} tone="danger" ariaLabel="Escalation trend" />
  </div>
);
