import { useState } from "react";
import { QueueBoard, LeaseTable, WorkItemDrawer, Card, EmptyState, Toast } from "@modonome/design-system";
import type { MessageSeverity, PanelState, WriteActions } from "../state/types";
import { useConfirm } from "../lib/confirm";
import { formatMessage } from "../lib/messages";

/**
 * The durable work-item state machine, laid out as a board: queued, claimed, making,
 * checking, merge ready, done, and escalated. Selecting a card opens a read-only
 * inspector drawer with the item's identities, lease, allowed edit set, and gates.
 * Below the board, the active claim leases are listed so a stuck lease can be
 * reclaimed, always behind a confirmation since releasing requeues the item and, when
 * the panel is connected to live, writable state, clears the lease on the real work
 * item file.
 */
export function WorkQueueScreen({ state, write }: { state: PanelState; write: WriteActions }) {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: MessageSeverity; text: string } | null>(null);

  const selected = state.queue.find((i) => i.id === selectedId) ?? null;

  async function onRelease(itemId: string) {
    const ok = await confirm({
      title: "Release this lease?",
      tone: "danger",
      confirmLabel: "Release lease",
      body: write.writable
        ? `The claim on ${itemId} will be dropped in the real work-item file and the item requeues for another actor to pick up. In-progress work on this attempt is lost.`
        : `The panel is read-only, so this only acknowledges locally; ${itemId} is not actually requeued.`,
    });
    if (!ok) return;
    if (!write.writable) {
      const resolved = formatMessage(state.messages, "panel.work-queue.release-ack-local", { itemId });
      setNotice({ tone: resolved.severity, text: resolved.message });
      return;
    }
    try {
      await write.onReleaseLease(itemId);
      const resolved = formatMessage(state.messages, "panel.work-queue.release-succeeded", { itemId });
      setNotice({ tone: resolved.severity, text: resolved.message });
    } catch (err) {
      const resolved = formatMessage(state.messages, "panel.work-queue.release-failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      setNotice({ tone: resolved.severity, text: resolved.message });
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Work Queue</h1>
          <p className="page-sub">
            The durable state machine every work item moves through: queued, claimed, making,
            checking, merge ready, done, or escalated to owner review. State survives restarts and
            is never held only in memory.
          </p>
        </div>
      </div>

      {notice ? (
        <Toast
          tone={notice.tone}
          title={notice.tone === "blocked" ? "Release failed" : "Acknowledged"}
          message={notice.text}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <div className="section">
        <h2 className="section-title">Board</h2>
        {state.queue.length > 0 ? (
          <QueueBoard items={state.queue} onSelect={setSelectedId} />
        ) : (
          <EmptyState
            title="Queue is empty"
            message="No work items are currently tracked. New items will appear here once the engine queues them."
            icon="queue"
          />
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Active leases</h2>
        <Card title="Claim leases" help="Each lease reserves a work item for one actor until it expires. Releasing a lease requeues the item.">
          <LeaseTable leases={state.leases} onRelease={onRelease} />
        </Card>
      </div>

      <WorkItemDrawer item={selected} open={selectedId !== null} onClose={() => setSelectedId(null)} />
    </div>
  );
}
