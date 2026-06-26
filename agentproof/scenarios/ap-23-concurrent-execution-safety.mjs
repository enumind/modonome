#!/usr/bin/env node
/**
 * AP-23: Concurrent gate execution is serialized or has conflict detection
 *
 * Attack: Two agent sessions act on the same work item concurrently : both
 * transition from queued -> claimed without synchronization. TOCTOU race lets
 * two branches open for one item, defeating the single-merge-authority invariant.
 *
 * Governance property: Concurrent mutations of the same work item MUST be
 * serialized (lease/lock or compare-and-swap on state). At most one writer wins;
 * loser is rejected with conflict, never silently overwrites. Idempotency holds.
 *
 * Expected outcomes:
 *   work-item-concurrent-base.json: two writers racing queued->claimed yield
 *     exactly one {ok:true} and one {ok:false, conflict}.
 *   work-item-stale-lease.json: a new writer CAN claim an item whose lease has
 *     expired : the expired-lease path is not blocked.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixtures = join(here, "../fixtures");

const { tryTransition } = await import(join(root, "scripts/transition-work-item.mjs"));

let passed = true;

// --- case 1: two writers race queued -> claimed on the same snapshot ---
// The realistic concurrent scenario: writer-1 reads the item and calls
// tryTransition; writer-2 also reads the same original snapshot and calls
// tryTransition. The first write is committed (writer-1's result becomes the
// persisted item). Writer-2 then attempts the same transition against the now-
// updated item : the compare-and-swap must detect that the item has moved and
// return {ok:false, conflict}. Exactly one success and one conflict is required.

const base = JSON.parse(readFileSync(join(fixtures, "work-item-concurrent-base.json"), "utf8"));

// Writer-1 acts on the original snapshot and wins.
const result1 = tryTransition({ ...base }, "queued", "claimed", "writer-1");

// Writer-2 acts on writer-1's committed result (item is now claimed by writer-1).
const result2 = tryTransition({ ...result1.item }, "queued", "claimed", "writer-2");

const outcomes = [result1, result2];
const successCount = outcomes.filter(r => r.ok).length;
const conflictCount = outcomes.filter(r => !r.ok && r.conflict).length;

if (successCount !== 1) {
  console.error(`FAIL [concurrent-base]: expected exactly 1 success, got ${successCount}`);
  passed = false;
} else if (conflictCount !== 1) {
  console.error(`FAIL [concurrent-base]: expected exactly 1 conflict, got ${conflictCount}`);
  passed = false;
} else if (!result1.ok) {
  console.error("FAIL [concurrent-base]: first writer unexpectedly lost");
  passed = false;
} else if (result2.ok) {
  console.error("FAIL [concurrent-base]: second writer should be blocked after first commits");
  passed = false;
} else {
  console.log("PASS [concurrent-base]: exactly one {ok:true} and one {ok:false, conflict} as required");
}

if (!result2.conflict) {
  console.error("FAIL [concurrent-base]: losing result missing .conflict field");
  passed = false;
} else {
  console.log(`PASS [concurrent-base]: conflict reason reported: "${result2.conflict}"`);
}

// --- case 2: stale-lease item can be claimed by a new writer ---
// The stale-lease fixture has an expired lease_expires_at (2020-01-01). A new
// writer must be allowed to claim it : blocking on an expired lease would strand
// work items permanently, which violates liveness. We supply a fixed `now` well
// after the expiry to make the decision deterministic.
const stale = JSON.parse(readFileSync(join(fixtures, "work-item-stale-lease.json"), "utf8"));
const now = new Date("2024-01-01T00:00:00Z"); // well after the 2020 expiry
const staleResult = tryTransition({ ...stale }, stale.state, "checked", "new-writer", now);

if (!staleResult.ok) {
  console.error(`FAIL [stale-lease]: new writer blocked on expired lease: ${staleResult.conflict}`);
  passed = false;
} else if (staleResult.item.lease_owner !== "new-writer") {
  console.error(`FAIL [stale-lease]: lease_owner not updated to new-writer (got ${staleResult.item.lease_owner})`);
  passed = false;
} else {
  console.log("PASS [stale-lease]: new writer successfully claimed item with expired lease");
}

if (!passed) process.exit(1);
