import { useState } from "react";
import { GatePanel, ProtectedPathRow, RoleBadge, TierBadge, StatusPill, Card, Toast } from "@modonome/design-system";
import type { PanelState } from "../state/types";
import { useConfirm } from "../lib/confirm";

/**
 * The integrity surface: the deterministic CI gates every change must pass, the
 * protected paths that require explicit owner approval, and the separation-of-duties
 * contract (distinct maker, checker, and merge authority) that keeps the anti-gaming
 * ratchet honest.
 */
export function GatesScreen({ state }: { state: PanelState }) {
  const confirm = useConfirm();
  const [notice, setNotice] = useState<string | null>(null);

  async function onApprove(path: string) {
    const ok = await confirm({
      title: "Approve this protected-path change?",
      tone: "danger",
      confirmLabel: "Approve change",
      body: `Approving ${path} is an owner responsibility, normally recorded as a review on the pull request itself. Modonome does not yet durably record protected-path approvals anywhere the panel can read or write, so this only acknowledges locally.`,
    });
    if (ok) setNotice(`Acknowledged locally: change to ${path} approved. Approve it on the pull request too.`);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Gates &amp; Integrity</h1>
          <p className="page-sub">
            Deterministic gates decide what may merge, protected paths require explicit owner
            approval, and the anti-gaming ratchet keeps the maker, checker, and merge authority
            honest by construction.
          </p>
        </div>
      </div>

      {notice ? (
        <Toast tone="info" title="Acknowledged" message={notice} onDismiss={() => setNotice(null)} />
      ) : null}

      <div className="section">
        <h2 className="section-title">Gate status</h2>
        <Card title="CI gates" help="Every required gate must pass before a change can reach merge ready. Optional gates are informational.">
          <GatePanel gates={state.gates} />
        </Card>
      </div>

      <div className="section">
        <h2 className="section-title">Protected paths</h2>
        <Card title="Protected paths" help="Changes touching these paths cannot merge without explicit owner approval, no matter how the gates score.">
          <div className="list-plain">
            {state.protectedPaths.map((p) => (
              <ProtectedPathRow
                key={p.path}
                path={p.path}
                touchedBy={p.touchedBy}
                approvalNeeded={p.approvalNeeded}
                approver={p.approver}
                onApprove={p.approvalNeeded && !p.approver ? () => onApprove(p.path) : undefined}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="section">
        <h2 className="section-title">Separation of duties</h2>
        <Card
          title="Maker, checker, merge authority"
          help="The identities and model families making a change and checking it must be distinct, so a single compromised or lazy actor cannot both write and approve its own work."
        >
          <div className="stack-lg">
            <div className="grid grid-3">
              <RoleBadge role="maker" />
              <RoleBadge role="checker" />
              <RoleBadge role="merge-authority" />
            </div>
            <div className="list-plain">
              <div>
                <StatusPill tone={state.config.require_distinct_maker_checker ? "ok" : "blocked"} icon={state.config.require_distinct_maker_checker ? "check-circle" : "ban"} size="sm">
                  {state.config.require_distinct_maker_checker ? "Distinct identities required" : "Distinct identities not enforced"}
                </StatusPill>
                <p className="mdn-faint" style={{ margin: "6px 0 0" }}>
                  The maker and checker must be different actors, so no identity reviews its own work.
                </p>
              </div>
              <div>
                <StatusPill tone={state.config.require_distinct_maker_checker_model ? "ok" : "blocked"} icon={state.config.require_distinct_maker_checker_model ? "check-circle" : "ban"} size="sm">
                  {state.config.require_distinct_maker_checker_model ? "Distinct model families required" : "Distinct model families not enforced"}
                </StatusPill>
                <p className="mdn-faint" style={{ margin: "6px 0 0" }}>
                  The maker and checker must run different model families, so a shared blind spot cannot pass its own gate.
                </p>
              </div>
            </div>
            <div>
              <p className="mdn-faint" style={{ margin: "0 0 8px" }}>
                Risk tiers set how much review a change needs before merge authority may act.
              </p>
              <div className="list-plain">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TierBadge tier={1} />
                  <span className="mdn-faint">Mechanical, no review required.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TierBadge tier={2} />
                  <span className="mdn-faint">Bounded change, checker review.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TierBadge tier={3} />
                  <span className="mdn-faint">Owner or frontier review required.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TierBadge tier={4} />
                  <span className="mdn-faint">Owner decision only.</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
