import { Card } from "../Card/Card";
import { StatusPill } from "../StatusPill/StatusPill";
import { Button } from "../Button/Button";

/** Lifecycle status of a decision: still open for input, or already resolved. */
export type DecisionStatus = "open" | "resolved";

/**
 * Plain data shape for a single decision awaiting (or having received) human input.
 * Components in this package define their own shape rather than importing app-level
 * types, so this interface is the contract a host app maps its own decision records
 * onto.
 */
export interface DecisionSummary {
  /** Stable decision identifier, e.g. "dec-57". */
  id: string;
  /** The question posed to the operator, e.g. "Should we raise the daily merge cap to 12?" */
  question: string;
  /** The system's suggested answer, when it has one, shown in a highlighted inset. */
  recommendation?: string;
  /** Whether the decision is still awaiting an answer, or has already been resolved. */
  status: DecisionStatus;
  /** The answer given, once `status` is `resolved`. */
  answer?: string;
  /** Whether an unanswered decision defaults to holding (staying paused) rather than proceeding. */
  defaultHold: boolean;
}

export interface DecisionCardProps {
  /** The decision to summarize. */
  decision: DecisionSummary;
  /** Called when the operator resolves an open decision. Only offered while `status`
   * is `open`. */
  onResolve?: () => void;
}

/**
 * A card summarizing a single decision the system is asking a human to make: the
 * question, an optional recommendation in an info-tinted inset, and its lifecycle
 * status. Open decisions with a hold-by-default policy show a muted note explaining
 * what happens if nobody answers; open decisions with a resolve handler get a primary
 * Resolve button. Resolved decisions show the answer instead. Used in the Decisions
 * queue and on the project Overview.
 */
export function DecisionCard({ decision, onResolve }: DecisionCardProps) {
  const { question, recommendation, status, answer, defaultHold } = decision;
  const isOpen = status === "open";

  return (
    <Card
      actions={
        <StatusPill tone={isOpen ? "attention" : "ok"}>{isOpen ? "Open" : "Resolved"}</StatusPill>
      }
    >
      <div className="mdn-decisioncard">
        <p className="mdn-decisioncard__question mdn-heading">{question}</p>
        {recommendation ? (
          <div className="mdn-decisioncard__recommendation">
            <span className="mdn-decisioncard__recommendation-label mdn-label">Recommendation</span>
            <p className="mdn-decisioncard__recommendation-text">{recommendation}</p>
          </div>
        ) : null}
        {isOpen && defaultHold ? (
          <p className="mdn-decisioncard__default mdn-mono">Default if unanswered: hold</p>
        ) : null}
        {!isOpen && answer ? (
          <div className="mdn-decisioncard__answer">
            <span className="mdn-decisioncard__answer-label mdn-label">Answer</span>
            <p className="mdn-decisioncard__answer-text">{answer}</p>
          </div>
        ) : null}
        {isOpen && onResolve ? (
          <div className="mdn-decisioncard__actions">
            <Button variant="primary" size="sm" onClick={onResolve}>
              Resolve
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
