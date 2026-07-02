import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export type ToastTone = "ok" | "info" | "attention" | "blocked";

export interface ToastProps {
  /** Semantic tone driving the accent color and icon. Defaults to `info`. */
  tone?: ToastTone;
  /** Toast headline. Always rendered. */
  title: string;
  /** Optional supporting detail below the title. */
  message?: string;
  /** Called when the dismiss control is activated. Omit to hide the close button. */
  onDismiss?: () => void;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  ok: "check-circle",
  info: "info",
  attention: "alert",
  blocked: "ban",
};

/**
 * A single notification card with a tone-colored left accent, an icon, a title and
 * optional message, and an optional dismiss control. Not a stacking provider: mount
 * one `Toast` per visible notification, positioned by the caller. Uses `role="status"`
 * for calm tones (`ok`, `info`, `attention`) and `role="alert"` for `blocked` so
 * assistive tech announces urgent notices immediately.
 */
export function Toast({ tone = "info", title, message, onDismiss }: ToastProps) {
  const isUrgent = tone === "blocked";
  return (
    <div
      className={cx("mdn-toast", `mdn-toast--${tone}`)}
      role={isUrgent ? "alert" : "status"}
      aria-live={isUrgent ? "assertive" : "polite"}
    >
      <span className="mdn-toast__accent" aria-hidden="true" />
      <span className="mdn-toast__icon" aria-hidden="true">
        <Icon name={TONE_ICON[tone]} size={16} />
      </span>
      <span className="mdn-toast__body">
        <span className="mdn-toast__title">{title}</span>
        {message ? <span className="mdn-toast__message">{message}</span> : null}
      </span>
      {onDismiss ? (
        <button type="button" className="mdn-toast__close" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="x" size={13} />
        </button>
      ) : null}
    </div>
  );
}
