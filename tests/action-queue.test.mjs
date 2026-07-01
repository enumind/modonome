import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  enqueue,
  listQueued,
  claim,
  complete,
  reclaimStale,
} from "../scripts/agent/action-queue.mjs";

function tmpQueue() {
  return mkdtempSync(join(tmpdir(), "modonome-queue-"));
}

function sampleAction(id, target = "ci") {
  return {
    id,
    target,
    role: "maker",
    model: "claude-sonnet-4-6",
    transport: "anthropic-cli",
  };
}

test("enqueue then listQueued returns the record", () => {
  const dir = tmpQueue();
  const rec = enqueue(sampleAction("a1"), dir);
  assert.equal(rec.state, "queued");
  assert.equal(rec.schema_version, 1);
  assert.ok(rec.created_at);
  const queued = listQueued(dir);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].id, "a1");
});

test("listQueued returns oldest first by created_at", () => {
  const dir = tmpQueue();
  enqueue({ ...sampleAction("old"), created_at: "2020-01-01T00:00:00.000Z" }, dir);
  enqueue({ ...sampleAction("new"), created_at: "2030-01-01T00:00:00.000Z" }, dir);
  const queued = listQueued(dir);
  assert.deepEqual(queued.map((r) => r.id), ["old", "new"]);
});

test("claim leases exactly once for the same single action", () => {
  const dir = tmpQueue();
  enqueue(sampleAction("solo", "ci"), dir);
  const now = new Date("2026-07-01T00:00:00.000Z");
  const first = claim("ci", dir, now);
  assert.ok(first);
  assert.equal(first.id, "solo");
  assert.equal(first.state, "claimed");
  assert.equal(first.owner, "ci");
  assert.ok(first.lease_expires_at);
  // A second worker in the same environment finds nothing queued.
  const second = claim("ci", dir, now);
  assert.equal(second, null);
});

test("claim only serves targets the worker environment can serve", () => {
  const dir = tmpQueue();
  enqueue(sampleAction("gpu-job", "local-host"), dir);
  const now = new Date("2026-07-01T00:00:00.000Z");
  assert.equal(claim("ci", dir, now), null);
  const got = claim("local-host", dir, now);
  assert.ok(got);
  assert.equal(got.id, "gpu-job");
});

test("claim accepts an array of served environments", () => {
  const dir = tmpQueue();
  enqueue(sampleAction("multi", "local-host"), dir);
  const now = new Date("2026-07-01T00:00:00.000Z");
  const got = claim(["ci", "local-host"], dir, now);
  assert.ok(got);
  assert.equal(got.owner, "ci");
});

test("a stale lease is reclaimed to queued by reclaimStale", () => {
  const dir = tmpQueue();
  enqueue(sampleAction("stale", "ci"), dir);
  const claimedAt = new Date("2026-07-01T00:00:00.000Z");
  claim("ci", dir, claimedAt, 30);
  // Nothing is stale one minute later.
  assert.equal(reclaimStale(dir, new Date("2026-07-01T00:01:00.000Z")).length, 0);
  // An hour later the lease has expired.
  const reclaimed = reclaimStale(dir, new Date("2026-07-01T01:00:00.000Z"));
  assert.equal(reclaimed.length, 1);
  assert.equal(reclaimed[0].id, "stale");
  assert.equal(reclaimed[0].state, "queued");
  assert.equal(reclaimed[0].owner, undefined);
  assert.equal(reclaimed[0].lease_expires_at, undefined);
  // It is claimable again.
  const again = claim("ci", dir, new Date("2026-07-01T01:00:01.000Z"));
  assert.ok(again);
  assert.equal(again.id, "stale");
});

test("complete marks done and failed with a result", () => {
  const dir = tmpQueue();
  enqueue(sampleAction("finish", "ci"), dir);
  claim("ci", dir, new Date("2026-07-01T00:00:00.000Z"));
  const done = complete("finish", { status: 0 }, dir);
  assert.equal(done.state, "done");
  assert.deepEqual(done.result, { status: 0 });
  // A completed record is no longer queued.
  assert.equal(listQueued(dir).length, 0);

  enqueue(sampleAction("boom", "ci"), dir);
  const failed = complete("boom", { error: "x" }, dir, false);
  assert.equal(failed.state, "failed");
});

test("invalid record is rejected on enqueue", () => {
  const dir = tmpQueue();
  // Missing required fields (target, role, model, transport).
  assert.throws(() => enqueue({ id: "bad" }, dir), /invalid record/);
  // No id at all.
  assert.throws(() => enqueue({ target: "ci" }, dir), /requires an action with an id/);
  // Bad type.
  assert.throws(
    () => enqueue({ ...sampleAction("typed"), transport: 123 }, dir),
    /invalid record/,
  );
  assert.equal(listQueued(dir).length, 0);
});

test("listQueued on a missing dir returns empty", () => {
  const empty = join(tmpdir(), "modonome-queue-does-not-exist-xyz");
  assert.deepEqual(listQueued(empty), []);
});
