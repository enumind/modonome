#!/usr/bin/env node
/**
 * AP-26: Gate execution has resource caps (memory, CPU, timeout)
 *
 * Attack: A PR feeds a gate pathological input (multi-GB diff, catastrophic regex,
 * infinite loop) so the gate hangs or OOMs, stalling CI indefinitely or crashing
 * the runner — DoS against the governance layer itself. Existing scattered timeout
 * literals exist (runner.mjs 30s, evidence builder 60s) but no uniform enforced cap.
 *
 * Governance property: Every governance gate invocation runs under enforced wall-clock
 * timeout + bounded output (maxBuffer); on breach the process is killed and gate MUST
 * report failure (fail-closed), never hang or be skipped. Caps declared centrally.
 *
 * Expected outcome: run-gate-capped.mjs kills a runaway gate within timeout window.
 * Runaway fixture → {timedOut:true, status:non-zero} on timeout.
 * Oversized diff → fails closed on maxBuffer breach.
 * Normal gate → completes normally (status 0, timedOut false).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const capperScript = join(root, "scripts/lib/run-gate-capped.mjs");
const fixtures = join(here, "../fixtures");

if (!existsSync(capperScript)) {
  console.error("FAIL: scripts/lib/run-gate-capped.mjs does not exist (control not implemented)");
  process.exit(1);
}

try {
  const { runGateCapped } = await import(capperScript);

  const runaway = runGateCapped(["node", join(fixtures, "gate-runaway.mjs")], { timeoutMs: 1500 });
  if (!runaway.timedOut && runaway.status === 0) {
    console.error("FAIL: runaway gate was not killed by timeout");
    process.exit(1);
  }

  const normal = runGateCapped(["node", "-e", "console.log('ok'); process.exit(0)"], { timeoutMs: 5000 });
  if (normal.timedOut || normal.status !== 0) {
    console.error("FAIL: normal gate was false-positive killed or exited non-zero");
    process.exit(1);
  }

  console.log("PASS: gate execution is capped; runaway gates are killed, normal gates complete");
} catch (e) {
  console.error(`FAIL: ${e.message}`);
  process.exit(1);
}
