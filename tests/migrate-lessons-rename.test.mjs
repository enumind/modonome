// Tests for `modonome migrate --rename-lessons`: the file-rename half of the LEARNINGS ->
// LESSONS lexicon rename, for a host repo that scaffolded before the rename shipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-rename-lessons-"));
}

function run(...args) {
  return spawnSync("node", [join(root, "scripts/migrate-lessons-rename.mjs"), ...args], {
    encoding: "utf8",
    timeout: 30000,
  });
}

function seedLearnings(dir) {
  mkdirSync(join(dir, ".modonome"), { recursive: true });
  writeFileSync(join(dir, ".modonome", "LEARNINGS.md"), "## Promoted\n\n## Staged\n");
}

test("previews by default and renames nothing", () => {
  const dir = tmp();
  try {
    seedLearnings(dir);
    const r = run(dir);
    assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /Would rename/);
    assert.ok(existsSync(join(dir, ".modonome", "LEARNINGS.md")), "preview must not rename");
    assert.ok(!existsSync(join(dir, ".modonome", "LESSONS.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--write renames LEARNINGS.md to LESSONS.md, preserving content", () => {
  const dir = tmp();
  try {
    seedLearnings(dir);
    const r = run(dir, "--write");
    assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /Renamed/);
    assert.ok(!existsSync(join(dir, ".modonome", "LEARNINGS.md")));
    assert.ok(existsSync(join(dir, ".modonome", "LESSONS.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no-op when LEARNINGS.md does not exist", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, ".modonome"), { recursive: true });
    const r = run(dir, "--write");
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /not found. Nothing to migrate/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no-op when LESSONS.md already exists (already migrated)", () => {
  const dir = tmp();
  try {
    seedLearnings(dir);
    writeFileSync(join(dir, ".modonome", "LESSONS.md"), "## Promoted\n\n## Staged\n");
    const r = run(dir, "--write");
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /already exists. Nothing to migrate/);
    assert.ok(existsSync(join(dir, ".modonome", "LEARNINGS.md")), "must not touch the stale LEARNINGS.md either");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("modonome migrate --rename-lessons --write dispatches to the rename script", () => {
  const dir = tmp();
  try {
    seedLearnings(dir);
    const r = spawnSync("node", [join(root, "bin/modonome.mjs"), "migrate", dir, "--rename-lessons", "--write"], {
      encoding: "utf8",
      timeout: 30000,
    });
    assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /Renamed/);
    assert.ok(existsSync(join(dir, ".modonome", "LESSONS.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
