// Durable, file-based, zero-dependency action queue. Each queued action is one
// JSON file under a configurable directory (default .modonome/queue/). A worker
// in a given execution environment claims the oldest queued action whose target
// it can serve, under a lease. This mirrors the ADR-007 work-item lease pattern:
// a claimed record carries lease_expires_at, and a lease whose expiry is in the
// past reverts the record to queued so another worker can take it.
//
// No network. Writes are atomic (temp file then rename) so a crash mid-write
// never leaves a half-written record on disk.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "../lib/jsonschema.mjs";
import { formatMessage, loadMessageOverrides } from "../lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

export const DEFAULT_QUEUE_DIR = join(root, ".modonome", "queue");
export const DEFAULT_LEASE_MINUTES = 30;

const schema = JSON.parse(readFileSync(join(root, "schemas", "action-queue.schema.json"), "utf8"));
const overrides = loadMessageOverrides(join(root, ".modonome"));

// Validate a record against the action-queue schema. Throws with the collected
// errors so a malformed action can never be enqueued.
function assertValid(record) {
  const errors = validate(schema, record);
  if (errors.length > 0) {
    throw new Error(formatMessage("agent-run.action-queue.invalid-record", { errors: errors.join("\n  - ") }, overrides).message);
  }
}

function recordPath(dir, id) {
  return join(dir, `${id}.json`);
}

// Atomic write: serialize to a temp file in the same directory, then rename over
// the destination. Rename is atomic on the same filesystem, so a reader never
// observes a partial record.
function writeAtomic(dir, id, record) {
  mkdirSync(dir, { recursive: true });
  const dest = recordPath(dir, id);
  const tmp = join(dir, `.${id}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(record, null, 2) + "\n");
  renameSync(tmp, dest);
}

function readRecord(dir, file) {
  return JSON.parse(readFileSync(join(dir, file), "utf8"));
}

function listRecords(dir) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const file of files) {
    if (!file.endsWith(".json") || file.startsWith(".")) continue;
    out.push(readRecord(dir, file));
  }
  return out;
}

/**
 * Enqueue an action. Fills schema_version, state, and created_at when omitted,
 * validates the record, and writes it atomically. Returns the stored record.
 *
 * @param {object} action - At least id, target, role, model, transport.
 * @param {string} [dir] - Queue directory (default .modonome/queue/).
 * @returns {object}
 */
export function enqueue(action, dir = DEFAULT_QUEUE_DIR) {
  if (!action || !action.id)
    throw new Error(formatMessage("agent-run.action-queue.missing-id", {}, overrides).message);
  const record = {
    schema_version: action.schema_version ?? 1,
    state: "queued",
    created_at: action.created_at ?? new Date().toISOString(),
    ...action,
    state: "queued",
  };
  assertValid(record);
  writeAtomic(dir, record.id, record);
  return record;
}

/**
 * List queued (not claimed/done/failed) actions, oldest first by created_at.
 *
 * @param {string} [dir]
 * @returns {object[]}
 */
export function listQueued(dir = DEFAULT_QUEUE_DIR) {
  return listRecords(dir)
    .filter((r) => r.state === "queued")
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

// A lease is live if the record is claimed and its expiry is strictly in the future.
function leaseIsLive(record, now) {
  if (record.state !== "claimed") return false;
  if (!record.lease_expires_at) return false;
  return new Date(record.lease_expires_at).getTime() > now.getTime();
}

/**
 * Atomically lease the oldest queued action this worker environment can serve.
 * A record is servable when its target equals the worker env or appears in the
 * worker env's served set. Sets state to claimed, records the owner, and stamps
 * lease_expires_at leaseMinutes ahead. Returns the claimed record, or null when
 * nothing is servable.
 *
 * The claim is made durable by the atomic write. Two workers racing for the same
 * single queued record cannot both win: the first flips it to claimed, and the
 * second re-reads and finds it no longer queued.
 *
 * @param {string|string[]} workerEnv - The environment id (or ids) this worker serves.
 * @param {string} [dir]
 * @param {Date} [now]
 * @param {number} [leaseMinutes]
 * @returns {object|null}
 */
export function claim(workerEnv, dir = DEFAULT_QUEUE_DIR, now = new Date(), leaseMinutes = DEFAULT_LEASE_MINUTES) {
  const served = new Set(Array.isArray(workerEnv) ? workerEnv : [workerEnv]);
  const candidates = listQueued(dir).filter((r) => served.has(r.target));
  for (const candidate of candidates) {
    // Re-read under the current state to reject a record another worker just took.
    const current = readRecord(dir, `${candidate.id}.json`);
    if (current.state !== "queued") continue;
    const leased = {
      ...current,
      state: "claimed",
      owner: Array.isArray(workerEnv) ? workerEnv[0] : workerEnv,
      lease_expires_at: new Date(now.getTime() + leaseMinutes * 60_000).toISOString(),
    };
    assertValid(leased);
    writeAtomic(dir, leased.id, leased);
    return leased;
  }
  return null;
}

/**
 * Mark a claimed action done or failed, attaching an optional result object.
 *
 * @param {string} id
 * @param {object|null} result
 * @param {string} [dir]
 * @param {boolean} [ok] - true marks done, false marks failed. Default true.
 * @returns {object}
 */
export function complete(id, result, dir = DEFAULT_QUEUE_DIR, ok = true) {
  const current = readRecord(dir, `${id}.json`);
  const record = {
    ...current,
    state: ok ? "done" : "failed",
    result: result ?? current.result ?? {},
  };
  assertValid(record);
  writeAtomic(dir, id, record);
  return record;
}

/**
 * Revert every claimed record whose lease has expired back to queued, clearing
 * its owner and expiry. Returns the list of reclaimed records.
 *
 * @param {string} [dir]
 * @param {Date} [now]
 * @returns {object[]}
 */
export function reclaimStale(dir = DEFAULT_QUEUE_DIR, now = new Date()) {
  const reclaimed = [];
  for (const record of listRecords(dir)) {
    if (record.state !== "claimed") continue;
    if (leaseIsLive(record, now)) continue;
    const requeued = { ...record, state: "queued" };
    delete requeued.owner;
    delete requeued.lease_expires_at;
    assertValid(requeued);
    writeAtomic(dir, requeued.id, requeued);
    reclaimed.push(requeued);
  }
  return reclaimed;
}
