import { useState } from "react";
import { QueueBoard, LeaseTable, WorkItemDrawer, Card, EmptyState, Toast } from "@modonome/design-system";
import type { PanelState } from "../state/types";
import { useConfirm } from "../lib/confirm";

/**
 * The durable work-item state machine, laid out as a board: queued, claimed, making,
 * checking, merge ready, done, and escalated. Selecting a card opens a read-only
 * inspector drawer with the item's identities, lease, allowed edit set, and gates.
 * Below the board, the active claim leases are listed so a stuck lease can be
 * reclaimed, always behind a confirmation since releasing requeues the item.
 */
export function WorkQueueScreen({ state }: { state: PanelState }) {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = state.queue.find((i) => i.id === selectedId) ?? null;

  async function onRelease(itemId: string) {
    const ok = await confirm({
      title: "Release this lease?",
      tone: "danger",
      confirmLabel: "Release lease",
      body: `The claim on ${itemId} will be dropped and the item requeues for another actor to pick up. In-progress work on this attempt is lost.`,
    });
    if (ok) setNotice(`Lease on ${itemId} released. The item has requeued.`);
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
        <Toast tone="info" title="Acknowledged" message={notice} onDismiss={() => setNotice(null)} />
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
