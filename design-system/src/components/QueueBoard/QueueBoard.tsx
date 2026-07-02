import { WorkItemCard, type WorkItemSummary } from "../WorkItemCard/WorkItemCard";
import { workStateLabels, type WorkState } from "../../tokens/tokens";

export interface QueueBoardProps {
  /** The work items to lay out, each placed in the column for its state. */
  items: WorkItemSummary[];
  /** Called when an item is opened. */
  onSelect?: (id: string) => void;
}

/**
 * The work queue as a board. Items are grouped into the columns of the durable state
 * machine (queued, claimed, making, checking, merge ready, done, escalated), with
 * rework folded into making and merging folded into merge ready. Each column shows its
 * state label and a live count. The board scrolls horizontally on narrow viewports so
 * a column is never clipped.
 */
export function QueueBoard({ items, onSelect }: QueueBoardProps) {
  const columns: Array<{ key: string; label: string; states: WorkState[] }> = [
    { key: "queued", label: workStateLabels.queued, states: ["queued"] },
    { key: "claimed", label: workStateLabels.claimed, states: ["claimed"] },
    { key: "making", label: workStateLabels.making, states: ["making", "rework"] },
    { key: "checking", label: workStateLabels.checking, states: ["checking"] },
    { key: "merge_ready", label: workStateLabels.merge_ready, states: ["merge_ready", "merging"] },
    { key: "done", label: workStateLabels.done, states: ["done"] },
    { key: "escalated", label: workStateLabels.escalated, states: ["escalated"] },
  ];

  return (
    <div className="mdn-board" role="list" aria-label="Work queue by state">
      {columns.map((col) => {
        const colItems = items.filter((it) => col.states.includes(it.state));
        return (
          <section
            key={col.key}
            className={`mdn-board__col mdn-board__col--${col.key}`}
            role="listitem"
            aria-label={`${col.label}, ${colItems.length} item(s)`}
          >
            <header className="mdn-board__colhead">
              <span className="mdn-board__coldot" aria-hidden="true" data-state={col.key} />
              <span className="mdn-board__collabel">{col.label}</span>
              <span className="mdn-board__colcount">{colItems.length}</span>
            </header>
            <div className="mdn-board__colbody">
              {colItems.length === 0 ? (
                <p className="mdn-board__empty">Empty</p>
              ) : (
                colItems.map((it) => (
                  <WorkItemCard key={it.id} item={it} onClick={onSelect ? () => onSelect(it.id) : undefined} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
