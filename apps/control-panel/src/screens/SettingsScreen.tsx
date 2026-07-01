import { useState } from "react";
import { Card, RoleBadge, Select, Table, StatusPill, Toggle } from "@modonome/design-system";
import type { ModonomeConfig } from "../state/types";
import type { PanelState } from "../state/types";

const ROLE_BADGE: Record<string, "maker" | "checker" | "maintainer"> = {
  maker: "maker",
  checker: "checker",
  "self-govern": "maintainer",
};

interface ModelRow {
  id: string;
  provider: string;
  base_url?: string;
}

/**
 * The advanced-configuration screen. Most operators rarely touch this: which runner
 * and model each governance role uses, the trusted-author and protected-path
 * boundaries, and the cross-repo and market-scan surfaces that are off by default
 * because they widen what the engine can see or share.
 */
export function SettingsScreen({ state }: { state: PanelState }) {
  const [config, setConfig] = useState<ModonomeConfig>(state.config);

  function set<K extends keyof ModonomeConfig>(key: K, value: ModonomeConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function setRoleModel(role: string, model: string) {
    setConfig((c) => ({
      ...c,
      roles: { ...c.roles, [role]: { ...c.roles[role], model } },
    }));
  }

  const modelOptions = Object.keys(config.models).map((id) => ({ value: id, label: id }));
  const modelRows: ModelRow[] = Object.entries(config.models).map(([id, m]) => ({
    id,
    provider: m.provider,
    base_url: m.base_url,
  }));
  const roleEntries = Object.entries(config.roles);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Advanced configuration. Most operators rarely change these.</p>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Roles and models</h2>
        <Card title="Governance roles" help="Each role runs a specific runner and model. Distinct maker and checker models are enforced separately in Arming &amp; Safety.">
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
                    options={modelOptions}
                    value={assignment.model}
                    onValueChange={(v) => setRoleModel(role, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
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
      </div>

      <div className="section">
        <h2 className="section-title">Trusted authors and protected paths</h2>
        <div className="grid grid-2">
          <Card title="Trusted author allowlist" help="Pull requests authored by these identities skip some friction. An empty list means every change parks for owner review.">
            {config.trusted_author_allowlist.length === 0 ? (
              <p className="mdn-faint">
                Empty. Every change parks for owner review until an author is added here.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {config.trusted_author_allowlist.map((author) => (
                  <StatusPill key={author} tone="info" size="sm">
                    {author}
                  </StatusPill>
                ))}
              </div>
            )}
          </Card>
          <Card title="Protected paths (extra)" help="Additional paths, beyond the built-in defaults, that require explicit owner approval before a change can merge.">
            {config.protected_paths_extra.length === 0 ? (
              <p className="mdn-faint">No additional protected paths configured.</p>
            ) : (
              <div className="list-plain">
                {config.protected_paths_extra.map((path) => (
                  <span key={path} className="mdn-mono">
                    {path}
                  </span>
                ))}
              </div>
            )}
            <p className="mdn-faint" style={{ margin: "12px 0 0" }}>
              Additions are allowed. Removals require owner approval.
            </p>
          </Card>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Cross-repo network</h2>
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
      </div>

      <div className="section">
        <h2 className="section-title">Market scan</h2>
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
      </div>
    </div>
  );
}
