// Tests for `modonome gauntlet` (see docs/adr/ADR-038-gauntlet-replay.md): a read-only
// self-test that replays gate-weakening mutations against a target repo's own real
// files, then grades them against whatever gate-integrity check that repo actually has
// configured. The non-negotiable safety invariant is that it never mutates anything
// outside a scratch temp directory it creates and removes itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-gauntlet-fixture-"));
}

function run(...args) {
  return spawnSync("node", [join(root, "scripts/gauntlet.mjs"), ...args], { encoding: "utf8", timeout: 60000 });
}

function seedJsTest(dir) {
  mkdirSync(join(dir, "tests"), { recursive: true });
  // A real (non-tautological) assertion: 1 + 1 and 2 are different literals, so this
  // is not itself an instance of the vacuous-assertion category the Gauntlet tests for.
  writeFileSync(
    join(dir, "tests", "sample.test.js"),
    'it("works", () => {\n  expect(1 + 1).toBe(2);\n});\n',
  );
}

function snapshotFiles(dir) {
  const out = [];
  (function walk(d, rel) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(full, r);
      else out.push(r);
    }
  })(dir, "");
  return out.sort();
}

test("no gate-integrity check configured: applicable categories fail, unmatched languages report N/A", () => {
  const dir = tmp();
  try {
    seedJsTest(dir);
    const r = run(dir, "--json");
    assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.gate.configured, false);
    const ga01 = out.results.find((x) => x.id === "GA-01");
    assert.strictEqual(ga01.status, "fail", "no gate configured, so an applicable attack must be reported as would-have-merged");
    const ga03 = out.results.find((x) => x.id === "GA-03");
    assert.strictEqual(ga03.status, "na", "no Java file exists in this fixture");
    assert.strictEqual(out.level, "UNHARDENED");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("host's own guard-ratchet.mjs present: a real assertion-removal attack is caught", () => {
  const dir = tmp();
  try {
    seedJsTest(dir);
    mkdirSync(join(dir, "scripts", "lib"), { recursive: true });
    copyFileSync(join(root, "scripts", "guard-ratchet.mjs"), join(dir, "scripts", "guard-ratchet.mjs"));
    copyFileSync(join(root, "scripts", "lib", "file-classifiers.mjs"), join(dir, "scripts", "lib", "file-classifiers.mjs"));

    const r = run(dir, "--json");
    assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.gate.configured, true);
    assert.strictEqual(out.gate.source, "host-ratchet");
    const ga01 = out.results.find((x) => x.id === "GA-01");
    assert.strictEqual(ga01.status, "pass", "the host's own guard-ratchet.mjs should reject a real assertion removal");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("never writes anything outside .modonome/runs, and only when already scaffolded", () => {
  const dir = tmp();
  try {
    seedJsTest(dir);
    const before = snapshotFiles(dir);
    run(dir);
    const after = snapshotFiles(dir);
    assert.deepStrictEqual(after, before, "an unscaffolded target must gain no files at all");

    mkdirSync(join(dir, ".modonome"), { recursive: true });
    const beforeScaffolded = snapshotFiles(dir);
    run(dir);
    const afterScaffolded = snapshotFiles(dir);
    const added = afterScaffolded.filter((f) => !beforeScaffolded.includes(f));
    assert.strictEqual(added.length, 1, "exactly one new file: the run-log entry");
    assert.match(added[0], /^\.modonome\/runs\/.*-gauntlet\.json$/);
    const logged = JSON.parse(readFileSync(join(dir, added[0]), "utf8"));
    assert.strictEqual(logged.command, "gauntlet");
    assert.ok(typeof logged.gauntlet_score === "string");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--json output is well-formed and the human scorecard prints a summary line", () => {
  const dir = tmp();
  try {
    seedJsTest(dir);
    const jsonRun = run(dir, "--json");
    assert.strictEqual(jsonRun.status, 0);
    const out = JSON.parse(jsonRun.stdout);
    assert.strictEqual(out.tool, "modonome-gauntlet");
    assert.strictEqual(out.counts.total, out.results.length);
    assert.strictEqual(out.counts.pass + out.counts.fail + out.counts.na, out.counts.total);

    const humanRun = run(dir);
    assert.strictEqual(humanRun.status, 0);
    assert.match(humanRun.stdout, /Your gates:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a non-existent target directory exits 2 with a clear error", () => {
  const r = run(join(tmpdir(), "modonome-gauntlet-does-not-exist-xyz"));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /not found/);
});

test("bin dispatch: `modonome gauntlet` routes to gauntlet.mjs", () => {
  const dir = tmp();
  try {
    seedJsTest(dir);
    const r = spawnSync("node", [join(root, "bin/modonome.mjs"), "gauntlet", dir, "--json"], {
      encoding: "utf8",
      timeout: 60000,
    });
    assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.tool, "modonome-gauntlet");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
