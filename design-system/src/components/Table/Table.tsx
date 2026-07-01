import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../../lib/cx";

export type TableColumnAlign = "left" | "right" | "center";

export interface TableColumn<T> {
  /** Stable identifier for the column, used as the React key for header and body cells. */
  key: string;
  /** Column heading text, rendered in the mono uppercase label style. */
  header: string;
  /** Text alignment for the header and body cells. Defaults to `left`. */
  align?: TableColumnAlign;
  /** Optional fixed width (any valid CSS width, e.g. "120px" or "20%"). */
  width?: string;
  /** Custom cell renderer. When omitted, the column looks up `row[key]` and renders it as-is. */
  render?: (row: T) => ReactNode;
}

export interface TableProps<T> {
  /** Column definitions, in display order. */
  columns: TableColumn<T>[];
  /** Row data to render. */
  rows: T[];
  /** Returns a stable, unique key for a row, used for React keys and focus handling. */
  getRowKey: (row: T) => string;
  /** Called when a row is activated by click, or Enter/Space when focused. Rows become keyboard focusable when set. */
  onRowClick?: (row: T) => void;
  /** Content shown in place of the body when `rows` is empty. Defaults to a muted "No data" cell. */
  empty?: ReactNode;
  /** Use tighter row padding. Defaults to false. */
  dense?: boolean;
}

/**
 * A generic, semantic data table. Renders a real `<table>` with `<thead>`/`<tbody>`
 * so screen readers and browser table navigation work as expected. Rows highlight on
 * hover; when `onRowClick` is set, rows are keyboard focusable and activate on
 * Enter or Space, with a `role="button"` note on the row. Below 640px the table
 * scrolls horizontally inside its own container instead of breaking the layout.
 * Renders the `empty` slot spanning all columns when `rows` is empty.
 */
export function Table<T>({ columns, rows, getRowKey, onRowClick, empty, dense }: TableProps<T>) {
  const interactive = Boolean(onRowClick);

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className="mdn-table-scroll">
      <table className={cx("mdn-table", dense && "mdn-table--dense")}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cx("mdn-table__th", "mdn-label", `mdn-table__cell--${col.align ?? "left"}`)}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="mdn-table__empty" colSpan={columns.length}>
                {empty ?? <span className="mdn-faint">No data</span>}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = getRowKey(row);
              return (
                <tr
                  key={key}
                  className={cx("mdn-table__row", interactive && "mdn-table__row--interactive")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (event) => handleKeyDown(event, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cx("mdn-table__cell", `mdn-table__cell--${col.align ?? "left"}`)}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
