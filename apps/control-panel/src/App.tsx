import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppShell,
  ModeSwitcher,
  ArmingStateBadge,
  StatusPill,
  IconButton,
  LoadingState,
  ErrorState,
  Button,
  type NavItem,
  type PanelMode,
} from "@modonome/design-system";
import { ConfirmProvider } from "./lib/confirm";
import { loadPanelState, finalizeState } from "./state/adapter";
import {
  saveConfig,
  releaseLeaseLive,
  pruneLearningLive,
  saveMessagesLive,
  createWorkItemLive,
  updateWorkItemLive,
  deleteWorkItemLive,
} from "./state/liveClient";
import type { PanelState, ModonomeConfig, MessageOverridePatch, WriteActions, NewWorkItemInput, WorkItemPatch } from "./state/types";
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

const HOST_DIR_KEY = "modonome.hostDir";

export function App() {
  const [mode, setMode] = useState<PanelMode>("host");
  const [hostDir, setHostDir] = useState(() => {
    try {
      return localStorage.getItem(HOST_DIR_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [active, setActive] = useState("overview");
  const [state, setState] = useState<PanelState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback((nextMode: PanelMode, dir: string) => {
    setRefreshing(true);
    loadPanelState(nextMode, nextMode === "host" && dir ? dir : undefined)
      .then((next) => {
        setState(next);
        setLoadError(null);
      })
      .catch((err) => {
        // loadPanelState already falls back to demo data on any failure, so this only
        // fires on a genuinely unexpected error (for example a bug in deriveArming).
        setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load(mode, hostDir);
  }, [mode, hostDir, load]);

  function connectHostDir(dir: string) {
    try {
      localStorage.setItem(HOST_DIR_KEY, dir);
    } catch {
      // Storage can be unavailable (private browsing); the panel still works for
      // this session, it just will not remember the path on reload.
    }
    setHostDir(dir);
  }

  const withWrite = useCallback(async (action: () => Promise<PanelState>) => {
    const next = finalizeState(await action());
    setState(next);
  }, []);

  const writeActions: WriteActions = useMemo(
    () => ({
      writable: state?.source.kind === "live" && state.source.writable,
      onSaveConfig: (patch: Partial<ModonomeConfig>) =>
        withWrite(() => saveConfig(mode, patch, hostDir || undefined)),
      onReleaseLease: (itemId: string) => withWrite(() => releaseLeaseLive(mode, itemId, hostDir || undefined)),
      onCreateWorkItem: (item: NewWorkItemInput) => withWrite(() => createWorkItemLive(mode, item, hostDir || undefined)),
      onUpdateWorkItem: (itemId: string, patch: WorkItemPatch) =>
        withWrite(() => updateWorkItemLive(mode, itemId, patch, hostDir || undefined)),
      onDeleteWorkItem: (itemId: string) => withWrite(() => deleteWorkItemLive(mode, itemId, hostDir || undefined)),
      onPruneLearning: (lesson: string) => withWrite(() => pruneLearningLive(mode, lesson, hostDir || undefined)),
      onSaveMessages: (patch: Record<string, MessageOverridePatch>) =>
        withWrite(() => saveMessagesLive(mode, patch, hostDir || undefined)),
    }),
    [state, mode, hostDir, withWrite],
  );

  if (!state && loadError) {
    return (
      <div className="mdn-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState
          title="Could not load the control panel"
          message={loadError}
          action={
            <Button variant="primary" onClick={() => load(mode, hostDir)}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mdn-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingState label="Reading .modonome state..." />
      </div>
    );
  }

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
      <StatusPill tone={state.source.kind === "live" ? "ok" : "neutral"} icon={state.source.kind === "live" ? "check-circle" : "info"} size="sm">
        {state.source.kind === "live" ? "Live" : "Demo data"}
      </StatusPill>
      <IconButton icon="refresh" label="Refresh panel data" onClick={() => load(mode, hostDir)} disabled={refreshing} />
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
        {active === "overview" ? (
          <OverviewScreen
            state={state}
            onNavigate={setActive}
            hostDir={hostDir}
            onConnectHostDir={connectHostDir}
            onRefresh={() => load(mode, hostDir)}
          />
        ) : null}
        {active === "arming" ? <ArmingScreen key={mode} state={state} write={writeActions} /> : null}
        {active === "queue" ? <WorkQueueScreen state={state} write={writeActions} /> : null}
        {active === "gates" ? <GatesScreen state={state} /> : null}
        {active === "learnings" ? <LearningsScreen state={state} write={writeActions} /> : null}
        {active === "settings" ? <SettingsScreen key={mode} state={state} write={writeActions} /> : null}
      </AppShell>
    </ConfirmProvider>
  );
}
