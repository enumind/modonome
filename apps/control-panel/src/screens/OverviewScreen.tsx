import { useState } from "react";
import {
  MetricTile,
  SafetyStrip,
  QueueBoard,
  CostPanel,
  AuditTimeline,
  Card,
  Button,
  Sparkline,
  Icon,
  IconButton,
  Input,
  Carousel,
  ConceptTile,
  HoverCard,
  formatUsd,
} from "@modonome/design-system";
import type { PanelState } from "../state/types";
import { CONCEPTS } from "../content/concepts";

/**
 * Mission control: the "is it safe, is it working" glance. Arming posture, the safety
 * strip, the live queue, spend to date, gate health, and the most recent activity.
 */
export function OverviewScreen({
  state,
  onNavigate,
  hostDir,
  onConnectHostDir,
  onRefresh,
}: {
  state: PanelState;
  onNavigate: (id: string) => void;
  hostDir: string;
  onConnectHostDir: (dir: string) => void;
  onRefresh: () => void;
}) {
  const { subject, config, arming, queue, cost, audit, agentProofScore, gauntletScore, gauntletApplicable, costTrend, source } = state;
  const active = queue.filter((i) => i.state !== "done").length;
  const escalated = queue.filter((i) => i.state === "escalated").length;
  const blocking = arming.checklist.filter((c) => !c.ok).length;
  const [draftDir, setDraftDir] = useState(hostDir);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">{subject.description}</p>
        </div>
        <div className="page-head__actions">
          <Button variant="secondary" iconLeft="shield" onClick={() => onNavigate("arming")}>
            Arming &amp; safety
          </Button>
        </div>
      </div>

      {source.kind === "live" ? (
        <div className="data-source-banner data-source-banner--live">
          <Icon name="check-circle" size={18} />
          <span className="data-source-banner__text">
            <strong>Live.</strong> Reading real state from <code className="mdn-mono">{subject.dir}</code>.{" "}
            {source.writable
              ? "Write mode is on: actions here edit the real files."
              : "Read-only: start the dev server with MODONOME_PANEL_WRITE=1 to allow edits."}
          </span>
          <IconButton icon="refresh" label="Refresh panel data" size="sm" onClick={onRefresh} />
        </div>
      ) : (
        <div className="data-source-banner data-source-banner--demo">
          <Icon name="info" size={18} />
          <span className="data-source-banner__text">
            <strong>Demo data.</strong>{" "}
            {subject.mode === "host"
              ? "Point the panel at a real repo's path below to read its actual .modonome state."
              : "The local API did not respond, so this is a fixed snapshot instead of the live repo."}
            {source.error ? ` (${source.error})` : ""}
          </span>
          {subject.mode === "host" ? (
            <form
              className="hostdir-form"
              onSubmit={(e) => {
                e.preventDefault();
                onConnectHostDir(draftDir.trim());
              }}
            >
              <Input
                label="Repo path"
                placeholder="/path/to/a/repo/with/.modonome"
                value={draftDir}
                onChange={(e) => setDraftDir(e.target.value)}
              />
              <Button type="submit" size="sm" variant="primary">
                Connect
              </Button>
            </form>
          ) : (
            <IconButton icon="refresh" label="Retry" size="sm" onClick={onRefresh} />
          )}
        </div>
      )}

      {subject.requiredOwnerAction ? (
        <div className="owner-action">
          <Icon name="alert" size={18} />
          <span>{subject.requiredOwnerAction}</span>
        </div>
      ) : null}

      <div className="grid grid-4">
        <MetricTile
          label="Arming mode"
          value={arming.mode === "dry-run" ? "Dry-run" : arming.mode === "armed" ? "Armed" : "Disabled"}
          icon={arming.mode === "armed" ? "shield" : "power"}
          tone={arming.mode === "armed" ? "ok" : arming.mode === "dry-run" ? "info" : "neutral"}
          hint="Disabled proposes nothing, dry-run proposes without writing, armed can open and merge changes once every gate passes."
          sub={blocking === 0 ? "All prerequisites clear" : `${blocking} prerequisite(s) blocking`}
        />
        <MetricTile
          label="Active work"
          value={active}
          unit="items"
          icon="queue"
          tone={escalated > 0 ? "attention" : "neutral"}
          hint="Work items not yet done, across every state of the queue."
          sub={escalated > 0 ? `${escalated} escalated to owner` : "None escalated"}
        />
        <MetricTile
          label="Spend today"
          value={cost.budgetUsd === 0 ? "Local" : formatUsd(cost.spentUsd)}
          icon="cost"
          tone="neutral"
          hint="Remote model spend against the daily budget. Local models cost nothing."
          sub={cost.budgetUsd === 0 ? "Local models only" : `of ${formatUsd(cost.budgetUsd)} budget`}
          trend={cost.budgetUsd === 0 ? undefined : <Sparkline data={costTrend.map((p) => p.value)} tone="owner" />}
        />
        <MetricTile
          label="AgentProof"
          value={`${agentProofScore}/25`}
          icon="check-circle"
          tone="ok"
          hint="Score on the adversarial gate-integrity benchmark. 25 of 25 is fully hardened against known gaming patterns."
          sub="Gate integrity"
        />
        {gauntletScore !== undefined && (
          <MetricTile
            label="Gauntlet"
            value={`${gauntletScore}/${gauntletApplicable}`}
            icon="check-circle"
            tone={gauntletScore === gauntletApplicable ? "ok" : "attention"}
            hint="Would this repo's own configured gate catch a real gate-weakening attack? Run npx modonome gauntlet to update."
            sub="Your gates, replayed"
          />
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Safety strip</h2>
        <Card>
          <SafetyStrip
            autonomyEnabled={config.autonomy_enabled}
            dryRun={config.dry_run}
            autoMerge={config.auto_merge}
            mergeCap={config.max_merges_per_day}
            budgetUsd={config.remote_model_budget_usd_per_day}
            branchProtection={config.require_branch_protection}
            codeOwners={config.require_codeowner_review}
            trustedAuthors={config.trusted_author_allowlist.length}
          />
        </Card>
      </div>

      <div className="section">
        <div className="page-head">
          <h2 className="section-title">Work queue</h2>
          <Button variant="ghost" size="sm" iconRight="arrow-right" onClick={() => onNavigate("queue")}>
            Open queue
          </Button>
        </div>
        <QueueBoard items={queue} onSelect={() => onNavigate("queue")} />
      </div>

      <div className="grid grid-2">
        <div className="section">
          <h2 className="section-title">Cost</h2>
          <Card title="Model spend" help="Local versus remote calls, budget consumed, and retries avoided by cache or reuse.">
            <CostPanel cost={cost} />
          </Card>
        </div>
        <div className="section">
          <h2 className="section-title">Recent activity</h2>
          <Card title="Audit timeline" help="Dry-run decisions, pull requests, merges, and escalations in reverse order.">
            <AuditTimeline events={audit} limit={5} />
          </Card>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Key concepts</h2>
        <p className="mdn-faint" style={{ margin: 0 }}>
          Hover or focus a card for a plain-language summary, sourced from this repo's own
          documentation.
        </p>
        <Carousel label="Modonome key concepts">
          {CONCEPTS.map((concept) => (
            <HoverCard key={concept.id} title={concept.title} body={concept.body} source={concept.source}>
              <ConceptTile icon={concept.icon} label={concept.label} tag={concept.tag} />
            </HoverCard>
          ))}
        </Carousel>
      </div>
    </div>
  );
}
