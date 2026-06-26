#!/usr/bin/env node
/**
 * AP-26: Gate execution has resource caps (timeout enforced, runaway gates killed)
 *
 * Attack: A PR feeds a gate pathological input (infinite loop, catastrophic regex,
 * multi-GB diff) so the gate hangs indefinitely, stalling CI or crashing the runner :
 * a DoS against the governance layer itself. Without a hard wall-clock cap the process
 * sits forever, consuming CPU and blocking the queue.
 *
 * Governance property: Every governance gate invocation MUST run under an enforced
 * wall-clock timeout via scripts/lib/run-gate-capped.mjs. On breach the process MUST
 * be killed (SIGKILL) and the result MUST report failure (timedOut true, status non-zero)
 * so the gate fails closed rather than hanging. Normal (fast) gates MUST still complete
 * cleanly (status 0, timedOut false) so the cap does not produce false positives.
 *
 * Expected outcomes:
 *   fixtures/gate-runaway.mjs under 1500 ms cap  →  timedOut === true, status !== 0
 *   trivial node -e script under cap             →  timedOut === false, status === 0
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const capperPath = join(root, "scripts/lib/run-gate-capped.mjs");
const fixturesDir = join(here, "../fixtures");

if (!existsSync(capperPath)) {
  console.error("FAIL AP-26: scripts/lib/run-gate-capped.mjs does not exist (control not implemented).");
  console.error("A missing resource cap is a governance gap : add run-gate-capped.mjs before claiming conformance.");
  process.exit(1);
}

const { runGateCapped } = await import(capperPath);

let passed = true;

// --- case 1: runaway gate must be killed within the timeout window ---
// fixtures/gate-runaway.mjs loops forever; the cap must kill it before 1500 ms.
const runaway = runGateCapped(
  ["node", join(fixturesDir, "gate-runaway.mjs")],
  { timeoutMs: 1500 }
);

if (runaway.timedOut !== true) {
  console.error(
    "FAIL AP-26 (runaway): timedOut was " + runaway.timedOut + ", expected true : " +
    "runaway gate was not killed by the timeout cap."
  );
  passed = false;
} else if (runaway.status === 0) {
  console.error(
    "FAIL AP-26 (runaway): status was 0 (expected non-zero) : a killed process must " +
    "not report a clean exit; gate must fail closed on timeout."
  );
  passed = false;
} else {
  console.log(
    "PASS AP-26 (runaway): timedOut === true and status !== 0 : runaway gate was killed " +
    "within the 1500 ms cap and reported failure (status " + runaway.status + ")."
  );
}

// --- case 2: trivial fast gate must complete normally under the cap ---
// A quick node -e script finishes well inside the timeout; the cap must not
// produce false positives by prematurely killing or misreporting clean exits.
const fast = runGateCapped(
  ["node", "-e", "process.exit(0)"],
  { timeoutMs: 5000 }
);

if (fast.timedOut !== false) {
  console.error(
    "FAIL AP-26 (fast): timedOut was " + fast.timedOut + ", expected false : " +
    "a trivial gate was falsely flagged as a timeout."
  );
  passed = false;
} else if (fast.status !== 0) {
  console.error(
    "FAIL AP-26 (fast): status was " + fast.status + ", expected 0 : " +
    "a clean-exit gate should not report failure under the cap."
  );
  passed = false;
} else {
  console.log(
    "PASS AP-26 (fast): timedOut === false and status === 0 : " +
    "fast gate completed normally without false-positive termination."
  );
}

if (!passed) process.exit(1);
