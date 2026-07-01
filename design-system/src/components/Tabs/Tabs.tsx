import { useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export interface TabItem {
  /** Stable identifier for the tab, passed back to `onChange`. */
  id: string;
  /** Visible tab label. */
  label: string;
  /** Optional leading icon. */
  icon?: IconName;
  /** Optional count badge rendered after the label, for example a queue depth. */
  count?: number;
}

export interface TabsProps {
  /** The ordered list of tabs to render. */
  tabs: TabItem[];
  /** The `id` of the currently active tab. */
  active: string;
  /** Called with a tab's `id` when the user selects it, by click or arrow-key navigation. */
  onChange: (id: string) => void;
  /** Optional class name applied to the tablist wrapper. */
  className?: string;
}

/**
 * An accessible horizontal tab list. Implements the WAI-ARIA tabs pattern: the
 * container carries `role="tablist"`, each tab carries `role="tab"` and
 * `aria-selected`, and only the active tab is in the tab order (roving tabindex).
 * Left/Right arrow keys move focus and selection between tabs; Home/End jump to the
 * first/last tab. The active tab is underlined in the primary color.
 */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const tab = tabRefs.current[index];
    tab?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (tabs.length === 0) return;
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    focusTab(nextIndex);
    onChange(nextTab.id);
  }

  return (
    <div className={cx("mdn-tabs", className)} role="tablist" aria-orientation="horizontal">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={cx("mdn-tabs__tab", selected && "mdn-tabs__tab--active")}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.icon ? <Icon name={tab.icon} size={14} /> : null}
            <span className="mdn-tabs__label">{tab.label}</span>
            {tab.count !== undefined ? <span className="mdn-tabs__count">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
