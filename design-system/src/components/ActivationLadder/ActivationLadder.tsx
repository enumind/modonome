import { cx } from "../../lib/cx";
import { Icon } from "../Icon/Icon";
import { Button } from "../Button/Button";
import type { ArmingMode } from "../../tokens/tokens";

export interface ActivationCheck {
  /** Short name of the prerequisite. */
  label: string;
  /** Whether the prerequisite currently holds. */
  ok: boolean;
  /** One sentence explaining the current state. */
  reason: string;
  /** True when only the owner can satisfy this out of band, for example the CI secret. */
  ownerOnly?: boolean;
}

export interface ActivationLadderProps {
  /** The engine's effective arming mode. */
  mode: ArmingMode;
  /** The armed-mode prerequisites, each with a pass or blocked state and a reason. */
  checklist: ActivationCheck[];
  /** Trigger a dry-run sweep. */
  onDryRun?: () => void;
  /** Arm the engine. The panel should confirm before calling this. */
  onArm?: () => void;
  /** Return the engine to dry-run. The panel should confirm before calling this. */
  onDisarm?: () => void;
}

const RUNGS: Array<{ mode: ArmingMode; label: string; blurb: string }> = [
  { mode: "disabled", label: "Disabled", blurb: "Read only. Adoption maps only." },
  { mode: "dry-run", label: "Dry-run", blurb: "Projects decisions. No writes." },
  { mode: "armed", label: "Armed", blurb: "Opens and merges once gates pass." },
];

/**
 * The activation ladder: the three-rung progression from Disabled to Dry-run to Armed,
 * paired with the armed-mode gate checklist. Arming is only allowed when every
 * prerequisite holds. Items marked owner-only cannot be satisfied from the panel (the
 * MODONOME_ARMED CI secret is set out of band), so the ladder surfaces them as a
 * standing instruction rather than a button.
 */
export function ActivationLadder({ mode, checklist, onDryRun, onArm, onDisarm }: ActivationLadderProps) {
  const activeIndex = RUNGS.findIndex((r) => r.mode === mode);
  const panelChecks = checklist.filter((c) => !c.ownerOnly);
  const ownerChecks = checklist.filter((c) => c.ownerOnly);
  const panelReady = panelChecks.every((c) => c.ok);
  const blockedCount = checklist.filter((c) => !c.ok).length;

  return (
    <div className="mdn-ladder">
      <ol className="mdn-ladder__rungs" aria-label="Activation ladder">
        {RUNGS.map((rung, i) => (
          <li
            key={rung.mode}
            className={cx(
              "mdn-ladder__rung",
              i === activeIndex && "is-active",
              i < activeIndex && "is-passed",
              `mdn-ladder__rung--${rung.mode}`,
            )}
            aria-current={i === activeIndex ? "step" : undefined}
          >
            <span className="mdn-ladder__node" aria-hidden="true">
              <Icon name={i < activeIndex ? "check" : i === activeIndex ? "dot" : "dot"} size={14} />
            </span>
            <span className="mdn-ladder__rung-label">{rung.label}</span>
            <span className="mdn-ladder__rung-blurb">{rung.blurb}</span>
            {i < RUNGS.length - 1 ? <span className="mdn-ladder__line" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <div className="mdn-ladder__checklist">
        <div className="mdn-ladder__checklist-head">
          <span className="mdn-label">Armed-mode prerequisites</span>
          <span className={cx("mdn-ladder__count", blockedCount === 0 ? "is-ok" : "is-blocked")}>
            {blockedCount === 0 ? "All clear" : `${blockedCount} blocking`}
          </span>
        </div>
        <ul className="mdn-ladder__checks">
          {checklist.map((c) => (
            <li key={c.label} className={cx("mdn-ladder__check", c.ok ? "is-ok" : "is-blocked")}>
              <Icon name={c.ok ? "check-circle" : c.ownerOnly ? "lock" : "alert"} size={15} />
              <span className="mdn-ladder__check-body">
                <span className="mdn-ladder__check-label">
                  {c.label}
                  {c.ownerOnly ? <span className="mdn-ladder__owner-tag">owner</span> : null}
                </span>
                <span className="mdn-ladder__check-reason">{c.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mdn-ladder__actions">
        {onDryRun ? (
          <Button variant="secondary" iconLeft="play" onClick={onDryRun}>
            Run dry-run sweep
          </Button>
        ) : null}
        {mode !== "armed" && onArm ? (
          <Button variant="primary" iconLeft="shield" onClick={onArm} disabled={!panelReady}>
            Arm engine
          </Button>
        ) : null}
        {mode === "armed" && onDisarm ? (
          <Button variant="danger" iconLeft="power" onClick={onDisarm}>
            Return to dry-run
          </Button>
        ) : null}
        {!panelReady && mode !== "armed" ? (
          <span className="mdn-ladder__hint">
            {ownerChecks.length > 0
              ? "Clear the blocking prerequisites. Owner-only items are set in CI."
              : "Clear the blocking prerequisites to arm."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
