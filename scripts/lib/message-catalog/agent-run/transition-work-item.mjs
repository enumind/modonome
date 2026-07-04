export const MESSAGES = {
  "agent-run.transition-work-item.state-mismatch": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "state mismatch: expected {fromState}, found {state}",
  },
  "agent-run.transition-work-item.lease-held": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "lease held by {holder} until {leaseExpiresAt}",
  },
  "agent-run.transition-work-item.usage": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Usage: node scripts/transition-work-item.mjs <item.json> <fromState> <toState> <writerId>",
  },
};
