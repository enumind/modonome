// @dsCard group="Governance"
import { QueueBoard } from "@modonome/design-system";

const items = [
  { id: "PAY-433", title: "Add trace span to refund path", state: "queued" as const, tier: 2 as const, attempts: 0, maxAttempts: 3, touchesProtectedPath: false },
  { id: "PAY-421", title: "Bump lodash to patch advisory", state: "making" as const, tier: 2 as const, attempts: 1, maxAttempts: 3, touchesProtectedPath: false, makerModel: "llama-3.3-70b" },
  { id: "PAY-418", title: "Remove dead currency helpers", state: "checking" as const, tier: 1 as const, attempts: 1, maxAttempts: 3, touchesProtectedPath: false, makerModel: "llama-3.3-70b", checkerModel: "claude-sonnet-4-6" },
  { id: "PAY-412", title: "Stabilize flaky retry test", state: "merge_ready" as const, tier: 1 as const, pr: "#1284", attempts: 1, maxAttempts: 3, touchesProtectedPath: false },
  { id: "PAY-430", title: "Add index to settlements migration", state: "escalated" as const, tier: 3 as const, attempts: 3, maxAttempts: 3, touchesProtectedPath: true, escalationReason: "Touches a protected migration path." },
  { id: "PAY-402", title: "Guard null merchant id", state: "done" as const, tier: 1 as const, pr: "#1279", attempts: 1, maxAttempts: 3, touchesProtectedPath: false },
];

export const Board = () => <QueueBoard items={items} />;
