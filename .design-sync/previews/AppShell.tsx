import { AppShell, ArmingStateBadge, MetricTile, Card } from "@modonome/design-system";

const nav = [
  { id: "overview", label: "Overview", icon: "gauge" as const },
  { id: "arming", label: "Arming & Safety", icon: "shield" as const },
  { id: "queue", label: "Work Queue", icon: "queue" as const, badge: 4 },
  { id: "gates", label: "Gates & Integrity", icon: "check-circle" as const, badge: 1 },
  { id: "learnings", label: "Learnings", icon: "book" as const },
  { id: "settings", label: "Settings", icon: "settings" as const },
];

export const Dashboard = () => (
  <AppShell
    nav={nav}
    activeNav="overview"
    onNavigate={() => {}}
    topBar={<ArmingStateBadge mode="armed" envArmed size="md" />}
  >
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      <MetricTile label="Arming mode" value="Armed" icon="shield" tone="ok" sub="All prerequisites clear" />
      <MetricTile label="Active work" value={4} unit="items" icon="queue" tone="attention" sub="1 escalated" />
      <MetricTile label="Spend today" value="$3.42" icon="cost" sub="of $25 budget" />
    </div>
    <div style={{ marginTop: 16 }}>
      <Card title="Payments service" help="Modonome armed for Tier 1 and Tier 2 work.">
        <span style={{ color: "var(--mdn-text-2)" }}>Six screens monitor and configure the engine.</span>
      </Card>
    </div>
  </AppShell>
);
