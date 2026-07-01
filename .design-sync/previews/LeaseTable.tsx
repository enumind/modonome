// @dsCard group="Governance"
import { LeaseTable } from "@modonome/design-system";

const leases = [
  { itemId: "PAY-412-flaky-retry-test", owner: "modonome-maker[bot]", expiresAt: "2026-07-01T09:57:00Z", stale: false },
  { itemId: "PAY-418-dead-code-sweep", owner: "modonome-maker[bot]", expiresAt: "2026-07-01T09:52:00Z", stale: false },
  { itemId: "PAY-421-bump-lodash", owner: "modonome-maker[bot]", expiresAt: "2026-07-01T08:20:00Z", stale: true },
];

export const WithLeases = () => <LeaseTable leases={leases} onRelease={() => {}} />;
