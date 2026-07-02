import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";

export interface HelpHintProps {
  /** The explanation shown in the tooltip, and the button's accessible name. */
  label?: string;
  /** Alternative to `label`: pass the explanation as children. */
  children?: ReactNode;
  /** Pixel size of the icon glyph. Defaults to 13. */
  size?: number;
}

/**
 * A tiny circular help affordance: a `help` icon button that reveals its text in a
 * Tooltip on hover or keyboard focus. This is the pervasive "hover for context"
 * control placed next to section labels and field titles throughout the panel, so it
 * stays small, calm, and out of the way until it is used. Pass the text as `label` or
 * as children; both work.
 */
export function HelpHint({ label, children, size = 13 }: HelpHintProps) {
  const content = label ?? children;
  const accessibleName = label ?? (typeof children === "string" ? children : "More information");
  return (
    <Tooltip content={content}>
      <button type="button" className="mdn-helphint" aria-label={accessibleName}>
        <Icon name="help" size={size} />
      </button>
    </Tooltip>
  );
}
