export const MESSAGES = {
  "agent-run.action-queue.invalid-record": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "action-queue: invalid record:\n  - {errors}",
  },
  "agent-run.action-queue.missing-id": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "action-queue: enqueue requires an action with an id.",
  },
};
