// @dsCard group="Governance"
import { AuditTimeline } from "@modonome/design-system";

const events = [
  { ts: "2026-07-01T09:12:00Z", kind: "gate_passed" as const, item: "PAY-412", detail: "All required gates green. Item is merge ready." },
  { ts: "2026-07-01T09:05:00Z", kind: "pr_opened" as const, item: "PAY-418", detail: "Checker assigned (claude-sonnet-4-6), distinct from maker." },
  { ts: "2026-07-01T09:00:00Z", kind: "dry_run" as const, detail: "Dry-run sweep completed. No writes." },
  { ts: "2026-06-30T17:05:00Z", kind: "escalated" as const, item: "PAY-430", detail: "Escalated after 3 attempts on a protected path." },
  { ts: "2026-06-30T15:40:00Z", kind: "ratchet_rejected" as const, item: "PAY-407", detail: "Rejected: removed a test assertion. Returned to making." },
  { ts: "2026-06-30T14:20:00Z", kind: "merged" as const, item: "PAY-402", detail: "Merged by merge authority. Diff 12 lines." },
];

export const Timeline = () => <AuditTimeline events={events} />;
