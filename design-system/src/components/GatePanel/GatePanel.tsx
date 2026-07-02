import { cx } from "../../lib/cx";
import { formatDuration } from "../../lib/format";
import { Icon, type IconName } from "../Icon/Icon";
import { StatusPill, type StatusPillTone } from "../StatusPill/StatusPill";

export type GateStatus = "pass" | "fail" | "flaky" | "running" | "pending";

export interface GateRow {
  /** Human-readable gate name, e.g. "anti-gaming ratchet" or "unit tests". Rendered in mono. */
  name: string;
  /** Current outcome of the gate. */
  status: GateStatus;
  /** How long the gate took to run, in milliseconds. Omitted while the gate has never run. */
  durationMs?: number;
  /** ISO timestamp or short label describing when the gate last ran. Currently unused for display but kept for caller record-keeping. */
  lastRun?: string;
  /** Whether this gate must pass before merge is allowed, versus an informational gate. */
  required: boolean;
  /** Optional extra context, such as a failure reason or flake note, shown muted below the row. */
  detail?: string;
}

export interface GatePanelProps {
  /** The gates to render, in display order (recommended: required gates first). */
  gates: GateRow[];
  /** Accessible name for the list region. Not rendered visibly; give the panel a
   * visible heading with a wrapping Card title instead. Defaults to "CI gates". */
  title?: string;
}

const STATUS_ICON: Record<GateStatus, IconName> = {
  pass: "check-circle",
  fail: "ban",
  flaky: "alert",
  running: "refresh",
  pending: "clock",
};

const STATUS_TONE: Record<GateStatus, StatusPillTone> = {
  pass: "ok",
  fail: "blocked",
  flaky: "attention",
  running: "info",
  pending: "neutral",
};

const STATUS_LABEL: Record<GateStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  flaky: "Flaky",
  running: "Running",
  pending: "Pending",
};

/**
 * A vertical list of CI gate rows, used to visualize the merge-blocking checks and
 * the anti-gaming ratchet on a work item or pipeline. Each row pairs an icon, a color,
 * and a text label for its status (status is never carried by color alone), shows the
 * gate name in mono, marks whether the gate is required or optional, and right-aligns
 * its duration. Optional detail text (a failure reason or flake note) renders muted
 * beneath the row when present.
 */
export function GatePanel({ gates, title = "CI gates" }: GatePanelProps) {
  return (
    <section className="mdn-gatepanel" aria-label={title}>
      <ul className="mdn-gatepanel__list">
        {gates.map((gate) => (
          <li key={gate.name} className={cx("mdn-gatepanel__row", `mdn-gatepanel__row--${gate.status}`)}>
            <div className="mdn-gatepanel__main">
              <Icon
                name={STATUS_ICON[gate.status]}
                size={16}
                className={cx("mdn-gatepanel__icon", `mdn-gatepanel__icon--${gate.status}`)}
              />
              <StatusPill tone={STATUS_TONE[gate.status]} size="sm">
                {STATUS_LABEL[gate.status]}
              </StatusPill>
              <span className="mdn-gatepanel__name mdn-mono">{gate.name}</span>
              <span className={cx("mdn-gatepanel__required", gate.required && "mdn-gatepanel__required--on")}>
                {gate.required ? "required" : "optional"}
              </span>
              <span className="mdn-spacer" />
              {gate.durationMs != null ? (
                <span className="mdn-gatepanel__duration mdn-mono">{formatDuration(gate.durationMs)}</span>
              ) : null}
            </div>
            {gate.detail ? <p className="mdn-gatepanel__detail mdn-faint">{gate.detail}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
