import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateWorkItem, governanceErrors } from "../scripts/validate-work-item.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function run(script, args = [], env = {}) {
  return spawnSync("node", [join(root, "scripts", script), ...args], {
    encoding: "utf8", timeout: 30000, env: { ...process.env, ...env },
  });
}

test("all work items in the repo validate", () => {
  const r = run("check-work-items.mjs");
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /maker and checker stay distinct/);
});

test("work-item governance rejects maker == checker", () => {
  const errs = validateWorkItem({
    schema_version: 1, id: "x", state: "checking",
    maker_id: "agent-a", checker_id: "agent-a",
  });
  assert.ok(errs.some((e) => /maker.*checker.*same identity/i.test(e)), errs.join("; "));
});

test("checker-engagement gate passes when there is no telemetry", () => {
  const r = run("check-checker-engagement.mjs", [join(root, ".modonome", "does-not-exist.jsonl")]);
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

test("checker-engagement gate passes for an engaged checker", () => {
  const dir = mkdtempSync(join(tmpdir(), "modonome-checker-"));
  const f = join(dir, "metrics.jsonl");
  const lines = [];
  for (let i = 0; i < 12; i++) {
    // every third run the checker raises a question -> engaged, resets the counter
    const questions = i % 3 === 0 ? 1 : 0;
    lines.push(JSON.stringify({ schema_version: 1, ts: "2026-06-25T00:00:00Z", event: "merged", checker_id: "agent-b", checker_requested_changes: false, checker_questions_raised: questions }));
  }
  writeFileSync(f, lines.join("\n") + "\n");
  try {
    const r = run("check-checker-engagement.mjs", [f]);
    assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merge_ready item with maker_id but no checker_id is rejected", () => {
  const errs = validateWorkItem({
    schema_version: 1, id: "x", state: "merge_ready",
    maker_id: "agent-a",
  });
  assert.ok(errs.some((e) => /checker_id.*required/i.test(e)), errs.join("; "));
});

test("checking item with no maker_id is rejected", () => {
  const errs = validateWorkItem({
    schema_version: 1, id: "x", state: "checking",
    checker_id: "agent-b",
  });
  assert.ok(errs.some((e) => /maker_id.*required/i.test(e)), errs.join("; "));
});

test("maker_id === checker_id is rejected", () => {
  const errs = validateWorkItem({
    schema_version: 1, id: "x", state: "merge_ready",
    maker_id: "agent-a", checker_id: "agent-a",
  });
  assert.ok(errs.some((e) => /maker.*checker.*same identity/i.test(e)), errs.join("; "));
});

test("identical maker_model/checker_model is allowed when require_distinct_maker_checker_model is false", () => {
  const errs = governanceErrors(
    { schema_version: 1, id: "x", state: "merge_ready", maker_id: "agent-a", checker_id: "agent-b", maker_model: "claude-sonnet-4-6", checker_model: "claude-sonnet-4-6" },
    { require_distinct_maker_checker_model: false }
  );
  assert.ok(!errs.some((e) => /maker_model.*checker_model/i.test(e)), "expected no model-distinctness error; got: " + errs.join("; "));
});

test("identical maker_model/checker_model is rejected with default config", () => {
  const errs = governanceErrors({
    schema_version: 1, id: "x", state: "merge_ready",
    maker_id: "agent-a", checker_id: "agent-b",
    maker_model: "claude-sonnet-4-6", checker_model: "claude-sonnet-4-6",
  });
  assert.ok(errs.some((e) => /maker_model.*checker_model/i.test(e)), errs.join("; "));
});

test("checker-engagement gate fails on a ghosting checker (teeth)", () => {
  const dir = mkdtempSync(join(tmpdir(), "modonome-checker-"));
  const f = join(dir, "metrics.jsonl");
  const lines = [];
  for (let i = 0; i < 10; i++) {
    lines.push(JSON.stringify({ schema_version: 1, ts: "2026-06-25T00:00:00Z", event: "merged", checker_id: "agent-c", checker_requested_changes: false, checker_questions_raised: 0 }));
  }
  writeFileSync(f, lines.join("\n") + "\n");
  try {
    const r = run("check-checker-engagement.mjs", [f]);
    assert.strictEqual(r.status, 1, "expected ghosting to fail the gate");
    assert.match(r.stderr, /consecutive runs with no engagement/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
