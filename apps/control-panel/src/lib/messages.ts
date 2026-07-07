import type { MessageCatalogEntryVM, MessageSeverity } from "../state/types";

/**
 * Fallback copy for every panel-authored Toast notice, mirrored in
 * scripts/lib/message-catalog/panel/control-panel.mjs under the same id so
 * an operator can retune wording from the Messages tab. `state.messages`
 * (this subject's own resolved catalog, overrides already applied) is
 * always preferred when present; this map only covers a fixture or an
 * older reader that hasn't loaded the id yet.
 */
const DEFAULTS: Record<string, { severity: MessageSeverity; template: string }> = {
  "panel.gates.approve-acknowledged": {
    severity: "info",
    template: "Acknowledged locally: change to {path} approved. Approve it on the pull request too.",
  },
  "panel.settings.messages-saved": { severity: "info", template: "Message overrides saved to messages.yaml." },
  "panel.settings.messages-save-failed": { severity: "blocked", template: "Save failed: {error}" },
  "panel.settings.config-saved": { severity: "info", template: "Configuration saved to config.yaml." },
  "panel.settings.config-save-failed": { severity: "blocked", template: "Save failed: {error}" },
  "panel.arming.config-saved": { severity: "info", template: "Configuration saved to config.yaml." },
  "panel.arming.config-save-failed": { severity: "blocked", template: "Save failed: {error}" },
  "panel.arming.mode-ack-local": {
    severity: "info",
    template: "Acknowledged locally. Connect live, writable state to actually change the mode.",
  },
  "panel.arming.mode-updated": { severity: "info", template: "Mode updated and saved to config.yaml." },
  "panel.arming.mode-save-failed": { severity: "blocked", template: "Save failed: {error}" },
  "panel.arming.dry-run-queued": { severity: "info", template: "Dry-run sweep queued." },
  "panel.work-queue.release-ack-local": {
    severity: "info",
    template: "Acknowledged locally. Connect live, writable state to actually release {itemId}.",
  },
  "panel.work-queue.release-succeeded": { severity: "info", template: "Lease on {itemId} released. The item has requeued." },
  "panel.work-queue.release-failed": { severity: "blocked", template: "Release failed: {error}" },
  "panel.learnings.decision-ack-local": {
    severity: "info",
    template: "Acknowledged locally. Record the real answer in DECISIONS.md.",
  },
  "panel.learnings.gate-entry-ack-local": {
    severity: "info",
    template: "Acknowledged locally. Add the real gate entry to LEARNINGS.md.",
  },
  "panel.learnings.prune-ack-local": {
    severity: "info",
    template: "Acknowledged locally. Connect live, writable state to actually prune it.",
  },
  "panel.learnings.pruned": { severity: "info", template: "Learning pruned from LEARNINGS.md." },
  "panel.learnings.prune-failed": { severity: "blocked", template: "Prune failed: {error}" },
};

export interface ResolvedPanelMessage {
  severity: MessageSeverity;
  message: string;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/**
 * Resolve a panel-authored message id against this subject's own catalog
 * (already override-resolved server-side) and interpolate {param} tokens.
 * Falls back to DEFAULTS, then to the raw id, so a missing catalog entry
 * (fixture drift, a reader that hasn't refreshed) never crashes a screen.
 */
export function formatMessage(
  messages: MessageCatalogEntryVM[],
  id: string,
  params: Record<string, string | number> = {},
): ResolvedPanelMessage {
  const resolved = messages.find((m) => m.id === id);
  const fallback = DEFAULTS[id];
  const severity = resolved?.severity ?? fallback?.severity ?? "info";
  const template = resolved?.text ?? fallback?.template ?? id;
  return { severity, message: interpolate(template, params) };
}
