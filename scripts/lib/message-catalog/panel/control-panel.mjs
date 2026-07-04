// Control-panel-authored Toast notices (apps/control-panel/src/screens/*.tsx),
// registered in the same catalog as backend messages so an operator can retune
// their wording from the Messages tab too. None are non_suppressible: these
// are local UI acknowledgments and save-result notices, not CI-gate failures.
export const MESSAGES = {
  "panel.gates.approve-acknowledged": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Acknowledged locally: change to {path} approved. Approve it on the pull request too.",
  },
  "panel.settings.messages-saved": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Message overrides saved to messages.yaml.",
  },
  "panel.settings.messages-save-failed": {
    category: "panel",
    severity: "blocked",
    non_suppressible: false,
    template: "Save failed: {error}",
  },
  "panel.settings.config-saved": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Configuration saved to config.yaml.",
  },
  "panel.settings.config-save-failed": {
    category: "panel",
    severity: "blocked",
    non_suppressible: false,
    template: "Save failed: {error}",
  },
  "panel.arming.config-saved": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Configuration saved to config.yaml.",
  },
  "panel.arming.config-save-failed": {
    category: "panel",
    severity: "blocked",
    non_suppressible: false,
    template: "Save failed: {error}",
  },
  "panel.arming.mode-ack-local": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Acknowledged locally. Connect live, writable state to actually change the mode.",
  },
  "panel.arming.mode-updated": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Mode updated and saved to config.yaml.",
  },
  "panel.arming.mode-save-failed": {
    category: "panel",
    severity: "blocked",
    non_suppressible: false,
    template: "Save failed: {error}",
  },
  "panel.arming.dry-run-queued": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Dry-run sweep queued.",
  },
  "panel.work-queue.release-ack-local": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Acknowledged locally. Connect live, writable state to actually release {itemId}.",
  },
  "panel.work-queue.release-succeeded": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Lease on {itemId} released. The item has requeued.",
  },
  "panel.work-queue.release-failed": {
    category: "panel",
    severity: "blocked",
    non_suppressible: false,
    template: "Release failed: {error}",
  },
  "panel.learnings.decision-ack-local": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Acknowledged locally. Record the real answer in DECISIONS.md.",
  },
  "panel.learnings.gate-entry-ack-local": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Acknowledged locally. Add the real gate entry to LEARNINGS.md.",
  },
  "panel.learnings.prune-ack-local": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Acknowledged locally. Connect live, writable state to actually prune it.",
  },
  "panel.learnings.pruned": {
    category: "panel",
    severity: "info",
    non_suppressible: false,
    template: "Learning pruned from LEARNINGS.md.",
  },
  "panel.learnings.prune-failed": {
    category: "panel",
    severity: "blocked",
    non_suppressible: false,
    template: "Prune failed: {error}",
  },
};
