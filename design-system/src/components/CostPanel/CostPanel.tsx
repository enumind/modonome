import { formatUsd } from "../../lib/format";
import { ProgressMeter } from "../ProgressMeter/ProgressMeter";
import { StatusPill, type StatusPillTone } from "../StatusPill/StatusPill";
import { Table, type TableColumn } from "../Table/Table";

export type ModelCostClass = "paid" | "free" | "local";

export interface ModelCostRow {
  /** Model identifier, e.g. "claude-sonnet-5" or "llama-3-70b". Rendered in mono. */
  model: string;
  /** Provider or host serving the model, e.g. "Anthropic" or "local ollama". */
  provider: string;
  /** Billing class for this model: incurs paid spend, is a free tier, or runs locally. */
  costClass: ModelCostClass;
  /** Number of calls made to this model in the period. */
  calls: number;
  /** Total spend attributed to this model in the period, in USD. */
  usd: number;
}

export interface CostSummary {
  /** Daily remote spend budget in USD. A value of 0 means remote spend is disabled entirely. */
  budgetUsd: number;
  /** Remote spend so far in the period, in USD. */
  spentUsd: number;
  /** Number of calls served locally (no remote spend). */
  localCalls: number;
  /** Number of calls served by a remote model. */
  remoteCalls: number;
  /** Number of calls avoided by serving a cached or retried result instead of a fresh remote call. */
  cacheSaves: number;
  /** Per-model breakdown of calls and spend. */
  byModel: ModelCostRow[];
}

export interface CostPanelProps {
  /** The cost data to render. */
  cost: CostSummary;
}

const CLASS_TONE: Record<ModelCostClass, StatusPillTone> = {
  local: "ok",
  free: "info",
  paid: "attention",
};

const CLASS_LABEL: Record<ModelCostClass, string> = {
  local: "Local",
  free: "Free",
  paid: "Paid",
};

const COLUMNS: TableColumn<ModelCostRow>[] = [
  {
    key: "model",
    header: "Model",
    render: (row) => <span className="mdn-mono">{row.model}</span>,
  },
  {
    key: "provider",
    header: "Provider",
  },
  {
    key: "costClass",
    header: "Class",
    render: (row) => (
      <StatusPill tone={CLASS_TONE[row.costClass]} size="sm">
        {CLASS_LABEL[row.costClass]}
      </StatusPill>
    ),
  },
  {
    key: "calls",
    header: "Calls",
    align: "right",
    render: (row) => <span className="mdn-mono">{row.calls}</span>,
  },
  {
    key: "usd",
    header: "Spend",
    align: "right",
    render: (row) => <span className="mdn-mono">{formatUsd(row.usd)}</span>,
  },
];

/**
 * A summary of model spend and call volume for a period: a budget meter for remote
 * USD spend, a small stat row of local calls, remote calls, and cache saves (framed
 * positively as retries avoided), and a per-model breakdown table. When the budget is
 * 0 (remote spend disabled), the meter is replaced with a plain "local only" note to
 * avoid a divide-by-zero or misleading empty bar.
 */
export function CostPanel({ cost }: CostPanelProps) {
  const { budgetUsd, spentUsd, localCalls, remoteCalls, cacheSaves, byModel } = cost;

  return (
    <div className="mdn-costpanel">
      <div className="mdn-costpanel__budget">
        {budgetUsd > 0 ? (
          <ProgressMeter
            value={spentUsd}
            max={budgetUsd}
            label="Daily remote budget"
            unit="USD"
            tone="owner"
          />
        ) : (
          <div className="mdn-costpanel__localonly">
            <span className="mdn-progressmeter__label mdn-label">Daily remote budget</span>
            <span className="mdn-costpanel__localonly-note mdn-faint">Local only, no remote spend</span>
          </div>
        )}
      </div>

      <div className="mdn-costpanel__stats">
        <div className="mdn-costpanel__stat">
          <span className="mdn-costpanel__stat-value mdn-mono">{localCalls}</span>
          <span className="mdn-costpanel__stat-label mdn-label">Local calls</span>
        </div>
        <div className="mdn-costpanel__stat">
          <span className="mdn-costpanel__stat-value mdn-mono">{remoteCalls}</span>
          <span className="mdn-costpanel__stat-label mdn-label">Remote calls</span>
        </div>
        <div className="mdn-costpanel__stat">
          <span className="mdn-costpanel__stat-value mdn-mono">{cacheSaves}</span>
          <span className="mdn-costpanel__stat-label mdn-label">Retries avoided</span>
        </div>
      </div>

      <Table
        columns={COLUMNS}
        rows={byModel}
        getRowKey={(row) => `${row.model}:${row.provider}`}
        dense
        empty={<span className="mdn-faint">No model calls in this period</span>}
      />
    </div>
  );
}
