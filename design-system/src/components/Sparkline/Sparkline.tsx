import { useId } from "react";

export type SparklineTone = "primary" | "info" | "owner" | "danger";

export interface SparklineProps {
  /** Series of numeric samples, oldest first. Rendered as a normalized trend line. */
  data: number[];
  /** Semantic tone for the line and area fill. Defaults to `primary`. */
  tone?: SparklineTone;
  /** Pixel width of the chart. Defaults to 120. */
  width?: number;
  /** Pixel height of the chart. Defaults to 32. */
  height?: number;
  /** Fill the area under the line with a low-alpha gradient of the tone. Defaults to true. */
  showArea?: boolean;
  /** Accessible name. When set, the chart is exposed as `role="img"`; otherwise it is decorative. */
  ariaLabel?: string;
}

const TONE_VAR: Record<SparklineTone, string> = {
  primary: "var(--mdn-primary)",
  info: "var(--mdn-info)",
  owner: "var(--mdn-owner)",
  danger: "var(--mdn-danger)",
};

/**
 * A minimal inline trend chart: a single line normalized to fit the box, with an
 * optional soft area fill beneath it. No axes or gridlines, intended to sit inline
 * next to a metric (cost trend, throughput, coverage over time). Handles 0 or 1
 * data points by rendering a flat or empty line instead of throwing.
 */
export function Sparkline({
  data,
  tone = "primary",
  width = 120,
  height = 32,
  showArea = true,
  ariaLabel,
}: SparklineProps) {
  const gradientId = useId();
  const color = TONE_VAR[tone];
  const padding = 2;
  const innerW = Math.max(width - padding * 2, 1);
  const innerH = Math.max(height - padding * 2, 1);

  const points = toPoints(data, innerW, innerH, padding);
  const linePath = points.length > 0 ? toLinePath(points) : "";
  const areaPath =
    showArea && points.length > 0
      ? `${linePath} L${points[points.length - 1][0]},${height - padding} L${points[0][0]},${height - padding} Z`
      : "";

  return (
    <svg
      className="mdn-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    >
      {showArea && areaPath ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      ) : null}
      {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" /> : null}
      {points.length === 1 ? (
        <circle cx={points[0][0]} cy={points[0][1]} r={1.5} fill={color} />
      ) : linePath ? (
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
}

function toPoints(data: number[], innerW: number, innerH: number, padding: number): [number, number][] {
  if (data.length === 0) return [];
  if (data.length === 1) {
    return [[padding + innerW / 2, padding + innerH / 2]];
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  return data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / span) * innerH;
    return [x, y];
  });
}

function toLinePath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
}
