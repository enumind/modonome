import type { ReactNode } from "react";
import { Drawer } from "../Drawer/Drawer";
import { IdentityChip } from "../IdentityChip/IdentityChip";
import { StatusPill, type StatusPillTone } from "../StatusPill/StatusPill";
import { TierBadge } from "../TierBadge/TierBadge";
import { type WorkItemSummary } from "../WorkItemCard/WorkItemCard";
import { type WorkState, workStateLabels } from "../../tokens/tokens";

/**
 * Full detail for a single work item, as shown in the read-only inspector drawer.
 * Extends the card summary shape with the fields only needed once someone opens the
 * item: identities, lease, allowed edit set, and the gates it must pass.
 */
export interface WorkItemDetail extends WorkItemSummary {
  /** Display name of the owner accountable for the item, if assigned. */
  owner?: string;
  /** ISO timestamp when the current claim lease expires, if the item is claimed. */
  leaseExpiresAt?: string;
  /** Identifier of the actor currently acting as maker on this item. */
  makerId?: string;
  /** Identifier of the actor currently acting as checker on this item. */
  checkerId?: string;
  /** Glob-style paths this item is permitted to modify. */
  allowedEditSet: string[];
  /** Exact gate commands that must pass before the item can proceed, e.g. "pnpm test". */
  gates: string[];
  /** ISO timestamp when the item entered the queue. */
  queuedAt?: string;
}

export interface WorkItemDrawerProps {
  /** The work item to display. Renders nothing when `null`, even if `open` is true. */
  item: WorkItemDetail | null;
  /** Whether the drawer is open. */
  open: boolean;
  /** Called when the drawer requests to close: Escape key, scrim click, or the close button. */
  onClose: () => void;
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

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mdn-workitemdrawer__section">
      <span className="mdn-workitemdrawer__section-label mdn-label">{label}</span>
      <div className="mdn-workitemdrawer__section-body">{children}</div>
    </div>
  );
}

/**
 * A read-only inspector for a single work item, presented in the shared `Drawer`
 * primitive. Lays out status, the maker and checker identities, lease and branch
 * info, attempt count, the allowed edit set, the gate commands the item must pass,
 * and (when present) the escalation reason in a danger-toned block. Purely a viewer:
 * it has no form controls and takes no mutating actions itself.
 */
export function WorkItemDrawer({ item, open, onClose }: WorkItemDrawerProps) {
  if (!item) return null;

  const distinctActors = item.makerId && item.checkerId && item.makerId !== item.checkerId;

  return (
    <Drawer open={open} onClose={onClose} title={item.id}>
      <div className="mdn-workitemdrawer mdn-stack">
        <Section label="Status">
          <div className="mdn-workitemdrawer__status-row">
            <StatusPill tone={STATE_TONE[item.state]}>{workStateLabels[item.state]}</StatusPill>
            {item.tier ? <TierBadge tier={item.tier} /> : null}
          </div>
          <h3 className="mdn-workitemdrawer__title mdn-heading">{item.title}</h3>
        </Section>

        <Section label="Identities">
          <div className="mdn-workitemdrawer__identities">
            {item.makerId ? (
              <IdentityChip name={item.makerId} model={item.makerModel} role="maker" size="sm" />
            ) : (
              <span className="mdn-faint">No maker assigned</span>
            )}
            {item.checkerId ? (
              <IdentityChip name={item.checkerId} model={item.checkerModel} role="checker" size="sm" />
            ) : (
              <span className="mdn-faint">No checker assigned</span>
            )}
          </div>
          {item.makerId && item.checkerId ? (
            <p className="mdn-workitemdrawer__note mdn-dim">
              {distinctActors
                ? "Maker and checker are distinct actors."
                : "Maker and checker are the same actor."}
            </p>
          ) : null}
        </Section>

        <Section label="Lease / branch / PR">
          <dl className="mdn-workitemdrawer__dl">
            <div className="mdn-workitemdrawer__dl-row">
              <dt>Owner</dt>
              <dd>{item.owner ?? <span className="mdn-faint">Unassigned</span>}</dd>
            </div>
            <div className="mdn-workitemdrawer__dl-row">
              <dt>Lease expires</dt>
              <dd className="mdn-mono">{item.leaseExpiresAt ?? <span className="mdn-faint">No active lease</span>}</dd>
            </div>
            <div className="mdn-workitemdrawer__dl-row">
              <dt>Branch</dt>
              <dd className="mdn-mono">{item.branch ?? <span className="mdn-faint">Not created</span>}</dd>
            </div>
            <div className="mdn-workitemdrawer__dl-row">
              <dt>Pull request</dt>
              <dd className="mdn-mono">{item.pr ?? <span className="mdn-faint">Not opened</span>}</dd>
            </div>
            {item.queuedAt ? (
              <div className="mdn-workitemdrawer__dl-row">
                <dt>Queued</dt>
                <dd className="mdn-mono">{item.queuedAt}</dd>
              </div>
            ) : null}
          </dl>
        </Section>

        <Section label="Attempts">
          <span className="mdn-mono">
            attempt {item.attempts}/{item.maxAttempts}
          </span>
        </Section>

        <Section label="Allowed edit set">
          {item.allowedEditSet.length > 0 ? (
            <ul className="mdn-workitemdrawer__list mdn-mono">
              {item.allowedEditSet.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          ) : (
            <span className="mdn-faint">No paths declared</span>
          )}
        </Section>

        <Section label="Gates">
          {item.gates.length > 0 ? (
            <ul className="mdn-workitemdrawer__list mdn-mono">
              {item.gates.map((gate) => (
                <li key={gate}>{gate}</li>
              ))}
            </ul>
          ) : (
            <span className="mdn-faint">No gates declared</span>
          )}
        </Section>

        {item.escalationReason ? (
          <Section label="Escalation reason">
            <p className="mdn-workitemdrawer__escalation">{item.escalationReason}</p>
          </Section>
        ) : null}
      </div>
    </Drawer>
  );
}
