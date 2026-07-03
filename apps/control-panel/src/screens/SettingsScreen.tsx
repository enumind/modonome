import { useMemo, useState } from "react";
import { Card, RoleBadge, Select, Table, StatusPill, Toggle, Button, IconButton, Input, Tabs, Toast } from "@modonome/design-system";
import type { ModonomeConfig, WriteActions } from "../state/types";
import type { PanelState } from "../state/types";
import { useConfirm } from "../lib/confirm";
import { diffConfig } from "../state/configDiff";

const ROLE_BADGE: Record<string, "maker" | "checker" | "maintainer"> = {
  maker: "maker",
  checker: "checker",
  "self-govern": "maintainer",
};

const TABS = [
  { id: "roles", label: "Roles & models", icon: "users" as const },
  { id: "trust", label: "Trusted authors & paths", icon: "lock" as const },
  { id: "network", label: "Cross-repo network", icon: "branch" as const },
  { id: "market", label: "Market scan", icon: "activity" as const },
  { id: "remediation", label: "Remediation", icon: "shield" as const },
];

interface ModelRow {
  id: string;
  provider: string;
  base_url?: string;
}

interface RunnerRow {
  id: string;
  labels: string[];
  cli_path: string;
}

/**
 * The advanced-configuration screen, one conceptual area per tab so nothing forces an
 * operator to scroll past three unrelated subsystems to reach the one they came for.
 * Role and model assignment (nested YAML) stays read-only from here; edit config.yaml
 * directly for that. Every other field is a local draft until "Save configuration"
 * writes it to config.yaml.
 */
export function SettingsScreen({ state, write }: { state: PanelState; write: WriteActions }) {
  const confirm = useConfirm();
  const [tab, setTab] = useState("roles");
  const [config, setConfig] = useState<ModonomeConfig>(state.config);
  const [newAuthor, setNewAuthor] = useState("");
  const [newPath, setNewPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "blocked"; text: string } | null>(null);

  function set<K extends keyof ModonomeConfig>(key: K, value: ModonomeConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function setRoleModel(role: string, model: string) {
    setConfig((c) => ({
      ...c,
      roles: { ...c.roles, [role]: { ...c.roles[role], model } },
    }));
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

  const patch = useMemo(() => diffConfig(state.config, config), [state.config, config]);
  const dirty = Object.keys(patch).length > 0;

  async function onSave() {
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
  const runnerRows: RunnerRow[] = Object.entries(config.runners ?? {}).map(([id, r]) => ({
    id,
    labels: r.labels,
    cli_path: r.cli_path,
  }));
  const roleEntries = Object.entries(config.roles);

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
          Read-only: changes below stay local until the panel is connected to live, writable state
          (start the dev server with <code className="mdn-mono">MODONOME_PANEL_WRITE=1</code>).
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
          <Card title="Governance roles" help="Each role runs a specific runner and model. Distinct maker and checker models are enforced separately in Arming &amp; Safety. This assignment lives in a nested part of config.yaml the panel does not write; edit the file directly to change it for real.">
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
          {modelRows.length > 0 ? (
            <Card title="Models" help="Every model id available to assign to a role, its provider, and its base URL when one is configured.">
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
                ]}
                rows={modelRows}
                getRowKey={(row) => row.id}
              />
            </Card>
          ) : null}
          {runnerRows.length > 0 ? (
            <Card title="Runners" help="Where each role's work actually executes: labels the runner must match, and the CLI path the engine invokes there.">
              <Table<RunnerRow>
                columns={[
                  { key: "id", header: "Runner", render: (row) => <span className="mdn-mono">{row.id}</span> },
                  { key: "labels", header: "Labels", render: (row) => <span className="mdn-mono">{row.labels.join(", ")}</span> },
                  { key: "cli_path", header: "CLI path", render: (row) => <span className="mdn-mono">{row.cli_path}</span> },
                ]}
                rows={runnerRows}
                getRowKey={(row) => row.id}
              />
            </Card>
          ) : null}
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
