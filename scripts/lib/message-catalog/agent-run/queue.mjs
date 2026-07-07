export const MESSAGES = {
  "agent-run.queue.invalid-selection": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Invalid selection: only {count} proposal(s) exist. Valid range is 1-{count}.",
  },
  "agent-run.queue.no-state-dir": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "No {stateDir} directory. Run `npx modonome scaffold {target} --write` first.",
  },
  "agent-run.queue.item-skipped": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "skip   {id}: {errors}",
  },
};
