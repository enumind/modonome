import { Card } from "../Card/Card";
import { StatusPill } from "../StatusPill/StatusPill";
import { Button } from "../Button/Button";

/** Lifecycle status of a learning: staged for review, or promoted into a permanent gate. */
export type LearningStatus = "staged" | "promoted";

/**
 * Plain data shape for a single learning surfaced by the system. Components in this
 * package define their own shape rather than importing app-level types, so this
 * interface is the contract a host app maps its own learning records onto.
 */
export interface LearningSummary {
  /** Stable learning identifier, e.g. "lrn-118". Shown in mono in the card header. */
  id: string;
  /** Whether the learning is still awaiting a decision, or has already become a gate. */
  status: LearningStatus;
  /** The lesson text itself, in plain language, e.g. "Migration scripts need a rollback step." */
  lesson: string;
  /** How many days old the learning is. */
  ageDays: number;
  /** The evidence that produced the learning, e.g. "3 rework cycles on wi-402, wi-410, wi-417". */
  evidence?: string;
  /** The originating signal, e.g. "repeated checker rejection" or "operator override". */
  signal?: string;
  /** The name of the gate this learning produced, once promoted, e.g. "require-rollback-step". */
  gateAdded?: string;
}

export interface LearningCardProps {
  /** The learning to summarize. */
  learning: LearningSummary;
  /** Called when the operator promotes a staged learning into a permanent gate. Only
   * offered while `status` is `staged`. */
  onPromote?: () => void;
  /** Called when the operator discards a staged learning. Only offered while `status`
   * is `staged`. The screen is expected to confirm before calling this. */
  onPrune?: () => void;
}

/**
 * A card summarizing a single learning the system has surfaced: the lesson learned,
 * how old it is, what signal or evidence produced it, and its lifecycle status.
 * Staged learnings offer Promote and Prune actions (when the corresponding handlers
 * are given) so an operator can turn a lesson into a permanent gate or discard it;
 * promoted learnings show the gate they produced instead. Used in the Learnings list
 * and on the project Overview.
 */
export function LearningCard({ learning, onPromote, onPrune }: LearningCardProps) {
  const { id, status, lesson, ageDays, evidence, signal, gateAdded } = learning;
  const showActions = status === "staged" && Boolean(onPromote || onPrune);

  return (
    <Card
      eyebrow={id}
      actions={
        <StatusPill tone={status === "promoted" ? "ok" : "attention"}>
          {status === "promoted" ? "Promoted" : "Staged"}
        </StatusPill>
      }
    >
      <div className="mdn-learningcard">
        <p className="mdn-learningcard__lesson">{lesson}</p>
        <div className="mdn-learningcard__meta mdn-mono">
          <span className="mdn-learningcard__age">{ageDays}d old</span>
          {signal ? <span className="mdn-learningcard__signal">{signal}</span> : null}
          {status === "promoted" && gateAdded ? (
            <span className="mdn-learningcard__gate">gate: {gateAdded}</span>
          ) : evidence ? (
            <span className="mdn-learningcard__evidence">{evidence}</span>
          ) : null}
        </div>
        {showActions ? (
          <div className="mdn-learningcard__actions">
            {onPromote ? (
              <Button variant="primary" size="sm" onClick={onPromote}>
                Promote
              </Button>
            ) : null}
            {onPrune ? (
              <Button variant="danger" size="sm" onClick={onPrune}>
                Prune
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
