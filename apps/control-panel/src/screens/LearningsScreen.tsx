import { useState } from "react";
import { DecisionCard, LearningCard, AuditTimeline, Card, EmptyState, Toast } from "@modonome/design-system";
import type { PanelState } from "../state/types";
import { useConfirm } from "../lib/confirm";

/**
 * Where the engine's judgment surfaces for a human to check. Open decisions ask an
 * explicit question before the engine proceeds; the learning queue shows the lessons
 * the engine has staged from repeated friction and the permanent gates those lessons
 * became once an owner promoted them. Nothing here becomes a binding rule without
 * that owner-gated step.
 */
export function LearningsScreen({ state }: { state: PanelState }) {
  const confirm = useConfirm();
  const [notice, setNotice] = useState<string | null>(null);

  const staged = state.learnings.filter((l) => l.status === "staged");
  const promoted = state.learnings.filter((l) => l.status === "promoted");

  async function onResolve(question: string) {
    const ok = await confirm({
      title: "Resolve this decision?",
      confirmLabel: "Resolve",
      body: `Recording an answer to "${question}" lets the engine proceed on this question instead of holding.`,
    });
    if (ok) setNotice("Decision resolved.");
  }

  async function onPromote(lesson: string) {
    const ok = await confirm({
      title: "Promote this learning?",
      confirmLabel: "Promote",
      body: `Promoting "${lesson}" turns it into a binding rule enforced by a new gate. Every future change must satisfy it.`,
    });
    if (ok) setNotice("Learning promoted. A gate has been added to enforce it.");
  }

  async function onPrune(lesson: string) {
    const ok = await confirm({
      title: "Prune this learning?",
      tone: "danger",
      confirmLabel: "Prune learning",
      body: `Pruning "${lesson}" discards it. It will not become a gate and the evidence behind it is dropped.`,
    });
    if (ok) setNotice("Learning pruned.");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Learnings &amp; Decisions</h1>
          <p className="page-sub">
            Owner-gated learning: the engine captures lessons from friction, stages them for
            review, and only an explicit promote turns one into a binding gate.
          </p>
        </div>
      </div>

      {notice ? (
        <Toast tone="info" title="Acknowledged" message={notice} onDismiss={() => setNotice(null)} />
      ) : null}

      <div className="section">
        <h2 className="section-title">Decision queue</h2>
        {state.decisions.length === 0 ? (
          <Card>
            <EmptyState
              icon="check-circle"
              title="No open decisions"
              message="Nothing is waiting on an operator answer right now."
            />
          </Card>
        ) : (
          <div className="grid grid-2">
            {state.decisions.map((d) => (
              <DecisionCard
                key={d.id}
                decision={d}
                onResolve={d.status === "open" ? () => onResolve(d.question) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Learning queue</h2>
        {staged.length === 0 && promoted.length === 0 ? (
          <Card>
            <EmptyState
              icon="spark"
              title="No learnings yet"
              message="Learnings appear here once the engine notices repeated friction worth staging."
            />
          </Card>
        ) : (
          <div className="stack-lg">
            {staged.length > 0 ? (
              <div className="grid grid-2">
                {staged.map((l) => (
                  <LearningCard
                    key={l.id}
                    learning={l}
                    onPromote={() => onPromote(l.lesson)}
                    onPrune={() => onPrune(l.lesson)}
                  />
                ))}
              </div>
            ) : null}
            {promoted.length > 0 ? (
              <div className="grid grid-2">
                {promoted.map((l) => (
                  <LearningCard key={l.id} learning={l} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Audit timeline</h2>
        <Card title="Audit timeline" help="Every promotion, prune, and decision resolution is recorded here alongside the rest of the engine's activity.">
          <AuditTimeline events={state.audit} />
        </Card>
      </div>
    </div>
  );
}
