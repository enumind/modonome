import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Card, RoleBadge, Select, Table, StatusPill, Toggle, Button, IconButton, Input, Tabs, Toast } from "@modonome/design-system";
import type { ModonomeConfig, WriteActions } from "../state/types";
import type { PanelState } from "../state/types";
import { useConfirm } from "../lib/confirm";
import { diffConfig } from "../state/configDiff";
import { testConnectionLive } from "../state/liveClient";

const ROLE_BADGE: Record<string, "maker" | "checker" | "maintainer"> = {
  maker: "maker",
  checker: "checker",
  "self-govern": "maintainer",
};

const TABS = [
  { id: "roles", label: "Roles & models", icon: "users" as const },
  { id: "agents", label: "Agents", icon: "spark" as const },
  { id: "providers", label: "Providers & runners", icon: "settings" as const },
  { id: "trust", label: "Trusted authors & paths", icon: "lock" as const },
  { id: "network", label: "Cross-repo network", icon: "branch" as const },
  { id: "market", label: "Market scan", icon: "activity" as const },
  { id: "remediation", label: "Remediation", icon: "shield" as const },
];

// Providers the built-in registry (scripts/agent/providers.mjs) ships with. A repo's
// own config.providers can add more; those show up in the dropdown too.
const KNOWN_PROVIDERS = [
  { value: "anthropic", label: "anthropic — hosted, paid" },
  { value: "local", label: "local — self-hosted, OpenAI-compatible" },
  { value: "github-models", label: "github-models — free gateway" },
  { value: "openai-compatible", label: "openai-compatible — remote, paid" },
];
const CUSTOM_PROVIDER = "__custom__";

const COST_CLASS_OPTIONS = [
  { value: "paid", label: "paid" },
  { value: "free", label: "free" },
  { value: "local", label: "local" },
];

// One-click starting points for the case this feature exists to make easy: pointing a
// role at a local OpenAI-compatible server. Filling in the LAN preset's IP is left to
// the operator; the placeholder shows the shape instead of a value that looks real
// but points nowhere.
const MODEL_PRESETS: Array<{ key: string; label: string; provider: string; baseUrl: string; baseUrlPlaceholder?: string }> = [
  { key: "lmstudio-local", label: "LM Studio (localhost)", provider: "local", baseUrl: "http://localhost:1234/v1" },
  { key: "lmstudio-lan", label: "LM Studio (LAN)", provider: "local", baseUrl: "", baseUrlPlaceholder: "http://<windows-server-ip>:1234/v1" },
  { key: "ollama-local", label: "Ollama (localhost)", provider: "local", baseUrl: "http://localhost:11434/v1" },
];

const ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface ModelRow {
  id: string;
  provider: string;
  base_url?: string;
}

interface ProviderRow {
  id: string;
  transport?: string;
  costClass?: string;
  authEnv?: string;
}

interface RunnerRow {
  id: string;
  labels: string[];
  cli_path: string;
}

interface ModelDraft {
  id: string;
  provider: string;
  providerCustom: string;
  base_url: string;
}

interface ProviderDraft {
  id: string;
  transport: string;
  costClass: string;
  authEnv: string;
}

interface ConnectionTestState {
  pending: boolean;
  ok?: boolean;
  detail?: string;
}

const EMPTY_MODEL_DRAFT: ModelDraft = { id: "", provider: "local", providerCustom: "", base_url: "" };
const EMPTY_PROVIDER_DRAFT: ProviderDraft = { id: "", transport: "", costClass: "paid", authEnv: "" };

/**
 * The advanced-configuration screen, one conceptual area per tab so nothing forces an
 * operator to scroll past unrelated subsystems to reach the one they came for. Full
 * CRUD lives here for the model-wiring maps (roles, models, providers, runners edit
 * in place): every field is a local draft until "Save configuration" writes it to
 * config.yaml through the block-preserving nested writer.
 */
export function SettingsScreen({ state, write }: { state: PanelState; write: WriteActions }) {
  const confirm = useConfirm();
  const [tab, setTab] = useState("roles");
  const [config, setConfig] = useState<ModonomeConfig>(state.config);
  const [newAuthor, setNewAuthor] = useState("");
  const [newPath, setNewPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "blocked"; text: string } | null>(null);

  const firstRole = Object.keys(state.config.roles)[0] ?? "maker";
  const [agentRole, setAgentRole] = useState(firstRole);
  const [newSkill, setNewSkill] = useState("");
  const [newTool, setNewTool] = useState("");
  const [priorityModelToAdd, setPriorityModelToAdd] = useState("");

  const [modelDraft, setModelDraft] = useState<ModelDraft>(EMPTY_MODEL_DRAFT);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelIdError, setModelIdError] = useState<string | null>(null);
  const [modelUrlError, setModelUrlError] = useState<string | null>(null);
  const [connectionTests, setConnectionTests] = useState<Record<string, ConnectionTestState>>({});

  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(EMPTY_PROVIDER_DRAFT);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerIdError, setProviderIdError] = useState<string | null>(null);

  const [editingRunnerId, setEditingRunnerId] = useState<string | null>(null);
  const [runnerCliPath, setRunnerCliPath] = useState("");
  const [newRunnerLabel, setNewRunnerLabel] = useState("");

  function set<K extends keyof ModonomeConfig>(key: K, value: ModonomeConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function setRoleModel(role: string, model: string) {
    setConfig((c) => ({
      ...c,
      roles: { ...c.roles, [role]: { ...c.roles[role], model } },
    }));
  }

  // Capability-profile editing (skills, tools, prioritized model fallback) for a role.
  function updateRoleList(role: string, field: "skills" | "tools" | "models", next: string[]) {
    setConfig((c) => ({
      ...c,
      roles: { ...c.roles, [role]: { ...c.roles[role], [field]: next } },
    }));
  }

  function addToRoleList(role: string, field: "skills" | "tools" | "models", value: string) {
    const v = value.trim();
    if (!v) return;
    const current = config.roles[role]?.[field] ?? [];
    if (current.includes(v)) return;
    updateRoleList(role, field, [...current, v]);
  }

  function removeFromRoleList(role: string, field: "skills" | "tools" | "models", value: string) {
    const current = config.roles[role]?.[field] ?? [];
    updateRoleList(
      role,
      field,
      current.filter((x) => x !== value),
    );
  }

  function addAuthor() {
    const author = newAuthor.trim();
    if (!author || config.trusted_author_allowlist.includes(author)) return;
    set("trusted_author_allowlist", [...config.trusted_author_allowlist, author]);
    setNewAuthor("");
  }

  function removeAuthor(author: string) {
    set(
      "trusted_author_allowlist",
      config.trusted_author_allowlist.filter((a) => a !== author),
    );
  }

  function addPath() {
    const path = newPath.trim();
    if (!path || config.protected_paths_extra.includes(path)) return;
    set("protected_paths_extra", [...config.protected_paths_extra, path]);
    setNewPath("");
  }

  async function removePath(path: string) {
    const ok = await confirm({
      title: "Remove this protected path?",
      tone: "danger",
      confirmLabel: "Remove path",
      body: `Removing "${path}" is an owner-level decision: it drops the requirement for explicit approval on changes there. This only stages the removal; it still needs Save configuration to take effect.`,
    });
    if (!ok) return;
    set(
      "protected_paths_extra",
      config.protected_paths_extra.filter((p) => p !== path),
    );
  }

  // --- Models -------------------------------------------------------------
  function resetModelDraft() {
    setModelDraft(EMPTY_MODEL_DRAFT);
    setEditingModelId(null);
    setModelIdError(null);
    setModelUrlError(null);
  }

  function startEditModel(id: string) {
    const m = config.models[id];
    if (!m) return;
    const known = KNOWN_PROVIDERS.some((p) => p.value === m.provider);
    setModelDraft({
      id,
      provider: known ? m.provider : CUSTOM_PROVIDER,
      providerCustom: known ? "" : m.provider,
      base_url: m.base_url ?? "",
    });
    setEditingModelId(id);
    setModelIdError(null);
    setModelUrlError(null);
  }

  function applyModelPreset(preset: (typeof MODEL_PRESETS)[number]) {
    setModelDraft((d) => ({ ...d, provider: preset.provider, base_url: preset.baseUrl }));
  }

  function submitModel(e: FormEvent) {
    e.preventDefault();
    const id = modelDraft.id.trim();
    const provider = modelDraft.provider === CUSTOM_PROVIDER ? modelDraft.providerCustom.trim() : modelDraft.provider;

    let ok = true;
    if (!id || !ID_PATTERN.test(id)) {
      setModelIdError("Use letters, numbers, dot, dash, or underscore only.");
      ok = false;
    } else if ((editingModelId === null || editingModelId !== id) && config.models[id]) {
      setModelIdError(`"${id}" already exists.`);
      ok = false;
    } else {
      setModelIdError(null);
    }
    if (modelDraft.base_url && !isValidUrl(modelDraft.base_url)) {
      setModelUrlError("Enter a full URL, e.g. http://192.168.1.20:1234/v1.");
      ok = false;
    } else {
      setModelUrlError(null);
    }
    if (!provider) {
      setModelIdError((e) => e ?? "Pick or enter a provider.");
      ok = false;
    }
    if (!ok) return;

    setConfig((c) => {
      const next = { ...c.models };
      if (editingModelId && editingModelId !== id) delete next[editingModelId];
      next[id] = modelDraft.base_url ? { provider, base_url: modelDraft.base_url } : { provider };
      return { ...c, models: next };
    });
    resetModelDraft();
  }

  async function removeModel(id: string) {
    const usedBy = Object.entries(config.roles)
      .filter(([, r]) => r.model === id)
      .map(([role]) => role);
    const ok = await confirm({
      title: `Remove model "${id}"?`,
      tone: "danger",
      confirmLabel: "Remove model",
      body:
        usedBy.length > 0
          ? `${usedBy.join(", ")} currently use this model. Removing it here does not repoint those roles — do that too, or Save will be blocked. This only stages the removal; it still needs Save configuration to take effect.`
          : "This only stages the removal; it still needs Save configuration to take effect.",
    });
    if (!ok) return;
    setConfig((c) => {
      const next = { ...c.models };
      delete next[id];
      return { ...c, models: next };
    });
    if (editingModelId === id) resetModelDraft();
  }

  async function testModelConnection(id: string, baseUrl: string) {
    setConnectionTests((t) => ({ ...t, [id]: { pending: true } }));
    try {
      const result = await testConnectionLive(baseUrl);
      setConnectionTests((t) => ({
        ...t,
        [id]: {
          pending: false,
          ok: result.ok,
          detail: result.ok ? `Reachable · ${result.models?.length ?? 0} model(s)` : `Unreachable: ${result.error ?? "unknown error"}`,
        },
      }));
    } catch (err) {
      setConnectionTests((t) => ({
        ...t,
        [id]: { pending: false, ok: false, detail: `Unreachable: ${err instanceof Error ? err.message : String(err)}` },
      }));
    }
  }

  // --- Providers ------------------------------------------------------------
  function resetProviderDraft() {
    setProviderDraft(EMPTY_PROVIDER_DRAFT);
    setEditingProviderId(null);
    setProviderIdError(null);
  }

  function startEditProvider(id: string) {
    const p = config.providers[id];
    if (!p) return;
    setProviderDraft({ id, transport: p.transport ?? "", costClass: p.costClass ?? "paid", authEnv: p.authEnv ?? "" });
    setEditingProviderId(id);
    setProviderIdError(null);
  }

  function submitProvider(e: FormEvent) {
    e.preventDefault();
    const id = providerDraft.id.trim();
    if (!id || !ID_PATTERN.test(id)) {
      setProviderIdError("Use letters, numbers, dot, dash, or underscore only.");
      return;
    }
    if ((editingProviderId === null || editingProviderId !== id) && config.providers[id]) {
      setProviderIdError(`"${id}" already exists.`);
      return;
    }
    setProviderIdError(null);
    setConfig((c) => {
      const next = { ...c.providers };
      if (editingProviderId && editingProviderId !== id) delete next[editingProviderId];
      next[id] = {
        ...(providerDraft.transport ? { transport: providerDraft.transport.trim() } : {}),
        costClass: providerDraft.costClass as "paid" | "free" | "local",
        ...(providerDraft.authEnv ? { authEnv: providerDraft.authEnv.trim() } : {}),
      };
      return { ...c, providers: next };
    });
    resetProviderDraft();
  }

  async function removeProvider(id: string) {
    const usedBy = Object.entries(config.models)
      .filter(([, m]) => m.provider === id)
      .map(([modelId]) => modelId);
    const ok = await confirm({
      title: `Remove provider "${id}"?`,
      tone: "danger",
      confirmLabel: "Remove provider",
      body:
        usedBy.length > 0
          ? `Model(s) ${usedBy.join(", ")} reference this provider override. Removing it here falls back to the built-in registry for them, which may change cost class or transport. This only stages the removal; it still needs Save configuration to take effect.`
          : "This only stages the removal; it still needs Save configuration to take effect.",
    });
    if (!ok) return;
    setConfig((c) => {
      const next = { ...c.providers };
      delete next[id];
      return { ...c, providers: next };
    });
    if (editingProviderId === id) resetProviderDraft();
  }

  // --- Runners (edit-only: the schema fixes the key set to local/container) -------
  function startEditRunner(id: string) {
    setEditingRunnerId(id);
    setRunnerCliPath(config.runners[id]?.cli_path ?? "");
    setNewRunnerLabel("");
  }

  function saveRunnerCliPath() {
    if (!editingRunnerId) return;
    const cliPath = runnerCliPath.trim();
    if (!cliPath) return;
    setConfig((c) => ({
      ...c,
      runners: { ...c.runners, [editingRunnerId]: { ...c.runners[editingRunnerId], cli_path: cliPath } },
    }));
  }

  function addRunnerLabel() {
    if (!editingRunnerId) return;
    const label = newRunnerLabel.trim();
    if (!label) return;
    setConfig((c) => {
      const existing = c.runners[editingRunnerId]?.labels ?? [];
      if (existing.includes(label)) return c;
      return {
        ...c,
        runners: { ...c.runners, [editingRunnerId]: { ...c.runners[editingRunnerId], labels: [...existing, label] } },
      };
    });
    setNewRunnerLabel("");
  }

  function removeRunnerLabel(label: string) {
    if (!editingRunnerId) return;
    setConfig((c) => ({
      ...c,
      runners: {
        ...c.runners,
        [editingRunnerId]: {
          ...c.runners[editingRunnerId],
          labels: (c.runners[editingRunnerId]?.labels ?? []).filter((l) => l !== label),
        },
      },
    }));
  }

  const patch = useMemo(() => diffConfig(state.config, config), [state.config, config]);
  const dirty = Object.keys(patch).length > 0;

  async function onSave() {
    const makerModel = config.roles.maker?.model;
    const checkerModel = config.roles.checker?.model;
    if (config.require_distinct_maker_checker_model !== false && makerModel && checkerModel && makerModel === checkerModel) {
      setNotice({
        tone: "blocked",
        text: `Maker and checker both resolve to "${makerModel}", but require_distinct_maker_checker_model is on. Point one of them at a different model first.`,
      });
      return;
    }
    const missingModel = Object.entries(config.roles).find(([, r]) => r.model && !config.models[r.model]);
    if (missingModel) {
      setNotice({
        tone: "blocked",
        text: `Role "${missingModel[0]}" is assigned model "${missingModel[1].model}", which isn't in the models list below.`,
      });
      return;
    }

    const ok = await confirm({
      title: "Save configuration changes?",
      confirmLabel: "Save changes",
      body: `Writes ${Object.keys(patch).length} changed value(s) to config.yaml in ${state.subject.dir ?? "the repo"}.`,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await write.onSaveConfig(patch);
      setNotice({ tone: "info", text: "Configuration saved to config.yaml." });
    } catch (err) {
      setNotice({ tone: "blocked", text: `Save failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSaving(false);
    }
  }

  const modelOptions = Object.keys(config.models).map((id) => ({ value: id, label: id }));
  const modelRows: ModelRow[] = Object.entries(config.models).map(([id, m]) => ({
    id,
    provider: m.provider,
    base_url: m.base_url,
  }));
  const providerRows: ProviderRow[] = Object.entries(config.providers ?? {}).map(([id, p]) => ({
    id,
    transport: p.transport,
    costClass: p.costClass,
    authEnv: p.authEnv,
  }));
  const runnerRows: RunnerRow[] = Object.entries(config.runners ?? {}).map(([id, r]) => ({
    id,
    labels: r.labels,
    cli_path: r.cli_path,
  }));
  const roleEntries = Object.entries(config.roles);
  const providerSelectOptions = [
    ...KNOWN_PROVIDERS,
    ...Object.keys(config.providers ?? {})
      .filter((id) => !KNOWN_PROVIDERS.some((p) => p.value === id))
      .map((id) => ({ value: id, label: id })),
    { value: CUSTOM_PROVIDER, label: "Custom…" },
  ];
  const canTestConnection = state.source.kind === "live";

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Advanced configuration. Most operators rarely change these.</p>
        </div>
        <div className="page-head__actions">
          {dirty ? (
            <Button variant="ghost" onClick={() => setConfig(state.config)} disabled={saving}>
              Discard changes
            </Button>
          ) : null}
          <Button
            variant="primary"
            iconLeft="check"
            onClick={onSave}
            loading={saving}
            disabled={!write.writable || !dirty || saving}
          >
            Save configuration
          </Button>
        </div>
      </div>

      {!write.writable ? (
        <p className="mdn-faint">
          {state.source.writeLockReason
            ? state.source.writeLockReason
            : "Read-only: changes below stay local until the panel is connected to live, writable state (start the dev server with MODONOME_PANEL_WRITE=1)."}
        </p>
      ) : null}

      {notice ? (
        <Toast
          tone={notice.tone === "blocked" ? "blocked" : "info"}
          title={notice.tone === "blocked" ? "Save failed" : "Acknowledged"}
          message={notice.text}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "roles" ? (
        <div className="stack-lg">
          <Card title="Governance roles" help="Each role runs a specific runner and model. Distinct maker and checker models are enforced separately below and again on save.">
            {roleEntries.length === 0 ? (
              <p className="mdn-faint">No roles are configured for this repo.</p>
            ) : (
              <div className="stack-lg">
                {roleEntries.map(([role, assignment]) => (
                  <div
                    key={role}
                    style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
                  >
                    <div style={{ minWidth: 160 }}>
                      <RoleBadge role={ROLE_BADGE[role] ?? "maintainer"} />
                    </div>
                    <span className="mdn-faint mdn-mono" style={{ minWidth: 90 }}>
                      {assignment.runner}
                    </span>
                    <div style={{ flex: "1 1 220px", maxWidth: 320 }}>
                      <Select
                        label="Model"
                        hint="Which model this role calls for its work."
                        options={modelOptions}
                        value={assignment.model}
                        onValueChange={(v) => setRoleModel(role, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Models" help="Every model id available to assign to a role: its provider and, for a self-hosted or gateway endpoint, its base URL.">
            <div className="stack-lg">
              {modelRows.length === 0 ? (
                <p className="mdn-faint">No models yet — add one below, or pick a preset to point at a local server.</p>
              ) : (
                <Table<ModelRow>
                  columns={[
                    { key: "id", header: "Model", render: (row) => <span className="mdn-mono">{row.id}</span> },
                    { key: "provider", header: "Provider" },
                    {
                      key: "base_url",
                      header: "Base URL",
                      render: (row) => (
                        <span className="mdn-mono">{row.base_url ? row.base_url : <span className="mdn-faint">&mdash;</span>}</span>
                      ),
                    },
                    {
                      key: "status",
                      header: "Connection",
                      render: (row) => {
                        const t = connectionTests[row.id];
                        if (!row.base_url) return <span className="mdn-faint">&mdash;</span>;
                        if (!t) return null;
                        if (t.pending) return <StatusPill tone="info" size="sm">Testing…</StatusPill>;
                        return (
                          <StatusPill tone={t.ok ? "ok" : "blocked"} size="sm">
                            {t.detail}
                          </StatusPill>
                        );
                      },
                    },
                    {
                      key: "actions",
                      header: "",
                      align: "right",
                      render: (row) => (
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          {row.base_url && canTestConnection ? (
                            <IconButton
                              icon="activity"
                              label={`Test connection for ${row.id}`}
                              size="sm"
                              onClick={() => testModelConnection(row.id, row.base_url as string)}
                            />
                          ) : null}
                          <IconButton icon="settings" label={`Edit ${row.id}`} size="sm" onClick={() => startEditModel(row.id)} />
                          <IconButton icon="x" label={`Remove ${row.id}`} size="sm" variant="danger" onClick={() => removeModel(row.id)} />
                        </div>
                      ),
                    },
                  ]}
                  rows={modelRows}
                  getRowKey={(row) => row.id}
                />
              )}

              <div>
                <p className="mdn-label" style={{ marginBottom: 8 }}>
                  {editingModelId ? `Editing "${editingModelId}"` : "Add a model"}
                </p>
                {!editingModelId ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    {MODEL_PRESETS.map((preset) => (
                      <Button key={preset.key} variant="secondary" size="sm" onClick={() => applyModelPreset(preset)}>
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <form
                  style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}
                  onSubmit={submitModel}
                >
                  <Input
                    label="Model id"
                    placeholder="lmstudio-maker"
                    value={modelDraft.id}
                    onChange={(e) => setModelDraft((d) => ({ ...d, id: e.target.value }))}
                    error={modelIdError ?? undefined}
                  />
                  <div style={{ minWidth: 220 }}>
                    <Select
                      label="Provider"
                      hint="Which transport and cost class this model uses. Pick local for a self-hosted OpenAI-compatible server like LM Studio or Ollama."
                      options={providerSelectOptions}
                      value={modelDraft.provider}
                      onValueChange={(v) => setModelDraft((d) => ({ ...d, provider: v }))}
                    />
                  </div>
                  {modelDraft.provider === CUSTOM_PROVIDER ? (
                    <Input
                      label="Custom provider name"
                      placeholder="my-gateway"
                      value={modelDraft.providerCustom}
                      onChange={(e) => setModelDraft((d) => ({ ...d, providerCustom: e.target.value }))}
                    />
                  ) : null}
                  <Input
                    label="Base URL"
                    placeholder={
                      MODEL_PRESETS.find((p) => p.baseUrlPlaceholder && modelDraft.provider === p.provider)?.baseUrlPlaceholder ??
                      "http://192.168.1.20:1234/v1"
                    }
                    value={modelDraft.base_url}
                    onChange={(e) => setModelDraft((d) => ({ ...d, base_url: e.target.value }))}
                    error={modelUrlError ?? undefined}
                  />
                  <Button type="submit" size="sm">
                    {editingModelId ? "Save model" : "Add model"}
                  </Button>
                  {editingModelId ? (
                    <Button type="button" variant="ghost" size="sm" onClick={resetModelDraft}>
                      Cancel
                    </Button>
                  ) : null}
                </form>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "agents" ? (
        <div className="stack-lg">
          <Card
            title="Agent capability profiles"
            help="Each agent (maker, checker, researcher, or any crew role) carries skills, permitted tools, and a prioritized model list that falls back from a paid frontier choice to a free or local one when no budget is set. The maker can come from any channel (the internal loop, a human, or an agent session); the checker and other agents run to keep integrity regardless of who authored a change."
          >
            <div className="stack-lg">
              {roleEntries.length === 0 ? (
                <p className="mdn-faint">No agents are configured for this repo.</p>
              ) : (
                <>
                  <div style={{ maxWidth: 320 }}>
                    <Select
                      label="Agent"
                      hint="Which agent's capability profile to edit."
                      options={roleEntries.map(([role]) => ({ value: role, label: role }))}
                      value={roleEntries.some(([r]) => r === agentRole) ? agentRole : roleEntries[0][0]}
                      onValueChange={setAgentRole}
                    />
                  </div>

                  {(() => {
                    const role = roleEntries.some(([r]) => r === agentRole) ? agentRole : roleEntries[0][0];
                    const agent = config.roles[role] ?? { runner: "container", model: "" };
                    const skills = agent.skills ?? [];
                    const tools = agent.tools ?? [];
                    const priority = agent.models ?? (agent.model ? [agent.model] : []);
                    const chipRow = (
                      items: string[],
                      field: "skills" | "tools" | "models",
                      renderIndex: boolean,
                    ) =>
                      items.length === 0 ? (
                        <p className="mdn-faint" style={{ margin: "4px 0" }}>None yet.</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "4px 0" }}>
                          {items.map((item, i) => (
                            <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <StatusPill tone="neutral" size="sm">
                                {renderIndex ? `${i + 1}. ${item}` : item}
                              </StatusPill>
                              <IconButton icon="x" label={`Remove ${item}`} size="sm" onClick={() => removeFromRoleList(role, field, item)} />
                            </span>
                          ))}
                        </div>
                      );
                    return (
                      <div className="stack-lg" key={role}>
                        <div>
                          <p className="mdn-label">Skills</p>
                          {chipRow(skills, "skills", false)}
                          <form
                            style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                            onSubmit={(e) => {
                              e.preventDefault();
                              addToRoleList(role, "skills", newSkill);
                              setNewSkill("");
                            }}
                          >
                            <Input label="Add skill" placeholder="adversarial-review" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
                            <Button type="submit" size="sm">Add</Button>
                          </form>
                        </div>

                        <div>
                          <p className="mdn-label">Tools</p>
                          {chipRow(tools, "tools", false)}
                          <form
                            style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                            onSubmit={(e) => {
                              e.preventDefault();
                              addToRoleList(role, "tools", newTool);
                              setNewTool("");
                            }}
                          >
                            <Input label="Add tool" placeholder="web-search" value={newTool} onChange={(e) => setNewTool(e.target.value)} />
                            <Button type="submit" size="sm">Add</Button>
                          </form>
                        </div>

                        <div>
                          <p className="mdn-label">Model priority (fallback order)</p>
                          {chipRow(priority, "models", true)}
                          <form
                            style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (priorityModelToAdd) addToRoleList(role, "models", priorityModelToAdd);
                            }}
                          >
                            <div style={{ minWidth: 220 }}>
                              <Select
                                label="Add model"
                                hint="Appended as the next fallback. The first entry is the primary; later entries run only if an earlier one is unaffordable or unreachable."
                                options={[{ value: "", label: "Select a model…" }, ...modelOptions]}
                                value={priorityModelToAdd}
                                onValueChange={setPriorityModelToAdd}
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={!priorityModelToAdd}>Add</Button>
                          </form>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "providers" ? (
        <div className="stack-lg">
          <Card title="Provider registry overrides" help="Redefines or extends the built-in provider registry (anthropic, local, github-models, openai-compatible) for this repo only.">
            <div className="stack-lg">
              {providerRows.length === 0 ? (
                <p className="mdn-faint">No custom providers yet. The built-in registry covers anthropic, local, github-models, and openai-compatible; add one here only to override a transport, cost class, or auth env var.</p>
              ) : (
                <Table<ProviderRow>
                  columns={[
                    { key: "id", header: "Provider", render: (row) => <span className="mdn-mono">{row.id}</span> },
                    { key: "transport", header: "Transport", render: (row) => row.transport ?? <span className="mdn-faint">&mdash;</span> },
                    { key: "costClass", header: "Cost class", render: (row) => row.costClass ?? <span className="mdn-faint">&mdash;</span> },
                    { key: "authEnv", header: "Auth env var", render: (row) => <span className="mdn-mono">{row.authEnv ?? <span className="mdn-faint">&mdash;</span>}</span> },
                    {
                      key: "actions",
                      header: "",
                      align: "right",
                      render: (row) => (
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <IconButton icon="settings" label={`Edit ${row.id}`} size="sm" onClick={() => startEditProvider(row.id)} />
                          <IconButton icon="x" label={`Remove ${row.id}`} size="sm" variant="danger" onClick={() => removeProvider(row.id)} />
                        </div>
                      ),
                    },
                  ]}
                  rows={providerRows}
                  getRowKey={(row) => row.id}
                />
              )}

              <div>
                <p className="mdn-label" style={{ marginBottom: 8 }}>
                  {editingProviderId ? `Editing "${editingProviderId}"` : "Add a provider override"}
                </p>
                <form style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }} onSubmit={submitProvider}>
                  <Input
                    label="Provider name"
                    placeholder="my-gateway"
                    value={providerDraft.id}
                    disabled={editingProviderId !== null}
                    onChange={(e) => setProviderDraft((d) => ({ ...d, id: e.target.value }))}
                    error={providerIdError ?? undefined}
                  />
                  <Input
                    label="Transport"
                    placeholder="openai-http"
                    value={providerDraft.transport}
                    onChange={(e) => setProviderDraft((d) => ({ ...d, transport: e.target.value }))}
                  />
                  <div style={{ minWidth: 160 }}>
                    <Select
                      label="Cost class"
                      hint="Whether the budget gate treats calls on this provider as billable spend."
                      options={COST_CLASS_OPTIONS}
                      value={providerDraft.costClass}
                      onValueChange={(v) => setProviderDraft((d) => ({ ...d, costClass: v }))}
                    />
                  </div>
                  <Input
                    label="Auth env var"
                    placeholder="OPENAI_API_KEY"
                    value={providerDraft.authEnv}
                    onChange={(e) => setProviderDraft((d) => ({ ...d, authEnv: e.target.value }))}
                  />
                  <Button type="submit" size="sm">
                    {editingProviderId ? "Save provider" : "Add provider"}
                  </Button>
                  {editingProviderId ? (
                    <Button type="button" variant="ghost" size="sm" onClick={resetProviderDraft}>
                      Cancel
                    </Button>
                  ) : null}
                </form>
              </div>
            </div>
          </Card>

          <Card title="Runners" help="Where each role's work actually executes: labels the runner must match, and the CLI path the engine invokes there. The runner set itself (local, container) is fixed by the schema; only its fields are editable.">
            <div className="stack-lg">
              <Table<RunnerRow>
                columns={[
                  { key: "id", header: "Runner", render: (row) => <span className="mdn-mono">{row.id}</span> },
                  { key: "labels", header: "Labels", render: (row) => <span className="mdn-mono">{row.labels.join(", ")}</span> },
                  { key: "cli_path", header: "CLI path", render: (row) => <span className="mdn-mono">{row.cli_path}</span> },
                  {
                    key: "actions",
                    header: "",
                    align: "right",
                    render: (row) => (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <IconButton icon="settings" label={`Edit ${row.id}`} size="sm" onClick={() => startEditRunner(row.id)} />
                      </div>
                    ),
                  },
                ]}
                rows={runnerRows}
                getRowKey={(row) => row.id}
              />

              {editingRunnerId ? (
                <div className="stack-lg">
                  <p className="mdn-label">Editing "{editingRunnerId}"</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <Input
                      label="CLI path"
                      placeholder="claude"
                      value={runnerCliPath}
                      onChange={(e) => setRunnerCliPath(e.target.value)}
                      onBlur={saveRunnerCliPath}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setEditingRunnerId(null)}>
                      Done
                    </Button>
                  </div>
                  <div>
                    <p className="mdn-label" style={{ marginBottom: 8 }}>Labels</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      {(config.runners[editingRunnerId]?.labels ?? []).map((label) => (
                        <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <StatusPill tone="neutral" size="sm">
                            {label}
                          </StatusPill>
                          <IconButton icon="x" label={`Remove ${label}`} size="sm" onClick={() => removeRunnerLabel(label)} />
                        </span>
                      ))}
                    </div>
                    <form
                      style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        addRunnerLabel();
                      }}
                    >
                      <Input
                        label="Add label"
                        placeholder="mac-mini"
                        value={newRunnerLabel}
                        onChange={(e) => setNewRunnerLabel(e.target.value)}
                      />
                      <Button type="submit" size="sm">
                        Add
                      </Button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "trust" ? (
        <div className="grid grid-2">
          <Card title="Trusted author allowlist" help="Pull requests authored by these identities skip some friction. An empty list means every change parks for owner review.">
            <div className="stack-lg">
              {config.trusted_author_allowlist.length === 0 ? (
                <p className="mdn-faint">
                  Empty. Every change parks for owner review until an author is added here.
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {config.trusted_author_allowlist.map((author) => (
                    <span key={author} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <StatusPill tone="info" size="sm">
                        {author}
                      </StatusPill>
                      <IconButton icon="x" label={`Remove ${author}`} size="sm" onClick={() => removeAuthor(author)} />
                    </span>
                  ))}
                </div>
              )}
              <form
                style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  addAuthor();
                }}
              >
                <Input
                  label="Add author"
                  placeholder="modonome-maker[bot]"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                />
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>
            </div>
          </Card>
          <Card title="Protected paths (extra)" help="Additional paths, beyond the built-in defaults, that require explicit owner approval before a change can merge.">
            <div className="stack-lg">
              {config.protected_paths_extra.length === 0 ? (
                <p className="mdn-faint">No additional protected paths configured.</p>
              ) : (
                <div className="list-plain">
                  {config.protected_paths_extra.map((path) => (
                    <span key={path} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span className="mdn-mono">{path}</span>
                      <IconButton icon="x" label={`Remove ${path}`} size="sm" onClick={() => removePath(path)} />
                    </span>
                  ))}
                </div>
              )}
              <form
                style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  addPath();
                }}
              >
                <Input
                  label="Add path"
                  placeholder="infra/"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                />
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>
              <p className="mdn-faint" style={{ margin: 0 }}>
                Additions are allowed. Removals require owner approval, which is why removing a path
                confirms separately from the rest of Save configuration.
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "network" ? (
        <Card
          title="Cross-repo sharing"
          help="These levers let the engine see or share information across repositories. All four are off by default because each one expands the trust surface beyond a single repo."
        >
          <div className="stack-lg">
            <p className="mdn-faint">
              Off by default. Turning any of these on expands what the engine can see or share
              beyond this repo, so treat each one as a deliberate, owner-level decision.
            </p>
            <div className="grid grid-2">
              <Toggle
                label="Cross-repo network enabled"
                hint="Lets the engine participate in the cross-repo network at all."
                checked={config.repo_network_enabled}
                onCheckedChange={(v) => set("repo_network_enabled", v)}
              />
              <Toggle
                label="Cross-repo network dry-run"
                tone="info"
                hint="When on, cross-repo activity is proposed but nothing is shared or written."
                checked={config.repo_network_dry_run}
                onCheckedChange={(v) => set("repo_network_dry_run", v)}
              />
              <Toggle
                label="Share raw code across repos"
                tone="owner"
                hint="Allows raw code snippets, not just summaries, to cross repo boundaries."
                checked={config.share_raw_code_across_repos}
                onCheckedChange={(v) => set("share_raw_code_across_repos", v)}
              />
              <Toggle
                label="Share repo identifiers by default"
                tone="owner"
                hint="Includes this repo's identifying details in cross-repo exchanges by default."
                checked={config.share_repo_identifiers_by_default}
                onCheckedChange={(v) => set("share_repo_identifiers_by_default", v)}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "market" ? (
        <Card title="Market scan" help="Lets the engine scan for external claims worth acting on. New claims can still require explicit owner approval.">
          <div className="grid grid-2">
            <Toggle
              label="Market scan enabled"
              hint="Allows the engine to scan external sources for claims worth evaluating."
              checked={config.market_scan_enabled}
              onCheckedChange={(v) => set("market_scan_enabled", v)}
            />
            <Toggle
              label="Owner approval required for new claims"
              tone="owner"
              hint="New claims surfaced by market scan wait for explicit owner approval before acting."
              checked={config.owner_approval_required_for_new_claims}
              onCheckedChange={(v) => set("owner_approval_required_for_new_claims", v)}
            />
          </div>
        </Card>
      ) : null}

      {tab === "remediation" ? (
        <div className="stack-lg">
          <Card
            title="Metadata-only remediator"
            help="The armed remediator (ADR-035) rewrites commit metadata to strip attribution signatures, and is proven to change no file content (every rewritten commit keeps its tree). Apply is a CLI action; this panel enables the capability and shows its readiness."
          >
            <div className="stack-lg">
              <p className="mdn-faint">
                Off by default. Even with the capability on, apply stays inert until the engine is
                armed through the environment, so turning this on is a deliberate owner-level decision.
              </p>
              <Toggle
                label="Remediation apply enabled"
                tone="owner"
                hint="Lets `modonome remediate apply` rewrite commit metadata, but only once the engine is also armed with MODONOME_ARMED, which the panel cannot set."
                checked={config.remediation_apply_enabled}
                onCheckedChange={(v) => set("remediation_apply_enabled", v)}
              />
              <div>
                <StatusPill tone={state.remediation?.ready ? "ok" : "attention"} size="sm">
                  {state.remediation?.ready ? "Apply is ready" : "Apply is inert"}
                </StatusPill>
                {state.remediation && state.remediation.blockers.length > 0 ? (
                  <ul className="mdn-faint" style={{ marginTop: 8 }}>
                    {state.remediation.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mdn-faint" style={{ marginTop: 8 }}>
                    Every arming condition is met. Apply would run against unpublished commits only.
                  </p>
                )}
              </div>
            </div>
          </Card>
          <Card
            title="Proposed rewrites"
            help="What `remediate plan` would rewrite on the current branch: unpublished commits carrying an agent identity or an attribution signature. Read-only; nothing is applied from here."
          >
            {!state.remediation || state.remediation.proposalCount === 0 ? (
              <p className="mdn-faint">No commit on the current branch needs a metadata rewrite.</p>
            ) : (
              <div className="stack-lg">
                <p className="mdn-faint">
                  {state.remediation.proposalCount} commit(s) would be rewritten. Fingerprint{" "}
                  <code className="mdn-mono">{state.remediation.fingerprint}</code>.
                </p>
                <div className="list-plain">
                  {state.remediation.proposals.map((p) => (
                    <div key={p.sha} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="mdn-mono">{p.sha.slice(0, 9)}</span>
                      <span className="mdn-faint">{p.reasons.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
