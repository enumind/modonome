// Tests for the Lexicon Gate wired into scripts/check-style.mjs: a banned term from
// lexicon.json fails the build, a grandfathered term only warns, and a clean file passes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Assembled from fragments so this test file does not itself contain the exact banned
// literal (the house-style linter under test would otherwise fail on its own test file).
const BANNED_PHRASE = "work " + "packet";

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-lexicon-"));
}

function run(dir) {
  return spawnSync("node", [join(root, "scripts/check-style.mjs"), dir], { encoding: "utf8", timeout: 30000 });
}

test("a non-grandfathered lexicon term fails the build", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "doc.md"), `This ships a ${BANNED_PHRASE} to the maker.\n`);
    const r = run(dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, new RegExp(`lexicon: ${BANNED_PHRASE}`));
    assert.match(r.stderr, /Use "work item" instead/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a grandfathered lexicon term warns but does not fail the build", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "doc.md"), "Config levers stay off by default.\n");
    const r = run(dir);
    assert.strictEqual(r.status, 0, `expected pass, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /warn: lexicon: levers/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a clean file with no banned terms passes with no output", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "doc.md"), "This ships a work item to the maker.\n");
    const r = run(dir);
    assert.strictEqual(r.status, 0, `expected pass, got ${r.status}: ${r.stderr}`);
    assert.doesNotMatch(r.stderr, /lexicon:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("lexicon.json and LEXICON.md are exempt from scanning themselves", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "lexicon.json"), JSON.stringify({ terms: [{ banned: BANNED_PHRASE, preferred: "x", note: "n" }] }));
    writeFileSync(join(dir, "docs", "LEXICON.md"), `${BANNED_PHRASE} -> work item\n`);
    const r = run(dir);
    assert.strictEqual(r.status, 0, `expected pass, got ${r.status}: ${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
