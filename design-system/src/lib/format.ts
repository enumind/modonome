/**
 * Small formatting helpers shared by the domain components. Kept dependency-free and
 * deterministic (they take an explicit "now" so renders are stable and testable).
 */

/** Format an ISO timestamp as a short relative string, for example "3m ago" or "in 12m". */
export function relativeTime(iso: string, now: number = Date.parse("2026-07-01T09:45:00Z")): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const deltaMs = then - now;
  const past = deltaMs <= 0;
  const abs = Math.abs(deltaMs);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return "just now";
  const units: Array<[number, string]> = [
    [60, "m"],
    [60 * 24, "h"],
    [60 * 24 * 30, "d"],
  ];
  let value = mins;
  let unit = "m";
  if (mins >= 60 && mins < 60 * 24) {
    value = Math.round(mins / 60);
    unit = "h";
  } else if (mins >= 60 * 24) {
    value = Math.round(mins / (60 * 24));
    unit = "d";
  }
  void units;
  return past ? `${value}${unit} ago` : `in ${value}${unit}`;
}

/** Format a duration in milliseconds as a compact string, for example "1.2s" or "9s". */
export function formatDuration(ms?: number): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s >= 10 ? Math.round(s) : s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

/** Format a USD amount with two decimals. */
export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
