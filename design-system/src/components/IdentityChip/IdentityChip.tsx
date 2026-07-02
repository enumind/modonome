import { cx } from "../../lib/cx";

export type IdentityChipRole = "maker" | "checker";
export type IdentityChipSize = "sm" | "md";

export interface IdentityChipProps {
  /** Full display name. The avatar initials are derived from this. */
  name: string;
  /** Model identifier shown in muted mono text, e.g. "claude-sonnet-5". */
  model?: string;
  /** Which actor this identity acted as, used to color the avatar ring so the maker
   * and checker on a work item are visually distinguishable at a glance. */
  role?: IdentityChipRole;
  /** Control avatar size and type scale. Defaults to `md`. */
  size?: IdentityChipSize;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A compact identity marker: an initials avatar plus a name, with an optional model
 * string in muted mono beneath. When `role` is set the avatar ring is tinted (info for
 * maker, primary for checker) so the two actors on a work item read apart immediately,
 * without relying on the text alone.
 */
export function IdentityChip({ name, model, role, size = "md" }: IdentityChipProps) {
  return (
    <span className={cx("mdn-identitychip", `mdn-identitychip--${size}`)}>
      <span
        className={cx("mdn-identitychip__avatar", role && `mdn-identitychip__avatar--${role}`)}
        aria-hidden="true"
      >
        {initialsFor(name)}
      </span>
      <span className="mdn-identitychip__text">
        <span className="mdn-identitychip__name">{name}</span>
        {model ? <span className="mdn-identitychip__model">{model}</span> : null}
      </span>
    </span>
  );
}
