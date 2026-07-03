// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-metrics-"));
}

function runReport(targetDir) {
  return spawnSync("node", [join(root, "scripts/report.mjs"), targetDir], {
    encoding: "utf8",
    timeout: 30000,
  });
}

// Schema-conformant event line using "event" field (not "type").
function makeEvent(event, extra = {}) {
  return JSON.stringify({ schema_version: "1", ts: "2026-06-20T10:00:00.000Z", event, ...extra });
}

test("report reads 'event' field from schema-conformant metrics.jsonl", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  mkdirSync(stateDir, { recursive: true });

  const lines = [
    makeEvent("item_created", { item: "item-001" }),
    makeEvent("gate_passed", { item: "item-001" }),
    makeEvent("gate_passed", { item: "item-001" }),
    makeEvent("gate_failed", { item: "item-001" }),
    makeEvent("ratchet_rejected", { item: "item-001" }),
    makeEvent("merged", { item: "item-001", lines_changed: 42, estimated_hours_saved: 1.5 }),
  ];
  writeFileSync(join(stateDir, "metrics.jsonl"), lines.join("\n") + "\n");

  const result = runReport(dir);
  try {
    assert.strictEqual(result.status, 0, `report.mjs exited ${result.status}: ${result.stderr}`);
    const out = result.stdout;
    // Each counter must show the right non-zero value.
    assert.match(out, /Items attempted:\s+1/, "items_attempted should be 1");
    assert.match(out, /Gates passed:\s+2/, "gates_passed should be 2");
    assert.match(out, /Gates failed:\s+1/, "gates_failed should be 1");
    assert.match(out, /Ratchet rejections:\s+1/, "ratchet_rejections should be 1");
    assert.match(out, /Merges landed:\s+1/, "merges should be 1");
    assert.match(out, /Lines changed:\s+42/, "lines_changed should be 42");
    assert.match(out, /Est\. hours saved:\s+1\.5/, "estimated_hours_saved should be 1.5");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report shows no-activity message when metrics.jsonl is absent", () => {
  const dir = tmp();
  try {
    const result = runReport(dir);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /No metrics recorded yet/, "should show no-activity message");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report shows work item states and agentproof score for real activity", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  mkdirSync(stateDir, { recursive: true });

  const lines = [
    makeEvent("item_created", { item: "item-001", state: "queued" }),
    makeEvent("gate_passed", { item: "item-001", state: "checking" }),
  ];
  writeFileSync(join(stateDir, "metrics.jsonl"), lines.join("\n") + "\n");

  const result = runReport(dir);
  try {
    assert.strictEqual(result.status, 0, `report.mjs exited ${result.status}: ${result.stderr}`);
    assert.match(result.stdout, /Work Item States/);
    assert.match(result.stdout, /queued:\s+1/);
    assert.match(result.stdout, /checking:\s+1/);
    assert.match(result.stdout, /AgentProof Score/);
    assert.match(result.stdout, /Level: GOVERNED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report prunes run logs beyond the last 30", () => {
  const dir = tmp();
  const runsDir = join(dir, ".modonome", "runs");
  mkdirSync(runsDir, { recursive: true });

  for (let i = 0; i < 30; i++) {
    writeFileSync(join(runsDir, `2026-01-01T00-00-${String(i).padStart(2, "0")}-000Z-report.json`), "{}");
  }

  const result = runReport(dir);
  try {
    assert.strictEqual(result.status, 0, `report.mjs exited ${result.status}: ${result.stderr}`);
    const remaining = readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    assert.equal(remaining.length, 30, "run log directory should be pruned back to 30 entries");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report shows agentproof unavailable when the runner cannot be spawned", () => {
  const dir = tmp();
  try {
    const result = spawnSync(process.execPath, [join(root, "scripts/report.mjs"), dir], {
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, PATH: "" },
    });
    assert.match(result.stdout, /agentproof runner not available/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report ignores 'type' field: only 'event' field drives counts", () => {
  const dir = tmp();
  const stateDir = join(dir, ".modonome");
  mkdirSync(stateDir, { recursive: true });

  // Events with only a "type" field (not "event") must not be counted.
  const lines = [
    JSON.stringify({ schema_version: "1", ts: "2026-06-20T10:00:00.000Z", type: "item_created" }),
    JSON.stringify({ schema_version: "1", ts: "2026-06-20T10:00:00.000Z", type: "merged", lines_changed: 99 }),
  ];
  writeFileSync(join(stateDir, "metrics.jsonl"), lines.join("\n") + "\n");

  const result = runReport(dir);
  try {
    assert.strictEqual(result.status, 0);
    const out = result.stdout;
    // Counts must remain zero. The "type" field must not drive any counter.
    assert.match(out, /Items attempted:\s+0/, "items_attempted must be 0 when only 'type' field present");
    assert.match(out, /Merges landed:\s+0/, "merges must be 0 when only 'type' field present");
    assert.match(out, /Lines changed:\s+0/, "lines_changed must be 0 when only 'type' field present");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
