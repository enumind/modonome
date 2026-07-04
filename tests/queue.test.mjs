// Tests for `modonome queue`: converts scored dry-run proposals into schema-valid
// queued work items, closing the funnel gap between dry-run (read-only proposals)
// and an armed engine picking up work. No selection given must only preview.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-queue-"));
}

function run(...args) {
  return spawnSync("node", [join(root, "scripts/queue.mjs"), ...args], { encoding: "utf8", timeout: 30000 });
}

function scaffold(dir) {
  const r = spawnSync("node", [join(root, "scripts/scaffold.mjs"), dir, "--write", "--no-snapshot"], {
    encoding: "utf8",
    timeout: 30000,
  });
  assert.strictEqual(r.status, 0, `scaffold exited ${r.status}: ${r.stderr}`);
}

function itemsDir(dir) {
  return join(dir, ".modonome", "work-items");
}

test("queue with no selection previews and writes nothing", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const r = run(dir);
    assert.strictEqual(r.status, 0, `queue exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /Scored proposals/);
    assert.match(r.stdout, /1\./, "must number at least one proposal");
    assert.ok(!existsSync(itemsDir(dir)), "preview mode must not create work-items/");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("queue refuses on an unscaffolded repo", () => {
  const dir = tmp();
  try {
    const r = run(dir, "--all");
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /Run `npx modonome scaffold/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("queue --all creates work-items/ (scaffold ships no template for it) and writes every scored proposal", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    assert.ok(!existsSync(itemsDir(dir)), "scaffold must not pre-create work-items/");
    const r = run(dir, "--all");
    assert.strictEqual(r.status, 0, `queue exited ${r.status}: ${r.stderr}`);
    const files = readdirSync(itemsDir(dir)).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 3, "must queue at least the three baseline proposals");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every queued item is schema- and governance-valid and starts in state queued", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    run(dir, "--all");
    const files = readdirSync(itemsDir(dir)).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const item = JSON.parse(readFileSync(join(itemsDir(dir), f), "utf8"));
      assert.strictEqual(item.state, "queued");
      assert.strictEqual(item.schema_version, 1);
      assert.ok(item.id, "must have an id");
      assert.strictEqual(item.touches_protected_path, false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("queue 1,2 selects only those two proposals, one-indexed", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const preview = run(dir);
    const total = (preview.stdout.match(/^\s+\d+\. /gm) || []).length;
    assert.ok(total >= 2, "fixture must offer at least two proposals to select from");

    const r = run(dir, "1,2");
    assert.strictEqual(r.status, 0, `queue exited ${r.status}: ${r.stderr}`);
    const files = readdirSync(itemsDir(dir)).filter((f) => f.endsWith(".json"));
    assert.strictEqual(files.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--max limits how many of the selection are queued", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const r = run(dir, "--all", "--max", "1");
    assert.strictEqual(r.status, 0, `queue exited ${r.status}: ${r.stderr}`);
    const files = readdirSync(itemsDir(dir)).filter((f) => f.endsWith(".json"));
    assert.strictEqual(files.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an out-of-range selection is refused with no files written", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const r = run(dir, "99");
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /Invalid selection/);
    assert.ok(!existsSync(itemsDir(dir)), "an invalid selection must not create work-items/");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("re-running queue --all is safe and de-duplicates ids instead of colliding", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    run(dir, "--all");
    const first = readdirSync(itemsDir(dir)).filter((f) => f.endsWith(".json")).length;
    const r = run(dir, "--all");
    assert.strictEqual(r.status, 0, `second queue run exited ${r.status}: ${r.stderr}`);
    const second = readdirSync(itemsDir(dir)).filter((f) => f.endsWith(".json")).length;
    assert.strictEqual(second, first * 2, "a second run must add distinctly-suffixed items, not overwrite");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
