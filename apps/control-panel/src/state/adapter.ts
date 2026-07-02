/**
 * The data source for the panel. It always tries the live /api/modonome/state route
 * first, which the Vite dev/preview server exposes by reading the real .modonome
 * directory on disk (see server/api.mjs). That route only exists while a local server
 * is running, so a static production build, or any request that fails, falls back to
 * the bundled fixtures: host mode to a demo customer repo, product mode to a
 * fixed snapshot of this repository's own durable state. The fallback is always
 * tagged `source.kind === "demo"` so the UI never presents it as real. Arming is
 * derived here, after either path, from config plus the two runtime facts (the CI
 * secret and unapproved protected paths) so both sources share one derivation.
 */
import type { PanelMode, PanelState } from "./types";
import { deriveArming } from "./arming";
import { hostState } from "./fixtures/host";
import { productState } from "./fixtures/product";
import { fetchLiveState, LiveApiError } from "./liveClient";

export function finalizeState(base: PanelState): PanelState {
  return {
    ...base,
    arming: deriveArming(base.config, base.arming.envArmed, base.gates, base.protectedPaths),
  };
}

export async function loadPanelState(mode: PanelMode, dir?: string): Promise<PanelState> {
  try {
    const live = await fetchLiveState(mode, dir);
    return finalizeState(live);
  } catch (err) {
    const fixture = mode === "host" ? hostState : productState;
    const message = err instanceof LiveApiError ? err.message : String(err);
    return finalizeState({
      ...fixture,
      source: { kind: "demo", writable: false, error: message },
    });
  }
}
