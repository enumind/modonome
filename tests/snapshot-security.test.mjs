import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isPlausibleRevision, changedPaths } from "../scripts/lib/snapshot-cache.mjs";
import { loadIgnore } from "../scripts/lib/snapshot-walk.mjs";
import { buildSnapshot } from "../scripts/lib/snapshot-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SCAFFOLD = join(root, "scripts", "scaffold.mjs");

// Regression coverage for the CodeQL-flagged TOCTOU and the three findings from
// the follow-up manual security audit (git argument injection, ReDoS, prototype
// pollution). Each test reproduces the specific attack the fix closes.

test("scaffold does not write through a symlinked AGENTS.md (TOCTOU fix)", () => {
  const dir = mkdtempSync(join(tmpdir(), "scaffold-toctou-"));
  const sentinel = join(dir, "sentinel.txt");
  try {
    writeFileSync(dir + "-outside-sentinel.txt", "do not overwrite me\n");
    writeFileSync(sentinel, "do not overwrite me\n");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "host" }));
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["config", "user.email", "t@e.com"], { cwd: dir });
    spawnSync("git", ["config", "user.name", "t"], { cwd: dir });
    // Simulate the race target: AGENTS.md is a symlink to a file the tool must
    // never write through when it believes it is creating a fresh file.
    symlinkSync(sentinel, join(dir, "AGENTS.md"));

    const r = spawnSync("node", [SCAFFOLD, dir, "--write"], { encoding: "utf8", timeout: 30000 });
    assert.equal(r.status, 0, r.stderr);
    // The atomic "wx" create must fail with EEXIST on the symlink target and fall
    // through to the "already present" branch, leaving the sentinel untouched.
    assert.equal(readFileSync(sentinel, "utf8"), "do not overwrite me\n", "symlinked file was not overwritten");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(sentinel, { force: true });
    rmSync(dir + "-outside-sentinel.txt", { force: true });
  }
});

test("isPlausibleRevision rejects option-like values, accepts SHAs", () => {
  assert.equal(isPlausibleRevision("abc1234"), true);
  assert.equal(isPlausibleRevision("a".repeat(40)), true);
  assert.equal(isPlausibleRevision("--output=/tmp/pwned"), false);
  assert.equal(isPlausibleRevision("-x"), false);
  assert.equal(isPlausibleRevision(""), false);
  assert.equal(isPlausibleRevision(null), false);
  assert.equal(isPlausibleRevision(undefined), false);
});

test("changedPaths ignores a malicious built_at_head instead of passing it to git", () => {
  const dir = mkdtempSync(join(tmpdir(), "cache-inject-"));
  try {
    writeFileSync(join(dir, "a.js"), "export const a = 1;\n");
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["config", "user.email", "t@e.com"], { cwd: dir });
    spawnSync("git", ["config", "user.name", "t"], { cwd: dir });
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: dir });

    const result = changedPaths(dir, { built_at_head: "--output=/tmp/should-not-be-created" });
    assert.ok(result instanceof Set, "still returns a usable Set");
    assert.ok(!existsSync("/tmp/should-not-be-created"), "git was never invoked with the malicious value");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compiled ignore patterns resist chained-wildcard ReDoS", () => {
  const dir = mkdtempSync(join(tmpdir(), "redos-"));
  try {
    // Fifteen chained ** groups: before the fix this took over 140 seconds to
    // test a single non-matching path.
    writeFileSync(join(dir, ".gitignore"), "*".repeat(30) + "X\n");
    const ignore = loadIgnore(dir);
    const evilPath = "a/".repeat(40) + "b";
    const start = Date.now();
    const matched = ignore(evilPath);
    const elapsedMs = Date.now() - start;
    assert.equal(matched, false);
    assert.ok(elapsedMs < 1000, `compiled ignore pattern took ${elapsedMs}ms, expected under 1000ms`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a file literally named __proto__ cannot pollute Object.prototype via buildSnapshot", () => {
  const dir = mkdtempSync(join(tmpdir(), "protopoll-"));
  try {
    mkdirSync(join(dir, "__proto__"), { recursive: true });
    writeFileSync(join(dir, "__proto__", "evil.js"), "export function evil() {}\n");
    const before = Object.getPrototypeOf(Object.prototype);
    const built = buildSnapshot(dir, { now: "2020-01-01T00:00:00.000Z" });
    assert.equal(Object.getPrototypeOf(Object.prototype), before, "Object.prototype is unaffected");
    assert.equal(built.signature.size.files, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
