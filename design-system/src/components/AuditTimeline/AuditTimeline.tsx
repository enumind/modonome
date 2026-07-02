import { Icon, type IconName } from "../Icon/Icon";
import { relativeTime } from "../../lib/format";

/** The kind of event recorded in the audit trail. */
export type AuditEventKind =
  | "dry_run"
  | "report"
  | "maker_run"
  | "checker_review"
  | "pr_opened"
  | "gate_passed"
  | "gate_failed"
  | "ratchet_rejected"
  | "merged"
  | "escalated"
  | "learning_promoted"
  | "config_changed"
  | "mode_changed";

/**
 * Plain data shape for a single audit-trail event. Components in this package define
 * their own shape rather than importing app-level types, so this interface is the
 * contract a host app maps its own audit log entries onto.
 */
export interface AuditEvent {
  /** ISO timestamp of when the event occurred. */
  ts: string;
  /** What kind of event this is, driving its icon and color. */
  kind: AuditEventKind;
  /** The work item, learning, or config key the event relates to, when applicable. */
  item?: string;
  /** Human-readable description of what happened, e.g. "Checker rejected diff: missing tests." */
  detail: string;
}

export interface AuditTimelineProps {
  /** The events to display, expected to already be sorted newest first. */
  events: AuditEvent[];
  /** Maximum number of events to render. When omitted, all events are shown. */
  limit?: number;
}

type NodeTone = "ok" | "info" | "attention" | "blocked" | "neutral";

const KIND_META: Record<AuditEventKind, { icon: IconName; tone: NodeTone; label: string }> = {
  dry_run: { icon: "play", tone: "info", label: "Dry run" },
  report: { icon: "activity", tone: "neutral", label: "Report run" },
  maker_run: { icon: "user", tone: "neutral", label: "Maker run" },
  checker_review: { icon: "users", tone: "info", label: "Checker review" },
  pr_opened: { icon: "branch", tone: "info", label: "PR opened" },
  gate_passed: { icon: "check-circle", tone: "ok", label: "Gate passed" },
  gate_failed: { icon: "ban", tone: "blocked", label: "Gate failed" },
  ratchet_rejected: { icon: "shield", tone: "blocked", label: "Ratchet rejected" },
  merged: { icon: "merge", tone: "ok", label: "Merged" },
  escalated: { icon: "alert", tone: "attention", label: "Escalated" },
  learning_promoted: { icon: "spark", tone: "ok", label: "Learning promoted" },
  config_changed: { icon: "settings", tone: "neutral", label: "Config changed" },
  mode_changed: { icon: "power", tone: "info", label: "Mode changed" },
};

/**
 * A vertical audit trail with a connecting line down the left edge. Each event shows a
 * colored node carrying an icon for its kind (so the event type is never carried by
 * color alone), the relative time since it occurred (with the full timestamp available
 * on hover or focus via `title`), the related item id when present, and a plain-text
 * detail line. Pass `limit` to cap how many of the (assumed newest-first) events are
 * rendered, for compact placements like the project Overview.
 */
export function AuditTimeline({ events, limit }: AuditTimelineProps) {
  const shown = typeof limit === "number" ? events.slice(0, limit) : events;

  if (shown.length === 0) {
    return <p className="mdn-audittimeline__empty mdn-mono">No audit events yet.</p>;
  }

  return (
    <ol className="mdn-audittimeline">
      {shown.map((event, index) => {
        const meta = KIND_META[event.kind];
        return (
          <li className="mdn-audittimeline__row" key={`${event.ts}-${index}`}>
            <span className={`mdn-audittimeline__node mdn-audittimeline__node--${meta.tone}`}>
              <Icon name={meta.icon} size={13} title={meta.label} />
            </span>
            <div className="mdn-audittimeline__content">
              <div className="mdn-audittimeline__meta">
                <time className="mdn-audittimeline__time mdn-mono" dateTime={event.ts} title={event.ts}>
                  {relativeTime(event.ts)}
                </time>
                {event.item ? (
                  <span className="mdn-audittimeline__item mdn-mono">{event.item}</span>
                ) : null}
              </div>
              <p className="mdn-audittimeline__detail">{event.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
