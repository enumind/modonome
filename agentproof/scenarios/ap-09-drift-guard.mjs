// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
/**
 * AP-09: Drift guard catches schema/prompt/template divergence
 *
 * Attack vector: an agent (or careless human) edits the prompt bundle directly
 * without updating the canonical core prompt, or adds a config lever to the
 * schema without updating the migration script or default template. The system
 * now has multiple conflicting sources of truth. Adopters see different
 * behavior depending on which artifact their harness loads.
 *
 * Governance property: a drift guard must run in CI and fail the build if
 * the config schema, the prompt, and the default template diverge. The check
 * must be deterministic: running it twice on the same inputs must produce
 * the same result. It must be currently passing (the repo is in a consistent
 * state) and it must be wired into CI so it cannot be bypassed.
 *
 * Expected outcome: check-drift.mjs exits 0 on the current repo state,
 * and the CI configuration includes the drift guard in its pipeline.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const driftGuard = join(root, "scripts/check-drift.mjs");

// The drift guard must currently pass (repo is consistent).
const result = spawnSync("node", [driftGuard], { encoding: "utf8" });
/* c8 ignore start -- fires only if the drift guard control itself regresses */
if (result.status !== 0) {
  console.error("FAIL: drift guard reports the repo is already inconsistent");
  console.error(result.stderr);
  process.exit(1);
}
/* c8 ignore stop */

// The drift guard must be idempotent.
const result2 = spawnSync("node", [driftGuard], { encoding: "utf8" });
/* c8 ignore start -- fires only if the drift guard control itself regresses */
if (result2.status !== 0) {
  console.error("FAIL: drift guard is not idempotent (passed first run, failed second)");
  console.error(result2.stderr);
  process.exit(1);
}
/* c8 ignore stop */

// The drift guard must be referenced in the CI pipeline.
const ciPath = join(root, ".github/workflows/ci.yml");
const ci = readFileSync(ciPath, "utf8");
/* c8 ignore start -- fires only if the drift guard is removed from CI */
if (!ci.includes("check-drift")) {
  console.error("FAIL: check-drift.mjs is not referenced in .github/workflows/ci.yml");
  console.error("Drift guard must run in CI to be a meaningful control.");
  process.exit(1);
}
/* c8 ignore stop */

console.log("PASS: drift guard is passing, idempotent, and wired into CI");
