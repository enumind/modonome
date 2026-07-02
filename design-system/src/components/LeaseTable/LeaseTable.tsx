import { Button } from "../Button/Button";
import { IdentityChip } from "../IdentityChip/IdentityChip";
import { StatusPill } from "../StatusPill/StatusPill";
import { Table, type TableColumn } from "../Table/Table";
import { relativeTime } from "../../lib/format";

/**
 * A single active claim lease on a work item, as shown in the lease table.
 */
export interface LeaseRow {
  /** Work item identifier the lease is held against. */
  itemId: string;
  /** Display name of the actor holding the lease. */
  owner: string;
  /** ISO timestamp when the lease expires (or already expired). */
  expiresAt: string;
  /** Whether the lease has gone stale, e.g. past its expiry with no heartbeat. */
  stale: boolean;
}

export interface LeaseTableProps {
  /** Lease rows to display, one per claimed work item. */
  leases: LeaseRow[];
  /** Called with the work item id when the operator releases a lease. When omitted,
   * no Action column is rendered. The caller is responsible for confirming the
   * destructive action before invoking this. */
  onRelease?: (itemId: string) => void;
}

/**
 * A table of active claim leases: which work item, who holds it, when it expires
 * (relative and exact), and whether it has gone stale. When `onRelease` is provided,
 * each row gets a danger "Release" button so an operator can reclaim a stuck lease.
 * Built on the shared `Table` primitive, so it inherits keyboard and scroll behavior.
 */
export function LeaseTable({ leases, onRelease }: LeaseTableProps) {
  const columns: TableColumn<LeaseRow>[] = [
    {
      key: "itemId",
      header: "Item",
      render: (row) => <span className="mdn-mono">{row.itemId}</span>,
    },
    {
      key: "owner",
      header: "Owner",
      render: (row) => <IdentityChip name={row.owner} size="sm" />,
    },
    {
      key: "expiresAt",
      header: "Expiry",
      render: (row) => (
        <span className="mdn-mono" title={row.expiresAt}>
          {relativeTime(row.expiresAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.stale ? (
          <StatusPill tone="blocked" size="sm">
            Stale
          </StatusPill>
        ) : (
          <StatusPill tone="ok" size="sm">
            Active
          </StatusPill>
        ),
    },
    ...(onRelease
      ? [
          {
            key: "action",
            header: "Action",
            align: "right" as const,
            render: (row: LeaseRow) => (
              <Button variant="danger" size="sm" onClick={() => onRelease(row.itemId)}>
                Release
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Table
      columns={columns}
      rows={leases}
      getRowKey={(row) => row.itemId}
      empty={<span className="mdn-faint">No active leases.</span>}
    />
  );
}
