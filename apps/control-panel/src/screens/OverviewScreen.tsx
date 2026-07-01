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
  formatUsd,
} from "@modonome/design-system";
import type { PanelState } from "../state/types";

/**
 * Mission control: the "is it safe, is it working" glance. Arming posture, the safety
 * strip, the live queue, spend to date, gate health, and the most recent activity.
 */
export function OverviewScreen({
  state,
  onNavigate,
}: {
  state: PanelState;
  onNavigate: (id: string) => void;
}) {
  const { subject, config, arming, queue, cost, audit, agentProofScore, costTrend } = state;
  const active = queue.filter((i) => i.state !== "done").length;
  const escalated = queue.filter((i) => i.state === "escalated").length;
  const blocking = arming.checklist.filter((c) => !c.ok).length;

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
    </div>
  );
}
