// @dsCard group="Governance"
import { DecisionCard } from "@modonome/design-system";

const openDecision = {
  id: "settlements-index-owner",
  question: "Approve the settlements index migration (PAY-430) on the protected db/migrations path?",
  recommendation: "Hold until a DBA reviews the lock impact.",
  status: "open" as const,
  defaultHold: true,
};

const resolvedDecision = {
  id: "raise-daily-merge-cap",
  question: "Raise the daily merge cap from 6 to 10 after two clean weeks?",
  recommendation: "Raise to 8 first, then reassess.",
  status: "resolved" as const,
  answer: "Raised to 8. Revisit after another two clean weeks before considering 10.",
  defaultHold: true,
};

export const Open = () => <DecisionCard decision={openDecision} onResolve={() => {}} />;

export const Resolved = () => <DecisionCard decision={resolvedDecision} />;
