import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  QueueBoard,
  LeaseTable,
  WorkItemDrawer,
  Card,
  EmptyState,
  Toast,
  Table,
  Select,
  Input,
  NumberField,
  Toggle,
  Button,
  IconButton,
  StatusPill,
} from "@modonome/design-system";
import type { PanelState, WriteActions, WorkItemVM, WorkItemType, NewWorkItemInput, WorkItemPatch } from "../state/types";
import { IN_FLIGHT_STATES } from "../state/types";
import { useConfirm } from "../lib/confirm";

const TYPE_OPTIONS: Array<{ value: WorkItemType; label: string }> = [
  { value: "fix-issue", label: "Fix issue" },
  { value: "develop-feature", label: "Develop feature" },
  { value: "create-article", label: "Create article" },
  { value: "create-plan", label: "Create plan" },
  { value: "update-docs", label: "Update docs" },
  { value: "chore", label: "Chore" },
];

const ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

interface WorkItemDraft {
  id: string;
  type: WorkItemType;
  assignedRole: string;
  maxAttempts: number;
  touchesProtectedPath: boolean;
  allowedEditSet: string[];
  gates: string[];
}

function emptyDraft(defaultRole: string): WorkItemDraft {
  return {
    id: "",
    type: "develop-feature",
    assignedRole: defaultRole,
    maxAttempts: 3,
    touchesProtectedPath: false,
    allowedEditSet: [],
    gates: [],
  };
}

/**
 * The durable work-item state machine, laid out as a board: queued, claimed, making,
 * checking, merge ready, done, and escalated. Selecting a card opens a read-only
 * inspector drawer with the item's identities, lease, allowed edit set, and gates.
 * Below the board, the active claim leases are listed so a stuck lease can be
 * reclaimed, and below that, "Manage work items" is where the panel actually
 * authors work: add, edit (type, assigned role, edit set, gates, caps), and remove.
 * Every mutation here is metadata-only and never touches state, owner, or lease
 * directly, and delete refuses outright for anything in flight.
 */
export function WorkQueueScreen({ state, write }: { state: PanelState; write: WriteActions }) {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "blocked"; text: string } | null>(null);

  const roleOptions = useMemo(
    () => Object.keys(state.config.roles ?? {}).map((role) => ({ value: role, label: role })),
    [state.config.roles],
  );
  const defaultRole = roleOptions[0]?.value ?? "maker";

  const [draft, setDraft] = useState<WorkItemDraft>(() => emptyDraft(defaultRole));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [newEditSetPath, setNewEditSetPath] = useState("");
  const [newGate, setNewGate] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = state.queue.find((i) => i.id === selectedId) ?? null;

  function resetDraft() {
    setDraft(emptyDraft(defaultRole));
    setEditingId(null);
    setIdError(null);
    setNewEditSetPath("");
    setNewGate("");
  }

  function startEdit(item: WorkItemVM) {
    setDraft({
      id: item.id,
      type: item.type ?? "develop-feature",
      assignedRole: item.assignedRole ?? defaultRole,
      maxAttempts: item.maxAttempts,
      touchesProtectedPath: item.touchesProtectedPath,
      allowedEditSet: [...item.allowedEditSet],
      gates: [...item.gates],
    });
    setEditingId(item.id);
    setIdError(null);
  }

  function addEditSetPath() {
    const path = newEditSetPath.trim();
    if (!path || draft.allowedEditSet.includes(path)) return;
    setDraft((d) => ({ ...d, allowedEditSet: [...d.allowedEditSet, path] }));
    setNewEditSetPath("");
  }

  function removeEditSetPath(path: string) {
    setDraft((d) => ({ ...d, allowedEditSet: d.allowedEditSet.filter((p) => p !== path) }));
  }

  function addGate() {
    const gate = newGate.trim();
    if (!gate || draft.gates.includes(gate)) return;
    setDraft((d) => ({ ...d, gates: [...d.gates, gate] }));
    setNewGate("");
  }

  function removeGate(gate: string) {
    setDraft((d) => ({ ...d, gates: d.gates.filter((g) => g !== gate) }));
  }

  async function submitDraft(e: FormEvent) {
    e.preventDefault();
    const id = draft.id.trim();
    if (!editingId) {
      if (!id || !ID_PATTERN.test(id)) {
        setIdError("Use letters, numbers, dot, dash, or underscore only.");
        return;
      }
      if (state.queue.some((i) => i.id === id)) {
        setIdError(`"${id}" already exists.`);
        return;
      }
    }
    setIdError(null);
    setSaving(true);
    try {
      if (editingId) {
        const patch: WorkItemPatch = {
          type: draft.type,
          assignedRole: draft.assignedRole,
          allowedEditSet: draft.allowedEditSet,
          gates: draft.gates,
          maxAttempts: draft.maxAttempts,
          touchesProtectedPath: draft.touchesProtectedPath,
        };
        await write.onUpdateWorkItem(editingId, patch);
        setNotice({ tone: "info", text: `"${editingId}" updated.` });
      } else {
        const input: NewWorkItemInput = {
          id,
          type: draft.type,
          assignedRole: draft.assignedRole,
          allowedEditSet: draft.allowedEditSet,
          gates: draft.gates,
          maxAttempts: draft.maxAttempts,
          touchesProtectedPath: draft.touchesProtectedPath,
        };
        await write.onCreateWorkItem(input);
        setNotice({ tone: "info", text: `"${id}" queued.` });
      }
      resetDraft();
    } catch (err) {
      setNotice({ tone: "blocked", text: `Save failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: WorkItemVM) {
    const inFlight = IN_FLIGHT_STATES.includes(item.state);
    const ok = await confirm({
      title: `Delete "${item.id}"?`,
      tone: "danger",
      confirmLabel: "Delete work item",
      body: inFlight
        ? `"${item.id}" is in flight (state: ${item.state}). Release its lease first; this call will be refused otherwise.`
        : `This permanently removes the work item file. This cannot be undone from the panel.`,
    });
    if (!ok) return;
    try {
      await write.onDeleteWorkItem(item.id);
      setNotice({ tone: "info", text: `"${item.id}" deleted.` });
      if (editingId === item.id) resetDraft();
      if (selectedId === item.id) setSelectedId(null);
    } catch (err) {
      setNotice({ tone: "blocked", text: `Delete failed: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

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
      setNotice({ tone: "info", text: `Acknowledged locally. Connect live, writable state to actually release ${itemId}.` });
      return;
    }
    try {
      await write.onReleaseLease(itemId);
      setNotice({ tone: "info", text: `Lease on ${itemId} released. The item has requeued.` });
    } catch (err) {
      setNotice({ tone: "blocked", text: `Release failed: ${err instanceof Error ? err.message : String(err)}` });
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
          tone={notice.tone === "blocked" ? "blocked" : "info"}
          title={notice.tone === "blocked" ? "Action failed" : "Acknowledged"}
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

      <div className="section">
        <h2 className="section-title">Manage work items</h2>
        <Card
          title="Work items"
          help="Full CRUD for the work-item queue: create a new item, edit its type/role/edit-set/gates, or remove it. State, owner, and lease change only through the lease machinery above, never here. An in-flight item's descriptive fields are still editable, but delete is refused until its lease is released."
        >
          <div className="stack-lg">
            {state.queue.length === 0 ? (
              <p className="mdn-faint">No work items yet, add one below.</p>
            ) : (
              <Table<WorkItemVM>
                columns={[
                  { key: "id", header: "Item", render: (row) => <span className="mdn-mono">{row.id}</span> },
                  {
                    key: "state",
                    header: "State",
                    render: (row) => (
                      <StatusPill tone={IN_FLIGHT_STATES.includes(row.state) ? "info" : row.state === "done" ? "ok" : "neutral"} size="sm">
                        {row.state}
                      </StatusPill>
                    ),
                  },
                  { key: "type", header: "Type", render: (row) => row.type ?? <span className="mdn-faint">&mdash;</span> },
                  {
                    key: "assignedRole",
                    header: "Assigned role",
                    render: (row) => <span className="mdn-mono">{row.assignedRole ?? <span className="mdn-faint">&mdash;</span>}</span>,
                  },
                  {
                    key: "actions",
                    header: "",
                    align: "right",
                    render: (row) => (
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <IconButton icon="settings" label={`Edit ${row.id}`} size="sm" onClick={() => startEdit(row)} />
                        <IconButton icon="x" label={`Delete ${row.id}`} size="sm" variant="danger" onClick={() => onDelete(row)} />
                      </div>
                    ),
                  },
                ]}
                rows={state.queue}
                getRowKey={(row) => row.id}
              />
            )}

            <div>
              <p className="mdn-label" style={{ marginBottom: 8 }}>
                {editingId ? `Editing "${editingId}"` : "Add a work item"}
              </p>
              {editingId && IN_FLIGHT_STATES.includes(state.queue.find((i) => i.id === editingId)?.state ?? "queued") ? (
                <p className="mdn-faint" style={{ marginBottom: 8 }}>
                  This item is in flight. Changes here apply to its next attempt, not retroactively to work already in progress.
                </p>
              ) : null}
              <form onSubmit={submitDraft} className="stack-lg">
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <Input
                    label="Item id"
                    placeholder="WI-041-my-new-item"
                    value={draft.id}
                    disabled={editingId !== null}
                    onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
                    error={idError ?? undefined}
                  />
                  <div style={{ minWidth: 180 }}>
                    <Select
                      label="Type"
                      hint="The category of deliverable this item produces."
                      options={TYPE_OPTIONS}
                      value={draft.type}
                      onValueChange={(v) => setDraft((d) => ({ ...d, type: v as WorkItemType }))}
                    />
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <Select
                      label="Assigned role"
                      hint="Which configured role (Settings > Roles & models) executes this item."
                      options={roleOptions.length > 0 ? roleOptions : [{ value: "maker", label: "maker" }]}
                      value={draft.assignedRole}
                      onValueChange={(v) => setDraft((d) => ({ ...d, assignedRole: v }))}
                    />
                  </div>
                  <NumberField
                    label="Max attempts"
                    hint="How many rework cycles before this item escalates for owner review."
                    min={1}
                    max={10}
                    value={draft.maxAttempts}
                    onValueChange={(v) => setDraft((d) => ({ ...d, maxAttempts: v }))}
                  />
                  <Toggle
                    label="Touches protected path"
                    hint="Protected-path items stop at owner review before merge, regardless of gate results."
                    checked={draft.touchesProtectedPath}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, touchesProtectedPath: v }))}
                  />
                </div>

                <div className="grid grid-2">
                  <div>
                    <p className="mdn-label" style={{ marginBottom: 8 }}>
                      Allowed edit set
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      {draft.allowedEditSet.map((path) => (
                        <span key={path} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span className="mdn-mono">{path}</span>
                          <IconButton icon="x" label={`Remove ${path}`} size="sm" onClick={() => removeEditSetPath(path)} />
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <Input
                        label="Add path"
                        placeholder="scripts/agent/my-file.mjs"
                        value={newEditSetPath}
                        onChange={(e) => setNewEditSetPath(e.target.value)}
                      />
                      <Button type="button" size="sm" onClick={addEditSetPath}>
                        Add
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="mdn-label" style={{ marginBottom: 8 }}>
                      Gates
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      {draft.gates.map((gate) => (
                        <span key={gate} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span className="mdn-mono">{gate}</span>
                          <IconButton icon="x" label={`Remove gate ${gate}`} size="sm" onClick={() => removeGate(gate)} />
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <Input
                        label="Add gate command"
                        placeholder="node --test tests/my-file.test.mjs"
                        value={newGate}
                        onChange={(e) => setNewGate(e.target.value)}
                      />
                      <Button type="button" size="sm" onClick={addGate}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="submit" variant="primary" loading={saving} disabled={!write.writable || saving}>
                    {editingId ? "Save changes" : "Add work item"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={resetDraft} disabled={saving}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
                {!write.writable ? (
                  <p className="mdn-faint" style={{ margin: 0 }}>
                    {state.source.writeLockReason
                      ? state.source.writeLockReason
                      : "Read-only: connect live, writable state (start the dev server with MODONOME_PANEL_WRITE=1) to actually create, edit, or delete a work item."}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </Card>
      </div>

      <WorkItemDrawer item={selected} open={selectedId !== null} onClose={() => setSelectedId(null)} />
    </div>
  );
}
