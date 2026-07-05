// Deterministic, offline detection of a work item whose `state` has drifted from
// reality: still `queued`/`claimed`/etc while its own declared gate tests already
// pass and its declared deliverable files already exist on disk. This is exactly
// the disconnect that let 15 merged items (WI-021, WI-022, WI-026 through WI-031,
// WI-034 through WI-040) sit marked open for days after their PRs landed, because
// nothing but a human running `transition-work-item.mjs` ever closes the loop.
//
// Pure detection only: this never writes a work item or runs anything with side
// effects beyond spawning the item's own declared, already-passing test commands.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// States where a real actor could plausibly still be working the item. An item
// past this point (merge_ready, merging, done, escalated) is either already
// closing out or parked for a human, so staleness detection does not apply.
export const OPEN_STATES = ["queued", "claimed", "making", "checking", "rework"];

// A lease is live when it has a holder and an unexpired expiry, mirroring
// transition-work-item.mjs's own leaseIsLive so the two files can never disagree
// about what "actively claimed" means.
export function hasLiveLease(item, now = new Date()) {
  const holder = item.lease_owner ?? item.owner ?? null;
  if (holder == null) return false;
  if (!item.lease_expires_at) return false;
  return new Date(item.lease_expires_at).getTime() > now.getTime();
}

const TEST_FILE_RE = /(?:tests|agentproof)\/[\w\-./]+\.test\.mjs/g;

// Every `tests/*.test.mjs` (or agentproof/*.test.mjs) path literally named in an
// item's gates array, deduplicated. Broad gates like "npm run verify" or
// "node scripts/check-style.mjs ." name no specific file and are ignored: only a
// gate naming the item's own dedicated test file counts as verifiable evidence.
export function extractOwnTestFiles(gates = []) {
  const found = new Set();
  for (const gate of gates) {
    for (const m of String(gate).matchAll(TEST_FILE_RE)) found.add(m[0]);
  }
  return [...found];
}

// Every allowed_edit_set entry that is not itself one of the item's own test
// files: the implementation surface the test files are supposed to prove exists.
export function implementationPaths(item) {
  const testFiles = new Set(extractOwnTestFiles(item.gates));
  return (item.allowed_edit_set ?? []).filter((p) => !testFiles.has(p));
}

// Decide whether a single open-state item looks stale, without running anything.
// Returns a reason string when every static precondition holds (has a resolvable
// test file, every implementation path exists, no live lease), or null when the
// item cannot or should not be checked. Runtime confirmation (does the test file
// actually pass) is a separate step so this stays testable without a subprocess.
export function staleCandidate(item, now = new Date()) {
  if (!OPEN_STATES.includes(item.state)) return null;
  if (hasLiveLease(item, now)) return null;

  const testFiles = extractOwnTestFiles(item.gates);
  if (testFiles.length === 0) return null;
  if (!testFiles.every((f) => existsSync(f))) return null;

  const implPaths = implementationPaths(item);
  if (implPaths.length === 0) return null;
  if (!implPaths.every((p) => existsSync(p))) return null;

  return { testFiles, implPaths };
}

// Run one already-existing test file and report whether it passed. Spawned, not
// imported, so a crash or hang in the target test cannot take this checker down
// with it; `node --test` on a single file is fast (the sole reason this check is
// cheap even though it duplicates work the full suite already does elsewhere).
export function testFilePasses(testFile, { spawn = spawnSync } = {}) {
  const result = spawn(process.execPath, ["--test", testFile], { encoding: "utf8" });
  return result.status === 0;
}

// Full check across every work item. Returns the list of stale findings; each
// entry names the item, the state it is stuck in, and the evidence (which test
// files and implementation paths already exist and pass).
export function findStaleWorkItems(items, { spawn = spawnSync, now = new Date() } = {}) {
  const stale = [];
  for (const item of items) {
    const candidate = staleCandidate(item, now);
    if (!candidate) continue;
    if (!candidate.testFiles.every((f) => testFilePasses(f, { spawn }))) continue;
    stale.push({ id: item.id, state: item.state, ...candidate });
  }
  return stale;
}
