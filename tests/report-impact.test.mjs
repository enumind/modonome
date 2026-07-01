import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  computeImpactSnapshot,
  computeDeadCodeSuspects,
  computeImpactDelta,
  findPriorImpactSnapshot,
} from "../scripts/report.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-impact-"));
}

function fixture() {
  const dir = tmp();
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  mkdirSync(join(dir, "docs"), { recursive: true });

  // Documented module: leading // comment, one exported symbol used elsewhere.
  writeFileSync(
    join(dir, "scripts", "used.mjs"),
    "// used.mjs does a thing\nexport function usedHelper() { return 1; }\n",
  );
  // Documented module via JSDoc block, one exported symbol never referenced.
  writeFileSync(
    join(dir, "scripts", "orphan.mjs"),
    "/**\n * orphan module\n */\nexport function orphanHelper() { return 2; }\n",
  );
  // Undocumented module (no leading comment, no JSDoc).
  writeFileSync(
    join(dir, "scripts", "plain.mjs"),
    "export const plainValue = 3;\nfunction internal() { return plainValue; }\ninternal();\n",
  );
  // A .js file under scripts/ should also be counted as a source file.
  writeFileSync(join(dir, "scripts", "legacy.js"), "// legacy\nmodule.exports = {};\n");
  // Nested source file to prove recursive scanning.
  mkdirSync(join(dir, "scripts", "lib"), { recursive: true });
  writeFileSync(join(dir, "scripts", "lib", "nested.mjs"), "// nested helper\nexport const nestedValue = 4;\n");

  // A test file references usedHelper so it is not a dead-code suspect.
  writeFileSync(
    join(dir, "tests", "used.test.mjs"),
    "import { usedHelper } from '../scripts/used.mjs';\nusedHelper();\n",
  );
  writeFileSync(join(dir, "tests", "not-a-test.mjs"), "// should not be counted as a test file\n");

  writeFileSync(join(dir, "docs", "a.md"), "# A\n");
  mkdirSync(join(dir, "docs", "guides"), { recursive: true });
  writeFileSync(join(dir, "docs", "guides", "b.md"), "# B\n");
  writeFileSync(join(dir, "docs", "not-markdown.txt"), "ignore me\n");

  return dir;
}

test("computeImpactSnapshot counts source, test, and doc files recursively", () => {
  const dir = fixture();
  try {
    const snap = computeImpactSnapshot(dir);
    // used.mjs, orphan.mjs, plain.mjs, legacy.js, lib/nested.mjs
    assert.strictEqual(snap.source_files, 5, "source_files should count .mjs/.js under scripts/ recursively");
    // only used.test.mjs matches *.test.mjs
    assert.strictEqual(snap.test_files, 1, "test_files should count only *.test.mjs under tests/");
    // a.md and guides/b.md, not the .txt file
    assert.strictEqual(snap.doc_files, 2, "doc_files should count .md under docs/ recursively");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeImpactSnapshot doc_coverage heuristic: leading // or JSDoc block counts as documented", () => {
  const dir = fixture();
  try {
    const snap = computeImpactSnapshot(dir);
    // Documented: used.mjs (//), orphan.mjs (/** */), legacy.js (//), lib/nested.mjs (//) = 4
    // Undocumented: plain.mjs = 1
    // 4 / 5 = 0.8
    assert.strictEqual(snap.doc_coverage, 0.8, "doc_coverage should be documented/total rounded to 2 decimals");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeImpactSnapshot dead_code_suspects flags exports never referenced elsewhere", () => {
  const dir = fixture();
  try {
    const snap = computeImpactSnapshot(dir);
    // usedHelper is referenced in tests/used.test.mjs -> not a suspect.
    // orphanHelper is never referenced anywhere else -> suspect.
    // plainValue is referenced within its own file (internal()) but that is
    // still just the declaration file itself with only one occurrence of the
    // name overall (the export line), so it also counts as a suspect. Ensure
    // the count is at least 1 (orphanHelper) and bounded/sane.
    assert.ok(snap.dead_code_suspects >= 1, "must flag at least the truly unreferenced export");
    assert.ok(snap.dead_code_suspects <= 3, "must not runaway beyond the number of exported symbols in fixture");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeImpactSnapshot handles missing scripts/tests/docs directories gracefully", () => {
  const dir = tmp();
  try {
    const snap = computeImpactSnapshot(dir);
    assert.strictEqual(snap.source_files, 0);
    assert.strictEqual(snap.test_files, 0);
    assert.strictEqual(snap.doc_files, 0);
    assert.strictEqual(snap.doc_coverage, 0, "doc_coverage must be 0 (not NaN) with zero source files");
    assert.strictEqual(snap.dead_code_suspects, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeDeadCodeSuspects returns 0 when there are no exported symbols", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, "scripts"), { recursive: true });
    const filePath = join(dir, "scripts", "no-exports.mjs");
    writeFileSync(filePath, "// nothing exported here\nconst x = 1;\n");
    assert.strictEqual(computeDeadCodeSuspects([filePath], dir), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeImpactDelta returns numeric deltas against a given prior snapshot", () => {
  const current = { source_files: 10, test_files: 5, doc_files: 3, doc_coverage: 0.82, dead_code_suspects: 2 };
  const prior = { source_files: 8, test_files: 5, doc_files: 2, doc_coverage: 0.79, dead_code_suspects: 4 };
  const delta = computeImpactDelta(current, prior);
  assert.strictEqual(delta.baseline, true);
  assert.strictEqual(delta.source_files, 2);
  assert.strictEqual(delta.test_files, 0);
  assert.strictEqual(delta.doc_files, 1);
  assert.strictEqual(delta.doc_coverage, 0.03);
  assert.strictEqual(delta.dead_code_suspects, -2);
});

test("computeImpactDelta reports no-baseline marker when prior is null", () => {
  const current = { source_files: 10, test_files: 5, doc_files: 3, doc_coverage: 0.82, dead_code_suspects: 2 };
  const delta = computeImpactDelta(current, null);
  assert.strictEqual(delta.baseline, false);
  assert.strictEqual(delta.note, "first run, no baseline");
  assert.strictEqual(delta.source_files, undefined);
});

test("findPriorImpactSnapshot returns null when runs directory does not exist", () => {
  const dir = tmp();
  try {
    const runsDir = join(dir, ".modonome", "runs");
    assert.strictEqual(findPriorImpactSnapshot(runsDir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findPriorImpactSnapshot returns the newest log's impact field, skipping logs without one", () => {
  const dir = tmp();
  try {
    const runsDir = join(dir, ".modonome", "runs");
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(
      join(runsDir, "2020-01-01T00-00-00-000Z-report.json"),
      JSON.stringify({ ts: "2020-01-01T00:00:00.000Z", command: "report", impact: { source_files: 1 } }),
    );
    writeFileSync(
      join(runsDir, "2020-01-02T00-00-00-000Z-report.json"),
      JSON.stringify({ ts: "2020-01-02T00:00:00.000Z", command: "report" }), // no impact field
    );
    writeFileSync(
      join(runsDir, "2020-01-03T00-00-00-000Z-report.json"),
      JSON.stringify({ ts: "2020-01-03T00:00:00.000Z", command: "report", impact: { source_files: 3 } }),
    );
    const prior = findPriorImpactSnapshot(runsDir);
    assert.ok(prior, "must find a prior snapshot");
    assert.strictEqual(prior.source_files, 3, "must pick the newest log that has an impact field");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findPriorImpactSnapshot skips unreadable/corrupt log files", () => {
  const dir = tmp();
  try {
    const runsDir = join(dir, ".modonome", "runs");
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(join(runsDir, "2020-01-01T00-00-00-000Z-report.json"), "{not valid json");
    assert.strictEqual(findPriorImpactSnapshot(runsDir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
