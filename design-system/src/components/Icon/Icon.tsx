import type { SVGProps } from "react";

/**
 * The curated Modonome icon set. Every glyph is a stroke path on a 24x24 grid and
 * inherits `currentColor`, so an icon takes the color of whatever text or control it
 * sits in. Icons are decorative by default (aria-hidden); pass a `title` to give an
 * icon its own accessible name when it stands alone.
 */
export type IconName =
  | "check"
  | "check-circle"
  | "shield"
  | "power"
  | "play"
  | "pause"
  | "alert"
  | "info"
  | "help"
  | "x"
  | "chevron-right"
  | "chevron-down"
  | "clock"
  | "cost"
  | "branch"
  | "merge"
  | "lock"
  | "user"
  | "users"
  | "activity"
  | "queue"
  | "gauge"
  | "book"
  | "settings"
  | "arrow-right"
  | "dot"
  | "spark"
  | "ban"
  | "refresh"
  | "external"
  | "brand";

const PATHS: Record<IconName, string> = {
  check: "M5 13l4 4L19 7",
  "check-circle": "M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12l2.5 2.5L15.5 9.5",
  shield: "M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z",
  power: "M12 4v8M7.5 7a7 7 0 109 0",
  play: "M7 5l11 7-11 7z",
  pause: "M9 5v14M15 5v14",
  alert: "M12 3l9 16H3L12 3zM12 10v4M12 17.5v.5",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5v.5",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 013.9-2c1.3.8 1 2.3-.4 3.1-.9.5-1 1-1 2M12 17.5v.5",
  x: "M6 6l12 12M18 6L6 18",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-down": "M6 9l6 6 6-6",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  cost: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3",
  branch: "M6 4v12M6 16a3 3 0 100 4 3 3 0 000-4zM6 4a3 3 0 100-.01M18 8a3 3 0 100-4 3 3 0 000 4zm0 0c0 4-6 2-6 8",
  merge: "M6 4v12M6 4a3 3 0 100-.01M6 16a3 3 0 100 4 3 3 0 000-4zM18 12a3 3 0 100-4 3 3 0 000 4zm0 0c0 4-6 2-6 4",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20c0-3.3 3.1-5 7-5s7 1.7 7 5",
  users: "M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5M16 5.5a3.5 3.5 0 010 7M21 20c0-2.4-1.4-3.8-3.5-4.3",
  activity: "M3 12h4l3 7 4-14 3 7h4",
  queue: "M4 6h16M4 12h16M4 18h10",
  gauge: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 12l4-3",
  book: "M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2V4zM5 4v14M9 8h6M9 11h6",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l1.5-1-1-2.5-1.9.4a6 6 0 00-1.4-.8L15.5 4h-3l-.7 2.3a6 6 0 00-1.4.8L8.5 6.7l-2 2.5L8 12l-1.5 2.8 2 2.5 1.9-.4a6 6 0 001.4.8L12.5 20h3l.7-2.3a6 6 0 001.4-.8l1.9.4 1-2.5L19 12z",
  "arrow-right": "M4 12h15M13 6l6 6-6 6",
  dot: "M12 12h.01",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  ban: "M12 21a9 9 0 100-18 9 9 0 000 18zM6 6l12 12",
  refresh: "M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4",
  external: "M14 5h5v5M19 5l-8 8M17 13v4a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h4",
  brand: "M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12l2.5 2.5L15.5 9.5",
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  /** Which glyph to render. */
  name: IconName;
  /** Pixel size for width and height. Defaults to 16. */
  size?: number;
  /** Accessible name. When set, the icon is exposed to assistive tech instead of hidden. */
  title?: string;
  /** Stroke width on the 24-grid. Defaults to 1.8. */
  strokeWidth?: number;
}

export function Icon({ name, size = 16, title, strokeWidth = 1.8, ...rest }: IconProps) {
  const filled = name === "play" || name === "dot" || name === "spark";
  return (
    <svg
      className="mdn-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}
