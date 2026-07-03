#!/usr/bin/env node
// Compare-and-swap a work item from one state to another under a lease.
// The swap is the concurrency primitive that lets two writers race for the
// same item without a real lock: a writer reads the item, proposes a
// transition, and tryTransition decides : deterministically, from the item's
// own fields : whether that writer is allowed to win. It succeeds only when
// the item is still in the expected fromState AND the writer holds the lease
// (no live lease, the lease is already theirs, or the lease has expired).
// A foreign live lease or a state that has already moved is a conflict, and
// the caller is expected to re-read and retry rather than overwrite.
//
// Pure and side-effect free: it reads no clock of its own beyond the supplied
// `now`, touches no filesystem, and returns a fresh item rather than mutating
// the input. The CLI shell below is the only part that does I/O.
// Usage: node scripts/transition-work-item.mjs <item.json> <fromState> <toState> <writerId>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A lease is "live" if it has an owner and an unexpired lease_expires_at.
// The lease holder is recorded as lease_owner (the field this swap writes) or,
// for older items, the schema's `owner` field; either counts. An item with no
// expiry, or an expiry at/before `now`, holds no live lease and is free to take.
function leaseHolder(item) {
  return item.lease_owner ?? item.owner ?? null;
}

function leaseIsLive(item, now) {
  if (leaseHolder(item) == null) return false;
  if (!item.lease_expires_at) return false;
  return new Date(item.lease_expires_at).getTime() > now.getTime();
}

// tryTransition(item, fromState, toState, writerId, now) -> result
//   { ok: true, item }                 swap succeeded; item is a fresh copy
//   { ok: false, conflict: "<reason>" } swap refused; item is left untouched
//
// `now` is injectable so the decision is deterministic in tests; it defaults
// to the wall clock for the CLI path.
export function tryTransition(item, fromState, toState, writerId, now = new Date()) {
  // (1) State must still be where the writer last saw it. If another writer
  // already advanced the item, this writer's premise is stale.
  if (item.state !== fromState) {
    return {
      ok: false,
      conflict: `state mismatch: expected ${fromState}, found ${item.state}`,
    };
  }

  // (2) The writer must hold the lease. A live lease owned by someone else
  // blocks the swap; no lease, an expired lease, or the writer's own lease
  // all clear it.
  const holder = leaseHolder(item);
  if (leaseIsLive(item, now) && holder !== writerId) {
    return {
      ok: false,
      conflict: `lease held by ${holder} until ${item.lease_expires_at}`,
    };
  }

  // Both checks pass: claim the item for this writer in the new state.
  return {
    ok: true,
    item: { ...item, state: toState, lease_owner: writerId },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [path, fromState, toState, writerId] = process.argv.slice(2);
  if (!path || !fromState || !toState || !writerId) {
    console.error("Usage: node scripts/transition-work-item.mjs <item.json> <fromState> <toState> <writerId>");
    process.exit(2);
  }
  const item = JSON.parse(readFileSync(path, "utf8"));
  const result = tryTransition(item, fromState, toState, writerId);
  if (!result.ok) {
    console.error(`Transition refused: ${result.conflict}`);
    process.exit(1);
  }
  writeFileSync(path, JSON.stringify(result.item, null, 2) + "\n");
  console.log(`Transition applied: ${item.id ?? path} ${fromState} -> ${toState} (writer ${writerId})`);
}
