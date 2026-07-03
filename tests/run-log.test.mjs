// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-runlog-"));
}

function run(script, ...args) {
  return spawnSync("node", [join(root, script), ...args], { encoding: "utf8", timeout: 30000 });
}

test("dry-run writes a run log to .modonome/runs/", () => {
  const dir = tmp();
  try {
    const r = run("scripts/dry-run-sweep.mjs", dir);
    assert.strictEqual(r.status, 0, `dry-run exited ${r.status}: ${r.stderr}`);

    const runsDir = join(dir, ".modonome", "runs");
    const files = readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 1, "must write at least one run log");

    const log = JSON.parse(readFileSync(join(runsDir, files[0]), "utf8"));
    assert.strictEqual(log.command, "dry-run", "command must be dry-run");
    assert.ok(log.ts, "must have ts");
    assert.ok(typeof log.duration_ms === "number", "must have duration_ms");
    assert.ok(Array.isArray(log.protected_paths), "must have protected_paths array");
    assert.ok(Array.isArray(log.proposals), "must have proposals array");
    assert.ok(log.detected_stack && log.detected_stack.name, "must have detected_stack.name");
    assert.strictEqual(log.exit_code, 0, "exit_code must be 0");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scaffold writes a run log to .modonome/runs/", () => {
  const dir = tmp();
  try {
    const r = run("scripts/scaffold.mjs", dir);
    assert.strictEqual(r.status, 0, `scaffold exited ${r.status}: ${r.stderr}`);

    const runsDir = join(dir, ".modonome", "runs");
    const files = readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 1, "must write at least one run log");

    const log = JSON.parse(readFileSync(join(runsDir, files[0]), "utf8"));
    assert.strictEqual(log.command, "scaffold", "command must be scaffold");
    assert.ok(log.ts, "must have ts");
    assert.ok(typeof log.duration_ms === "number", "must have duration_ms");
    assert.ok(Array.isArray(log.planned), "must have planned array");
    assert.strictEqual(log.exit_code, 0, "exit_code must be 0");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report writes a run log to .modonome/runs/", () => {
  const dir = tmp();
  try {
    const r = run("scripts/report.mjs", dir);
    assert.strictEqual(r.status, 0, `report exited ${r.status}: ${r.stderr}`);

    const runsDir = join(dir, ".modonome", "runs");
    const files = readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 1, "must write at least one run log");

    const log = JSON.parse(readFileSync(join(runsDir, files[0]), "utf8"));
    assert.strictEqual(log.command, "report", "command must be report");
    assert.ok(log.ts, "must have ts");
    assert.ok(typeof log.duration_ms === "number", "must have duration_ms");
    assert.ok(log.summary, "must have summary object");
    assert.strictEqual(log.exit_code, 0, "exit_code must be 0");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run logs are pruned to 30 when more than 30 accumulate", () => {
  const dir = tmp();
  const runsDir = join(dir, ".modonome", "runs");
  mkdirSync(runsDir, { recursive: true });
  try {
    // Write 35 run logs by invoking dry-run-sweep 35 times.
    // Each invocation appends one log. After the 31st, pruning kicks in.
    for (let i = 0; i < 35; i++) {
      run("scripts/dry-run-sweep.mjs", dir);
    }
    const files = readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length <= 30, `expected at most 30 run logs, got ${files.length}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
