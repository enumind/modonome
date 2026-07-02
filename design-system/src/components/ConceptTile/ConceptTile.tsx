import type { ButtonHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export interface ConceptTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Glyph representing the concept. */
  icon: IconName;
  /** Concept name, for example "Maker and checker". */
  label: string;
  /** Short category caption, for example "Separation of duties". */
  tag?: string;
}

/**
 * A compact, focusable tile naming one engine concept: an icon, its name, and a short
 * category tag. Renders as a real button so it is keyboard-reachable on its own, meant
 * to be wrapped in a HoverCard that reveals the concept's detail on hover or focus.
 * Carries no detail itself; it is a label, not a summary.
 */
export function ConceptTile({ icon, label, tag, className, ...rest }: ConceptTileProps) {
  return (
    <button type="button" className={cx("mdn-concepttile", className)} {...rest}>
      <span className="mdn-concepttile__icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="mdn-concepttile__label">{label}</span>
      {tag ? <span className="mdn-concepttile__tag">{tag}</span> : null}
    </button>
  );
}
