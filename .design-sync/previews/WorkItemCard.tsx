// @dsCard group="Governance"
import { WorkItemCard } from "@modonome/design-system";

export const Queued = () => (
  <WorkItemCard
    item={{
      id: "PAY-433-observability-gap",
      title: "Add trace span to refund path",
      state: "queued" as const,
      tier: 2 as const,
      attempts: 0,
      maxAttempts: 3,
      touchesProtectedPath: false,
    }}
    onClick={() => {}}
  />
);

export const Checking = () => (
  <WorkItemCard
    item={{
      id: "PAY-418-dead-code-sweep",
      title: "Remove dead currency-format helpers",
      state: "checking" as const,
      tier: 1 as const,
      pr: "#1286",
      attempts: 1,
      maxAttempts: 3,
      touchesProtectedPath: false,
      makerModel: "llama-3.3-70b",
      checkerModel: "claude-sonnet-4-6",
    }}
    onClick={() => {}}
  />
);

export const Escalated = () => (
  <WorkItemCard
    item={{
      id: "PAY-430-migration-index",
      title: "Add index to settlements migration",
      state: "escalated" as const,
      tier: 3 as const,
      attempts: 3,
      maxAttempts: 3,
      touchesProtectedPath: true,
      makerModel: "llama-3.3-70b",
      checkerModel: "claude-sonnet-4-6",
      escalationReason: "Touches db/migrations (protected). Owner review required before merge.",
    }}
    onClick={() => {}}
  />
);
