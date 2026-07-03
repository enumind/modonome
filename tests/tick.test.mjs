// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-tick-"));
}

function runTick(stateDir) {
  return spawnSync("node", [join(root, "scripts/tick.mjs"), stateDir], {
    encoding: "utf8",
    timeout: 10000,
  });
}

function makeItem(overrides = {}) {
  return {
    schema_version: 1,
    id: "WI-test",
    state: "making",
    attempts: 0,
    max_attempts: 3,
    ...overrides,
  };
}

function writeItem(itemsDir, name, item) {
  writeFileSync(join(itemsDir, name), JSON.stringify(item, null, 2));
}

function readItem(itemsDir, name) {
  return JSON.parse(readFileSync(join(itemsDir, name), "utf8"));
}

test("tick requeues an expired in-flight item when attempts remain", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const past = new Date(Date.now() - 3600_000).toISOString();
  writeItem(itemsDir, "item.json", makeItem({
    state: "making",
    attempts: 1,
    max_attempts: 3,
    lease_expires_at: past,
    maker_id: "session-abc",
    branch: "fix/item",
  }));

  try {
    const r = runTick(stateDir);
    assert.strictEqual(r.status, 0, `tick exited ${r.status}: ${r.stderr}`);

    const updated = readItem(itemsDir, "item.json");
    assert.strictEqual(updated.state, "queued", "expired item must be requeued");
    assert.strictEqual(updated.attempts, 2, "attempts must be incremented");
    assert.ok(!updated.lease_expires_at, "lease_expires_at must be cleared");
    assert.ok(!updated.maker_id, "maker_id must be cleared");
    assert.ok(!updated.branch, "branch must be cleared");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick escalates an expired item that has reached max_attempts", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const past = new Date(Date.now() - 3600_000).toISOString();
  writeItem(itemsDir, "item.json", makeItem({
    state: "checking",
    attempts: 2,
    max_attempts: 3,
    lease_expires_at: past,
  }));

  try {
    const r = runTick(stateDir);
    assert.strictEqual(r.status, 0);

    const updated = readItem(itemsDir, "item.json");
    assert.strictEqual(updated.state, "escalated", "item at max_attempts must be escalated");
    assert.ok(updated.escalation_reason, "escalated item must have escalation_reason");
    assert.match(updated.escalation_reason, /lease expired/, "escalation_reason must mention lease");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick leaves items with a valid future lease untouched", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const future = new Date(Date.now() + 3600_000).toISOString();
  writeItem(itemsDir, "item.json", makeItem({
    state: "making",
    attempts: 0,
    lease_expires_at: future,
  }));

  try {
    runTick(stateDir);
    const updated = readItem(itemsDir, "item.json");
    assert.strictEqual(updated.state, "making", "active lease must not be touched");
    assert.strictEqual(updated.attempts, 0, "attempts must not change");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick leaves queued and done items untouched", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const past = new Date(Date.now() - 3600_000).toISOString();
  writeItem(itemsDir, "queued.json", makeItem({ state: "queued", lease_expires_at: past }));
  writeItem(itemsDir, "done.json", makeItem({ state: "done", lease_expires_at: past }));

  try {
    runTick(stateDir);
    assert.strictEqual(readItem(itemsDir, "queued.json").state, "queued");
    assert.strictEqual(readItem(itemsDir, "done.json").state, "done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick exits cleanly when no work-items directory exists", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  mkdirSync(stateDir, { recursive: true });
  try {
    const r = runTick(stateDir);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /nothing to do/, "must report nothing to do");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick falls back to the default .modonome state dir when none is given on the command line", () => {
  const dir = tmp();
  try {
    // No .modonome directory exists under dir, and no stateDir argument is
    // passed, so tick must fall back to its default (".modonome") relative
    // to cwd and report the same "nothing to do" path as an explicit miss.
    const r = spawnSync("node", [join(root, "scripts/tick.mjs")], {
      encoding: "utf8",
      timeout: 10000,
      cwd: dir,
    });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /no work-items directory found/, "must use the default state dir");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick skips a work item file that is not valid JSON", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const past = new Date(Date.now() - 3600_000).toISOString();
  writeFileSync(join(itemsDir, "broken.json"), "{ this is not valid json");
  writeItem(itemsDir, "good.json", makeItem({
    state: "making",
    attempts: 0,
    max_attempts: 3,
    lease_expires_at: past,
  }));

  try {
    const r = runTick(stateDir);
    assert.strictEqual(r.status, 0, `tick must not crash on a malformed item: ${r.stderr}`);

    // The malformed file must be left exactly as it was.
    assert.strictEqual(readFileSync(join(itemsDir, "broken.json"), "utf8"), "{ this is not valid json");

    // The valid item alongside it must still be processed normally.
    const updated = readItem(itemsDir, "good.json");
    assert.strictEqual(updated.state, "queued");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick leaves an in-flight item untouched when it has no lease_expires_at", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const item = makeItem({ state: "claimed", attempts: 0, max_attempts: 3 });
  delete item.lease_expires_at;
  writeItem(itemsDir, "item.json", item);

  try {
    const r = runTick(stateDir);
    assert.strictEqual(r.status, 0);
    const updated = readItem(itemsDir, "item.json");
    assert.strictEqual(updated.state, "claimed", "an in-flight item without a lease must not be touched");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick applies default attempts and max_attempts when an expired item omits them", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  const itemsDir = join(stateDir, "work-items");
  mkdirSync(itemsDir, { recursive: true });

  const past = new Date(Date.now() - 3600_000).toISOString();
  writeItem(itemsDir, "item.json", {
    schema_version: 1,
    id: "WI-no-attempts",
    state: "claimed",
    lease_expires_at: past,
  });

  try {
    const r = runTick(stateDir);
    assert.strictEqual(r.status, 0, `tick failed: ${r.stderr}`);
    const updated = readItem(itemsDir, "item.json");
    // attempts defaults to 0 (then incremented to 1) and max_attempts
    // defaults to 3, so 1 < 3 requeues rather than escalates.
    assert.strictEqual(updated.state, "queued");
    assert.strictEqual(updated.attempts, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
