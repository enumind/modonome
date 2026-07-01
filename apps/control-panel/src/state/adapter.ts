/**
 * The data source for the panel. In this build the two subjects are bundled fixtures:
 * host mode is a demo customer repo, product mode mirrors this repository's own durable
 * .modonome state. A real deployment would swap this module for one that reads the live
 * .modonome files (or a thin read-only endpoint) and returns the same PanelState shape,
 * so nothing in the screens changes. Arming is derived here from config plus the two
 * runtime facts (the CI secret and unapproved protected paths).
 */
import type { PanelMode, PanelState } from "./types";
import { deriveArming } from "./arming";
import { hostState } from "./fixtures/host";
import { productState } from "./fixtures/product";

export function getPanelState(mode: PanelMode): PanelState {
  const base = mode === "host" ? hostState : productState;
  return {
    ...base,
    arming: deriveArming(base.config, base.arming.envArmed, base.gates, base.protectedPaths),
  };
}
