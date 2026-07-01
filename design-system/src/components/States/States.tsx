import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export interface EmptyStateProps {
  /** Short heading describing what is missing, e.g. "No work items yet". */
  title: string;
  /** Optional supporting sentence with more context or next steps. */
  message?: string;
  /** Glyph shown above the title. Defaults to `queue`. */
  icon?: IconName;
  /** Optional call to action, typically a `Button`. */
  action?: ReactNode;
}

/**
 * Calm, muted placeholder for a screen or panel that has no content yet. Use for
 * empty queues, empty search results, or a fresh workspace before any work items
 * exist. Centered and low-emphasis so it never competes with real content.
 */
export function EmptyState({ title, message, icon = "queue", action }: EmptyStateProps) {
  return (
    <div className="mdn-state mdn-state--empty">
      <div className="mdn-state__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </div>
      <p className="mdn-state__title mdn-heading">{title}</p>
      {message ? <p className="mdn-state__message">{message}</p> : null}
      {action ? <div className="mdn-state__action">{action}</div> : null}
    </div>
  );
}

export interface LoadingStateProps {
  /** Text announced next to the spinner. Defaults to "Loading". */
  label?: string;
}

/**
 * Centered spinner with a label, used while a screen or panel is fetching data.
 * The spinner is a decorative rotating ring; the label carries the accessible
 * status via `role="status"` so assistive tech announces progress without a
 * color-only cue. Respects the reduced-motion setting from base.css.
 */
export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="mdn-state mdn-state--loading" role="status" aria-live="polite">
      <span className="mdn-state__spinner" aria-hidden="true" />
      <p className="mdn-state__message">{label}</p>
    </div>
  );
}

export interface ErrorStateProps {
  /** Short heading for the failure. Defaults to "Something went wrong". */
  title?: string;
  /** Optional supporting detail about what failed or how to recover. */
  message?: string;
  /** Optional recovery action, typically a retry `Button`. */
  action?: ReactNode;
}

/**
 * Danger-toned placeholder for a screen or panel that failed to load. Pairs the
 * danger color with an alert icon and text so the failure is never color-only.
 * Use `role="alert"` semantics are carried by the wrapping region so screen
 * readers announce the failure as it appears.
 */
export function ErrorState({ title = "Something went wrong", message, action }: ErrorStateProps) {
  return (
    <div className="mdn-state mdn-state--error" role="alert">
      <div className="mdn-state__icon mdn-state__icon--danger" aria-hidden="true">
        <Icon name="alert" size={22} />
      </div>
      <p className="mdn-state__title mdn-heading">{title}</p>
      {message ? <p className="mdn-state__message">{message}</p> : null}
      {action ? <div className="mdn-state__action">{action}</div> : null}
    </div>
  );
}

export interface PermissionDeniedStateProps {
  /** Short heading for the restriction. Defaults to "Permission required". */
  title?: string;
  /** Optional supporting detail about which role or actor can grant access. */
  message?: string;
  /** Optional action, such as a request-access `Button`. */
  action?: ReactNode;
}

/**
 * Owner-toned placeholder shown when the current actor lacks the role needed to
 * view or act on a screen. Pairs the owner color with a lock icon and text so the
 * restriction is never color-only.
 */
export function PermissionDeniedState({
  title = "Permission required",
  message,
  action,
}: PermissionDeniedStateProps) {
  return (
    <div className="mdn-state mdn-state--permission" role="alert">
      <div className="mdn-state__icon mdn-state__icon--owner" aria-hidden="true">
        <Icon name="lock" size={22} />
      </div>
      <p className="mdn-state__title mdn-heading">{title}</p>
      {message ? <p className="mdn-state__message">{message}</p> : null}
      {action ? <div className="mdn-state__action">{action}</div> : null}
    </div>
  );
}
