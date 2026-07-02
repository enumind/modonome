// @dsCard group="Governance"
import { LearningCard } from "@modonome/design-system";

const stagedLearning = {
  id: "L-h-2",
  status: "staged" as const,
  lesson: "Lock migrations to a single writer to avoid settlement index churn.",
  ageDays: 2,
  evidence: "PAY-430 escalation",
  signal: "rework",
};

const promotedLearning = {
  id: "L-001",
  status: "promoted" as const,
  lesson: "Gate scripts must load the ratchet from the base branch so a PR cannot weaken the gate that judges it.",
  ageDays: 21,
  signal: "gate",
  gateAdded: "check-self-application.mjs",
};

export const Staged = () => (
  <LearningCard learning={stagedLearning} onPromote={() => {}} onPrune={() => {}} />
);

export const Promoted = () => <LearningCard learning={promotedLearning} />;
