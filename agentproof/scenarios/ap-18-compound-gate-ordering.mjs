#!/usr/bin/env node
/**
 * AP-18: Compound gate failures are deterministic and ordered
 *
 * Attack: Multiple gates trip simultaneously (ratchet + identity collapse).
 * If gate evaluation order is non-deterministic (object key iteration, Promise.race),
 * an attacker exploits variance: soft gate wins one run, hard gate wins another,
 * producing inconsistent verdicts. Threat: flaky suite that sometimes merges bad code.
 *
 * Governance property: For a fixture violating N gates, the ordered failure list
 * MUST be identical across independent runs, following documented precedence
 * (ratchet before work-item: the integrity gate precedes the identity/governance check,
 * as declared in schemas/gate-graph.json where work-item depends on ratchet).
 *
 * Expected outcome: run-gate-pipeline.mjs executes 3 times on compound-failure fixtures,
 * all three failure arrays are deep-equal (determinism), and the first failure gate is
 * "ratchet" (top-precedence gate per documented dependency order).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const pipeline = join(root, "scripts/run-gate-pipeline.mjs");
const fixtures = join(here, "../fixtures");

// Guard: pipeline script must exist (control not implemented yet).
if (!existsSync(pipeline)) {
  console.error("FAIL: scripts/run-gate-pipeline.mjs does not exist (control not implemented)");
  process.exit(1);
}

// Run the pipeline three independent times and capture the stdout JSON each time.
const RUN_COUNT = 3;
const runs = [];

for (let i = 0; i < RUN_COUNT; i++) {
  const result = spawnSync(
    "node",
    [
      pipeline,
      "--diff", join(fixtures, "compound-failure.patch"),
      "--work-item", join(fixtures, "work-item-compound-failure.json"),
    ],
    { encoding: "utf8" }
  );

  let failures;
  try {
    failures = JSON.parse(result.stdout.trim());
  } catch {
    console.error(`FAIL: run ${i + 1} stdout is not valid JSON`);
    console.error("stdout:", result.stdout);
    console.error("stderr:", result.stderr);
    process.exit(1);
  }

  if (!Array.isArray(failures)) {
    console.error(`FAIL: run ${i + 1} output is not a JSON array`);
    process.exit(1);
  }

  runs.push(failures);
}

// Assert at least one failure was detected (fixture must trip multiple gates).
if (runs[0].length === 0) {
  console.error("FAIL: no gate failures detected (compound-failure fixtures should trip multiple gates)");
  process.exit(1);
}

// Assert determinism: all three runs must produce deep-equal failure arrays.
const baselineJSON = JSON.stringify(runs[0]);
for (let i = 1; i < RUN_COUNT; i++) {
  if (JSON.stringify(runs[i]) !== baselineJSON) {
    console.error(`FAIL: run ${i + 1} failure order diverged from run 1 (non-deterministic ordering)`);
    console.error("run 1:", baselineJSON);
    console.error(`run ${i + 1}:`, JSON.stringify(runs[i]));
    process.exit(1);
  }
}

// Assert correct precedence: the first failure must be the "ratchet" gate.
// schemas/gate-graph.json declares work-item depends on ratchet, so ratchet runs
// first; the integrity check precedes the identity/governance check.
const firstGate = runs[0][0].gate;
if (firstGate !== "ratchet") {
  console.error(`FAIL: first failure is "${firstGate}", expected "ratchet" (top-precedence gate)`);
  console.error("Full failure list:", JSON.stringify(runs[0], null, 2));
  process.exit(1);
}

console.log(
  `PASS: gate pipeline is deterministic across ${RUN_COUNT} runs and ratchet is the first failure (top-precedence gate)`
);
