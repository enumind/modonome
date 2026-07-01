import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalToWorkItem } from "../scripts/dry-run-sweep.mjs";
import { validateWorkItem } from "../scripts/validate-work-item.mjs";

test("proposalToWorkItem creates a valid queued work item from a proposal string", () => {
  const proposal = "Add focused tests around the most-changed file: foo.mjs.";
  const item = proposalToWorkItem(proposal);

  assert.strictEqual(item.schema_version, 1, "schema_version must be 1");
  assert.strictEqual(item.state, "queued", "state must be queued");
  assert.strictEqual(item.attempts, 0, "attempts must be 0");
  assert.strictEqual(item.max_attempts, 3, "max_attempts must be 3");
  assert.strictEqual(item.touches_protected_path, false, "touches_protected_path must be false");
  assert.deepStrictEqual(item.allowed_edit_set, ["tests/"], "default allowed_edit_set must be [tests/]");
  assert.deepStrictEqual(item.gates, ["node --test tests/*.test.mjs", "node scripts/check-style.mjs ."], "gates must match defaults");
  assert.ok(item.queued_at, "queued_at must be present");
  assert.ok(item.id, "id must be present");
  assert.match(item.id, /^WI-auto-/, "id must have WI-auto- prefix");
});

test("proposalToWorkItem generates valid id from proposal slug", () => {
  const proposal = "Add focused tests around the most-changed file: foo.mjs.";
  const item = proposalToWorkItem(proposal);

  assert.strictEqual(item.id, "WI-auto-add-focused-tests-around-the-most-changed-file-foo-mjs", "id must be slugified proposal");
});

test("proposalToWorkItem honors opts.id override", () => {
  const proposal = "Some proposal text";
  const item = proposalToWorkItem(proposal, { id: "WI-custom-123" });

  assert.strictEqual(item.id, "WI-custom-123", "id must use opts.id when provided");
});

test("proposalToWorkItem honors opts.allowedEditSet", () => {
  const proposal = "Some proposal";
  const editSet = ["src/", "lib/"];
  const item = proposalToWorkItem(proposal, { allowedEditSet: editSet });

  assert.deepStrictEqual(item.allowed_edit_set, editSet, "allowed_edit_set must use opts.allowedEditSet when provided");
});

test("proposalToWorkItem honors opts.gates", () => {
  const proposal = "Some proposal";
  const gates = ["npm test", "npm run lint"];
  const item = proposalToWorkItem(proposal, { gates });

  assert.deepStrictEqual(item.gates, gates, "gates must use opts.gates when provided");
});

test("proposalToWorkItem honors opts.queuedAt", () => {
  const proposal = "Some proposal";
  const fixedTime = "2026-07-01T12:00:00.000Z";
  const item = proposalToWorkItem(proposal, { queuedAt: fixedTime });

  assert.strictEqual(item.queued_at, fixedTime, "queued_at must use opts.queuedAt when provided");
});

test("proposalToWorkItem generated item passes validateWorkItem with no errors", () => {
  const proposal = "Add focused tests around the most-changed file: foo.mjs.";
  const item = proposalToWorkItem(proposal);
  const errors = validateWorkItem(item);

  assert.deepStrictEqual(errors, [], "generated item must be schema-valid with no governance errors");
});

test("different proposals generate different ids", () => {
  const proposal1 = "Add focused tests around the most-changed file: foo.mjs.";
  const proposal2 = "Type or guard one high-risk function and remove an unchecked assumption.";

  const item1 = proposalToWorkItem(proposal1);
  const item2 = proposalToWorkItem(proposal2);

  assert.notStrictEqual(item1.id, item2.id, "different proposals must generate different ids");
});

test("slug function is deterministic", () => {
  const proposal = "Add focused tests around the most-changed file: foo.mjs.";
  const item1 = proposalToWorkItem(proposal);
  const item2 = proposalToWorkItem(proposal);

  assert.strictEqual(item1.id, item2.id, "same proposal must generate same id (deterministic)");
});

test("proposalToWorkItem generates queued_at when not provided", () => {
  const proposal = "Some proposal";
  const item = proposalToWorkItem(proposal);

  assert.ok(item.queued_at, "queued_at must be auto-generated");
  assert.match(item.queued_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "queued_at must be ISO8601 format");
});

test("proposalToWorkItem with all options provided passes validation", () => {
  const proposal = "Add focused tests";
  const item = proposalToWorkItem(proposal, {
    id: "WI-test-all-opts",
    allowedEditSet: ["docs/", "tests/"],
    gates: ["npm test"],
    queuedAt: "2026-07-01T12:00:00.000Z",
  });

  const errors = validateWorkItem(item);
  assert.deepStrictEqual(errors, [], "item with all options must be schema-valid");
  assert.strictEqual(item.id, "WI-test-all-opts");
  assert.deepStrictEqual(item.allowed_edit_set, ["docs/", "tests/"]);
  assert.deepStrictEqual(item.gates, ["npm test"]);
  assert.strictEqual(item.queued_at, "2026-07-01T12:00:00.000Z");
});

test("proposalToWorkItem generated item has all required fields per schema", () => {
  const proposal = "Some proposal";
  const item = proposalToWorkItem(proposal);

  assert.ok(Object.prototype.hasOwnProperty.call(item, "schema_version"));
  assert.ok(Object.prototype.hasOwnProperty.call(item, "id"));
  assert.ok(Object.prototype.hasOwnProperty.call(item, "state"));
});
