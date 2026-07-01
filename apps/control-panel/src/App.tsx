import { useMemo, useState } from "react";
import {
  AppShell,
  ModeSwitcher,
  ArmingStateBadge,
  type NavItem,
  type PanelMode,
} from "@modonome/design-system";
import { ConfirmProvider } from "./lib/confirm";
import { getPanelState } from "./state/adapter";
import { OverviewScreen } from "./screens/OverviewScreen";
import { ArmingScreen } from "./screens/ArmingScreen";
import { WorkQueueScreen } from "./screens/WorkQueueScreen";
import { GatesScreen } from "./screens/GatesScreen";
import { LearningsScreen } from "./screens/LearningsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

const NAV_BASE: NavItem[] = [
  { id: "overview", label: "Overview", icon: "gauge" },
  { id: "arming", label: "Arming & Safety", icon: "shield" },
  { id: "queue", label: "Work Queue", icon: "queue" },
  { id: "gates", label: "Gates & Integrity", icon: "check-circle" },
  { id: "learnings", label: "Learnings & Decisions", icon: "book" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function App() {
  const [mode, setMode] = useState<PanelMode>("host");
  const [active, setActive] = useState("overview");
  const state = useMemo(() => getPanelState(mode), [mode]);

  const escalated = state.queue.filter((i) => i.state === "escalated").length;
  const openDecisions = state.decisions.filter((d) => d.status === "open").length;
  const nav: NavItem[] = NAV_BASE.map((n) => {
    if (n.id === "queue") return { ...n, badge: state.queue.filter((i) => i.state !== "done").length };
    if (n.id === "gates") return { ...n, badge: escalated > 0 ? escalated : "" };
    if (n.id === "learnings") return { ...n, badge: openDecisions > 0 ? openDecisions : "" };
    return n;
  });

  const topBar = (
    <>
      <ModeSwitcher
        mode={mode}
        onModeChange={setMode}
        hostLabel={mode === "host" ? state.subject.repo : "Host repo"}
        productLabel="Modonome"
      />
      <div className="topbar-identity">
        <span className="topbar-repo">{state.subject.repo}</span>
        <span className="topbar-branch">
          {state.subject.branch} · {state.subject.mode === "product" ? "self-governance" : "host repo"}
        </span>
      </div>
      <div className="topbar-spacer" />
      <ArmingStateBadge mode={state.arming.mode} envArmed={state.arming.envArmed} size="md" />
    </>
  );

  return (
    <ConfirmProvider>
      <AppShell
        nav={nav}
        activeNav={active}
        onNavigate={setActive}
        topBar={topBar}
        brandTag={mode === "product" ? "Self-governance" : "Control panel"}
        footer={<span>Modonome alpha · reads .modonome durable state</span>}
      >
        {active === "overview" ? <OverviewScreen state={state} onNavigate={setActive} /> : null}
        {active === "arming" ? <ArmingScreen state={state} /> : null}
        {active === "queue" ? <WorkQueueScreen state={state} /> : null}
        {active === "gates" ? <GatesScreen state={state} /> : null}
        {active === "learnings" ? <LearningsScreen state={state} /> : null}
        {active === "settings" ? <SettingsScreen state={state} /> : null}
      </AppShell>
    </ConfirmProvider>
  );
}
