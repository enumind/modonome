import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorkItem, updateWorkItem, deleteWorkItem } from "./server/modonomeWriter.mjs";

// A minimal scratch .modonome dir: a config.yaml (read for governance validation, e.g.
// require_distinct_maker_checker_model) and an empty work-items/ directory.
function scratchModonomeDir() {
  const dir = mkdtempSync(join(tmpdir(), "modonome-workitem-writer-test-"));
  mkdirSync(join(dir, "work-items"));
  writeFileSync(join(dir, "config.yaml"), "schema_version: 1\nautonomy_enabled: false\ndry_run: true\nauto_merge: false\nstate_dir: .modonome\n");
  return dir;
}

function readItem(dir, id) {
  return JSON.parse(readFileSync(join(dir, "work-items", `${id}.json`), "utf8"));
}

test("createWorkItem writes a valid, queued item with the given metadata", () => {
  const dir = scratchModonomeDir();
  const item = createWorkItem(dir, {
    id: "WI-fixture-001-create-article",
    type: "create-article",
    assigned_role: "writer",
    allowed_edit_set: ["docs/blog/my-post.md"],
    gates: ["node scripts/check-md-governance.mjs"],
    max_attempts: 2,
    touches_protected_path: false,
  });
  assert.equal(item.state, "queued");
  assert.equal(item.attempts, 0);
  assert.equal(item.type, "create-article");
  assert.equal(item.assigned_role, "writer");
  assert.equal(item.max_attempts, 2);

  const onDisk = readItem(dir, "WI-fixture-001-create-article");
  assert.deepEqual(onDisk, item);

  rmSync(dir, { recursive: true, force: true });
});

test("createWorkItem rejects a duplicate id and an invalid id", () => {
  const dir = scratchModonomeDir();
  createWorkItem(dir, { id: "WI-dup", type: "chore", allowed_edit_set: [], gates: [] });
  assert.throws(() => createWorkItem(dir, { id: "WI-dup", type: "chore", allowed_edit_set: [], gates: [] }), /already exists/);
  assert.throws(() => createWorkItem(dir, { id: "has a space", type: "chore" }), /letters, numbers/);
  rmSync(dir, { recursive: true, force: true });
});

test("updateWorkItem edits only the safe metadata fields, regardless of current state", () => {
  const dir = scratchModonomeDir();
  createWorkItem(dir, { id: "WI-fixture-002", type: "fix-issue", allowed_edit_set: ["a.mjs"], gates: [] });

  const updated = updateWorkItem(dir, "WI-fixture-002", {
    type: "develop-feature",
    assigned_role: "maker",
    gates: ["node --test tests/a.test.mjs"],
  });
  assert.equal(updated.type, "develop-feature");
  assert.equal(updated.assigned_role, "maker");
  assert.deepEqual(updated.gates, ["node --test tests/a.test.mjs"]);
  assert.equal(updated.state, "queued", "state is untouched by a metadata update");

  rmSync(dir, { recursive: true, force: true });
});

test("updateWorkItem rejects a field outside the safe-edit whitelist", () => {
  const dir = scratchModonomeDir();
  createWorkItem(dir, { id: "WI-fixture-003", type: "chore", allowed_edit_set: [], gates: [] });
  assert.throws(() => updateWorkItem(dir, "WI-fixture-003", { state: "done" }), /not editable from the panel/);
  assert.throws(() => updateWorkItem(dir, "WI-fixture-003", { owner: "someone" }), /not editable from the panel/);
  rmSync(dir, { recursive: true, force: true });
});

test("updateWorkItem still applies a metadata edit to an in-flight item", () => {
  const dir = scratchModonomeDir();
  const file = join(dir, "work-items", "WI-fixture-004.json");
  writeFileSync(
    file,
    JSON.stringify(
      {
        schema_version: 1,
        id: "WI-fixture-004",
        state: "making",
        maker_id: "maker:demo:run1:claude-sonnet-4-6",
        attempts: 0,
        max_attempts: 3,
        touches_protected_path: false,
        allowed_edit_set: ["a.mjs"],
        gates: [],
      },
      null,
      2,
    ),
  );
  const updated = updateWorkItem(dir, "WI-fixture-004", { type: "fix-issue" });
  assert.equal(updated.type, "fix-issue");
  assert.equal(updated.state, "making", "in-flight state is preserved by a metadata-only edit");
  rmSync(dir, { recursive: true, force: true });
});

test("deleteWorkItem removes a queued or done item", () => {
  const dir = scratchModonomeDir();
  createWorkItem(dir, { id: "WI-fixture-005", type: "chore", allowed_edit_set: [], gates: [] });
  deleteWorkItem(dir, "WI-fixture-005");
  assert.equal(existsSync(join(dir, "work-items", "WI-fixture-005.json")), false);
  rmSync(dir, { recursive: true, force: true });
});

test("deleteWorkItem refuses every in-flight state, live lease or not", () => {
  const dir = scratchModonomeDir();
  for (const state of ["claimed", "making", "checking", "rework", "merge_ready", "merging"]) {
    const id = `WI-fixture-inflight-${state}`;
    const file = join(dir, "work-items", `${id}.json`);
    writeFileSync(file, JSON.stringify({ schema_version: 1, id, state, attempts: 0, max_attempts: 3 }, null, 2));
    assert.throws(() => deleteWorkItem(dir, id), /in flight/);
    assert.ok(existsSync(file), `${state} item must survive a refused delete`);
  }
  rmSync(dir, { recursive: true, force: true });
});
