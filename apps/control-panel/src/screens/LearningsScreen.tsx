import { useState } from "react";
import { DecisionCard, LearningCard, AuditTimeline, Card, EmptyState, Toast } from "@modonome/design-system";
import type { PanelState, WriteActions } from "../state/types";
import { useConfirm } from "../lib/confirm";

/**
 * Where the engine's judgment surfaces for a human to check. Open decisions ask an
 * explicit question before the engine proceeds; the learning queue shows the lessons
 * the engine has staged from repeated friction and the permanent gates those lessons
 * became once an owner promoted them. Nothing here becomes a binding rule without
 * that owner-gated step. Pruning a staged learning is a plain deletion, so it writes to
 * the real LESSONS.md when the panel is connected to live, writable state. Promoting
 * a learning or resolving a decision both require the operator to author real content
 * (a gate description, an actual answer) that this screen does not yet collect, so
 * those two stay local acknowledgments; do them by editing LESSONS.md or DECISIONS.md
 * directly, which is also what keeps those records honest instead of auto-filled.
 */
export function LearningsScreen({ state, write }: { state: PanelState; write: WriteActions }) {
  const confirm = useConfirm();
  const [notice, setNotice] = useState<{ tone: "info" | "blocked"; text: string } | null>(null);

  const staged = state.learnings.filter((l) => l.status === "staged");
  const promoted = state.learnings.filter((l) => l.status === "promoted");

  async function onResolve(question: string) {
    const ok = await confirm({
      title: "Resolve this decision?",
      confirmLabel: "Resolve",
      body: `Recording an answer to "${question}" is an authoring step: edit DECISIONS.md and move this entry to Resolved with the real answer. This just acknowledges the question locally.`,
    });
    if (ok) setNotice({ tone: "info", text: "Acknowledged locally. Record the real answer in DECISIONS.md." });
  }

  async function onPromote(lesson: string) {
    const ok = await confirm({
      title: "Promote this learning?",
      confirmLabel: "Promote",
      body: `Promoting "${lesson}" is an authoring step: it needs a real gate description, not a placeholder. Edit LESSONS.md's Promoted block once the gate exists. This just acknowledges locally.`,
    });
    if (ok) setNotice({ tone: "info", text: "Acknowledged locally. Add the real gate entry to LESSONS.md." });
  }

  async function onPrune(lesson: string) {
    const ok = await confirm({
      title: "Prune this learning?",
      tone: "danger",
      confirmLabel: "Prune learning",
      body: write.writable
        ? `Pruning "${lesson}" removes it from the real LESSONS.md. It will not become a gate and the evidence behind it is dropped.`
        : `The panel is read-only, so this only acknowledges locally; the entry stays in LESSONS.md.`,
    });
    if (!ok) return;
    if (!write.writable) {
      setNotice({ tone: "info", text: "Acknowledged locally. Connect live, writable state to actually prune it." });
      return;
    }
    try {
      await write.onPruneLearning(lesson);
      setNotice({ tone: "info", text: "Learning pruned from LESSONS.md." });
    } catch (err) {
      setNotice({ tone: "blocked", text: `Prune failed: ${err instanceof Error ? err.message : String(err)}` });
    }
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
        <Toast
          tone={notice.tone === "blocked" ? "blocked" : "info"}
          title={notice.tone === "blocked" ? "Prune failed" : "Acknowledged"}
          message={notice.text}
          onDismiss={() => setNotice(null)}
        />
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
