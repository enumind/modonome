import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export type PanelMode = "host" | "product";

export interface ModeSwitcherProps {
  /** Which subject the panel is currently reading. */
  mode: PanelMode;
  /** Called when the operator switches subject. */
  onModeChange: (mode: PanelMode) => void;
  /** Label for the host option. Defaults to "Host repo". */
  hostLabel?: string;
  /** Label for the product option. Defaults to "Modonome". */
  productLabel?: string;
}

const OPTIONS: Array<{ value: PanelMode; icon: IconName; fallback: string; sub: string }> = [
  { value: "host", icon: "activity", fallback: "Host repo", sub: "Installed in your repo" },
  { value: "product", icon: "brand", fallback: "Modonome", sub: "Governing itself" },
];

/**
 * The global context switch. Host mode reads the engine as installed in a customer
 * repo; product mode reads modonome governing its own repository (self-application).
 * The same screens serve either subject, so this control changes what the panel is
 * looking at, not what it can do. Implemented as a radio group for assistive tech.
 */
export function ModeSwitcher({ mode, onModeChange, hostLabel, productLabel }: ModeSwitcherProps) {
  const labels = { host: hostLabel, product: productLabel };
  return (
    <div className="mdn-modeswitch" role="radiogroup" aria-label="Panel subject">
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={cx("mdn-modeswitch__opt", active && "is-active")}
            onClick={() => onModeChange(opt.value)}
          >
            <Icon name={opt.icon} size={15} />
            <span className="mdn-modeswitch__text">
              <span className="mdn-modeswitch__label">{labels[opt.value] ?? opt.fallback}</span>
              <span className="mdn-modeswitch__sub">{opt.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
