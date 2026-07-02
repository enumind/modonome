import { cx } from "../../lib/cx";
import { Icon } from "../Icon/Icon";
import { StatusPill, type StatusPillTone } from "../StatusPill/StatusPill";
import { TierBadge } from "../TierBadge/TierBadge";
import { type RiskTier, type WorkState, workStateLabels } from "../../tokens/tokens";

/**
 * Plain data shape for a single work item as shown in a compact card. Components in
 * this package define their own shape rather than importing app-level types, so this
 * interface is the contract a host app maps its own work-item records onto.
 */
export interface WorkItemSummary {
  /** Stable work-item identifier, e.g. "wi-4821". Shown in muted mono next to the title. */
  id: string;
  /** Human-readable title of the change the item represents. */
  title: string;
  /** Current position in the work-item flow. */
  state: WorkState;
  /** Risk tier, when the item has been classified. Omitted while still queued. */
  tier?: RiskTier;
  /** Display name of the owner accountable for the item, if assigned. */
  owner?: string;
  /** Git branch the work is happening on, if one exists yet. */
  branch?: string;
  /** Pull request identifier, e.g. "#482", once one has been opened. */
  pr?: string;
  /** Number of attempts made so far on this item. */
  attempts: number;
  /** Maximum attempts allowed before the item must escalate. */
  maxAttempts: number;
  /** Whether this item's diff touches a path the org has marked protected. */
  touchesProtectedPath: boolean;
  /** Model identifier used by the maker actor, e.g. "claude-sonnet-5". */
  makerModel?: string;
  /** Model identifier used by the checker actor, e.g. "claude-opus-4.8". */
  checkerModel?: string;
  /** Why the item escalated, when `state` is `escalated`. */
  escalationReason?: string;
}

export interface WorkItemCardProps {
  /** The work item to summarize. */
  item: WorkItemSummary;
  /** Called when the card is activated by click, Enter, or Space. When set, the card
   * renders as a keyboard-operable button instead of a static container. */
  onClick?: () => void;
}

const STATE_TONE: Record<WorkState, StatusPillTone> = {
  queued: "neutral",
  claimed: "info",
  making: "info",
  checking: "info",
  rework: "attention",
  merge_ready: "ok",
  merging: "ok",
  done: "ok",
  escalated: "blocked",
};

/**
 * A compact, clickable summary card for a single work item: title with its id,
 * current-state pill, risk tier, a protected-path lock indicator, attempt count, and
 * pull request number. Used in queue boards and search results where many items need
 * to be scanned quickly. Escalated items get a subtle danger accent on the leading
 * edge so they stand out in a dense list without relying on color alone (the state
 * pill also always renders the word "Escalated").
 */
export function WorkItemCard({ item, onClick }: WorkItemCardProps) {
  const tone = STATE_TONE[item.state];
  const content = (
    <>
      <div className="mdn-workitemcard__header">
        <div className="mdn-workitemcard__heading">
          <h3 className="mdn-workitemcard__title mdn-heading">{item.title}</h3>
          <span className="mdn-workitemcard__id mdn-mono mdn-faint">{item.id}</span>
        </div>
        {item.touchesProtectedPath ? (
          <span className="mdn-workitemcard__lock" title="Touches protected path">
            <Icon name="lock" size={13} />
            <span className="mdn-sr-only">Touches protected path</span>
          </span>
        ) : null}
      </div>
      <div className="mdn-workitemcard__meta">
        <StatusPill tone={tone} size="sm">
          {workStateLabels[item.state]}
        </StatusPill>
        {item.tier ? <TierBadge tier={item.tier} /> : null}
        <span className="mdn-workitemcard__attempts mdn-mono">
          attempt {item.attempts}/{item.maxAttempts}
        </span>
        {item.pr ? <span className="mdn-workitemcard__pr mdn-mono mdn-faint">{item.pr}</span> : null}
      </div>
    </>
  );

  const className = cx(
    "mdn-workitemcard",
    item.state === "escalated" && "mdn-workitemcard--escalated",
    onClick && "mdn-workitemcard--interactive",
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-label={item.title}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
