// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
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

test("scaffold keeps existing files on a second run", () => {
  const dir = tmp();
  try {
    const first = run("scripts/scaffold.mjs", dir, "--write");
    assert.strictEqual(first.status, 0, `scaffold exited ${first.status}: ${first.stderr}`);

    const second = run("scripts/scaffold.mjs", dir, "--write");
    assert.strictEqual(second.status, 0, `scaffold exited ${second.status}: ${second.stderr}`);
    assert.match(second.stdout, /kept: \.modonome[/\\]config\.yaml/, "second run should keep the existing config");
    assert.match(second.stdout, /kept: \.github[/\\]workflows/, "second run should keep the existing workflow");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scaffold preview mode reports what it would create without writing files", () => {
  const dir = tmp();
  try {
    const preview = run("scripts/scaffold.mjs", dir);
    assert.strictEqual(preview.status, 0, `scaffold exited ${preview.status}: ${preview.stderr}`);
    assert.match(preview.stdout, /Scaffold preview/);
    assert.match(preview.stdout, /would create: \.modonome[/\\]config\.yaml/);
    assert.equal(existsSync(join(dir, ".modonome", "config.yaml")), false, "preview mode must not create config.yaml");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scaffold recurses into nested template subdirectories", () => {
  const dir = tmp();
  const here2 = dirname(fileURLToPath(import.meta.url));
  const nestedTemplateDir = join(here2, "..", "templates", ".modonome", "nested-test-only");
  try {
    mkdirSync(nestedTemplateDir, { recursive: true });
    writeFileSync(join(nestedTemplateDir, "note.md"), "test fixture, not part of the real template\n");

    const result = run("scripts/scaffold.mjs", dir, "--write");
    assert.strictEqual(result.status, 0, `scaffold exited ${result.status}: ${result.stderr}`);

    const nested = readFileSync(join(dir, ".modonome", "nested-test-only", "note.md"), "utf8");
    assert.match(nested, /test fixture/);
  } finally {
    rmSync(nestedTemplateDir, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scaffold run logs are pruned to 30 when more than 30 accumulate", () => {
  const dir = tmp();
  const runsDir = join(dir, ".modonome", "runs");
  mkdirSync(runsDir, { recursive: true });
  try {
    for (let i = 0; i < 35; i++) {
      run("scripts/scaffold.mjs", dir, "--write");
    }
    const files = readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length <= 30, `expected at most 30 run logs, got ${files.length}`);
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
