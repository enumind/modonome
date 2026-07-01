import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { canonicalize } from "../scripts/lib/canonical-json.mjs";
import { buildSnapshot } from "../scripts/lib/snapshot-core.mjs";
import { changedPaths } from "../scripts/lib/snapshot-cache.mjs";

const T = "2020-01-01T00:00:00.000Z";

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "snap-inc-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "a.js"), "export function a() { return 1; }\nimport './b.js';\n");
  writeFileSync(join(dir, "src", "b.js"), "export const b = 1;\n");
  return dir;
}

test("incremental build is byte-identical to a full rebuild", () => {
  const dir = repo();
  try {
    const full1 = buildSnapshot(dir, { now: T });
    assert.equal(full1.stats.reused, 0, "first build reuses nothing");

    // Change one file and add another.
    writeFileSync(join(dir, "src", "a.js"), "export function a() { return 42; }\nimport './b.js';\n");
    writeFileSync(join(dir, "src", "c.js"), "export const c = 3;\n");

    const cache = { entries: full1.cacheEntries };
    const changed = new Set(["src/a.js"]); // c.js is new, so it is read regardless
    const incremental = buildSnapshot(dir, { now: T, cache, changed });
    const fresh = buildSnapshot(dir, { now: T }); // full rebuild of the new tree

    assert.equal(canonicalize(incremental.map), canonicalize(fresh.map), "map matches full rebuild");
    assert.equal(canonicalize(incremental.signature), canonicalize(fresh.signature), "signature matches full rebuild");
    assert.equal(incremental.markdown, fresh.markdown, "markdown matches full rebuild");
    assert.ok(incremental.stats.reused > 0, "unchanged file b.js served from cache");
    assert.equal(incremental.signature.merkle_root, fresh.signature.merkle_root);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a null changed set forces a full rebuild even with a cache", () => {
  const dir = repo();
  try {
    const full1 = buildSnapshot(dir, { now: T });
    const again = buildSnapshot(dir, { now: T, cache: { entries: full1.cacheEntries }, changed: null });
    assert.equal(again.stats.reused, 0, "no reuse when changed is null");
    assert.equal(canonicalize(again.map), canonicalize(full1.map));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("changedPaths reports a modified file via git", () => {
  const dir = repo();
  try {
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["config", "user.email", "t@e.com"], { cwd: dir });
    spawnSync("git", ["config", "user.name", "t"], { cwd: dir });
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: dir });
    writeFileSync(join(dir, "src", "a.js"), "export function a() { return 7; }\n");
    const changed = changedPaths(dir, null);
    assert.ok(changed instanceof Set);
    assert.ok(changed.has("src/a.js"), "modified file is reported changed");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
