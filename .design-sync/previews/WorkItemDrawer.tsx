import { WorkItemDrawer } from "@modonome/design-system";

const item = {
  id: "PAY-430-settlements-index",
  title: "Add index to settlements migration",
  state: "escalated" as const,
  tier: 3 as const,
  owner: "modonome-maker[bot]",
  leaseExpiresAt: "2026-07-01T10:05:00Z",
  attempts: 3,
  maxAttempts: 3,
  touchesProtectedPath: true,
  makerId: "modonome-maker[bot]",
  makerModel: "llama-3.3-70b",
  checkerId: "modonome-checker[bot]",
  checkerModel: "claude-sonnet-4-6",
  allowedEditSet: ["db/migrations/0142_settlements_index.sql"],
  gates: ["pnpm test", "pnpm migrate:check"],
  escalationReason: "Touches db/migrations (protected). Owner review required before merge.",
  queuedAt: "2026-06-30T17:05:00Z",
};

export const Detail = () => <WorkItemDrawer item={item} open onClose={() => {}} />;
