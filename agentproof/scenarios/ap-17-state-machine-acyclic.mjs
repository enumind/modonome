/**
 * AP-17: State machine acyclic guard rejects cycles and deadlocks
 *
 * Attack vector: an agent or developer introduces a state machine with an
 * unguarded cycle (items loop forever without escape) or a deadlock (a
 * non-terminal state with no outgoing transitions strands items permanently).
 * If the acyclic guard is not enforced, the workflow engine can get stuck in
 * an infinite loop or leave work items in a terminal-less sink, making agent
 * progress impossible to guarantee.
 *
 * Governance property: check-state-machine-acyclic.mjs must exit 1 with a
 * stderr message mentioning "cycle" for a machine that has an unguarded cycle,
 * exit 1 for a machine with a deadlock (non-terminal sink or no path to any
 * terminal state), and exit 0 for a well-formed acyclic machine.
 *
 * Expected outcomes:
 *   state-machine-cyclic.json   -> exit 1, stderr mentions "cycle"
 *   state-machine-deadlock.json -> exit 1
 *   state-machine-valid.json    -> exit 0
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const checker = join(root, "scripts/check-state-machine-acyclic.mjs");
const fixtures = join(here, "../fixtures");

let passed = true;

// --- case 1: cyclic machine must exit 1 and mention "cycle" in stderr ---
const cyclic = spawnSync("node", [checker, join(fixtures, "state-machine-cyclic.json")], { encoding: "utf8" });
if (cyclic.status === 0) {
  console.error("FAIL: check-state-machine-acyclic accepted a cyclic state machine (exit 0, expected 1)");
  passed = false;
} else {
  const msg = cyclic.stderr + cyclic.stdout;
  if (!msg.toLowerCase().includes("cycle")) {
    console.error("FAIL: cyclic rejection does not mention cycle");
    console.error(msg);
    passed = false;
  } else {
    console.log("PASS: check-state-machine-acyclic rejects cyclic machine with cycle message");
  }
}

// --- case 2: deadlock machine must exit 1 ---
const deadlock = spawnSync("node", [checker, join(fixtures, "state-machine-deadlock.json")], { encoding: "utf8" });
if (deadlock.status === 0) {
  console.error("FAIL: check-state-machine-acyclic accepted a deadlocked state machine (exit 0, expected 1)");
  passed = false;
} else {
  console.log("PASS: check-state-machine-acyclic rejects deadlocked machine");
}

// --- case 3: valid machine must exit 0 ---
const valid = spawnSync("node", [checker, join(fixtures, "state-machine-valid.json")], { encoding: "utf8" });
if (valid.status !== 0) {
  console.error("FAIL: check-state-machine-acyclic rejected a valid state machine (expected exit 0)");
  console.error(valid.stderr + valid.stdout);
  passed = false;
} else {
  console.log("PASS: check-state-machine-acyclic accepts valid acyclic machine");
}

if (!passed) process.exit(1);
