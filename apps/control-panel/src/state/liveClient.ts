/**
 * Talks to the /api/modonome/* routes the dev-server plugin exposes (see
 * apps/control-panel/server/api.mjs). Every call can fail: the route only exists while
 * the Vite dev or preview server is running, and write calls fail on purpose unless the
 * operator started the server with MODONOME_PANEL_WRITE=1. Callers decide what a
 * failure means (adapter.ts falls back to demo data; write actions surface the error).
 */
import type { PanelMode, PanelState } from "./types";

export class LiveApiError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (err) {
    throw new LiveApiError(`No response from the panel's local API (${err instanceof Error ? err.message : err}).`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LiveApiError(body.error ?? `Request to ${path} failed with status ${res.status}.`);
  }
  return body as T;
}

export function fetchLiveState(mode: PanelMode, dir?: string): Promise<PanelState> {
  const params = new URLSearchParams({ mode });
  if (dir) params.set("dir", dir);
  return call<PanelState>(`/api/modonome/state?${params.toString()}`);
}

export function saveConfig(
  mode: PanelMode,
  patch: Record<string, unknown>,
  dir?: string,
): Promise<PanelState> {
  return call<PanelState>("/api/modonome/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, dir, patch }),
  });
}

export function releaseLeaseLive(mode: PanelMode, itemId: string, dir?: string): Promise<PanelState> {
  return call<PanelState>("/api/modonome/lease/release", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, dir, itemId }),
  });
}

export function pruneLearningLive(mode: PanelMode, lesson: string, dir?: string): Promise<PanelState> {
  return call<PanelState>("/api/modonome/learning/prune", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, dir, lesson }),
  });
}

export interface ConnectionTestResult {
  ok: boolean;
  models?: string[];
  error?: string;
}

/** Read-only reachability probe for an OpenAI-compatible base URL (LM Studio, Ollama, a gateway). */
export function testConnectionLive(baseUrl: string): Promise<ConnectionTestResult> {
  return call<ConnectionTestResult>(`/api/modonome/test-connection?baseUrl=${encodeURIComponent(baseUrl)}`);
}
