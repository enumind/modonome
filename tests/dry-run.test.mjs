import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fixtures = join(root, "fixtures", "dry-run");

function dryRun(dir) {
  return spawnSync("node", [join(root, "scripts/dry-run-sweep.mjs"), dir], {
    encoding: "utf8",
    timeout: 30000,
  });
}

test("dry-run on a Node project detects stack and proposes work", () => {
  const result = dryRun(join(fixtures, "node"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  const out = result.stdout;
  assert.match(out, /Mode: dry-run\. This run changed nothing/, "must declare dry-run mode");
  assert.match(out, /Node or TypeScript/, "must detect Node stack");
  assert.match(out, /npm/, "must detect npm as package manager");
  assert.match(out, /Proposed bounded work/, "must propose work");
  assert.match(out, /1\./, "must include at least one proposal");
});

test("dry-run on a Python project detects Python stack", () => {
  const result = dryRun(join(fixtures, "python"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  const out = result.stdout;
  assert.match(out, /Python/, "must detect Python stack");
  assert.match(out, /pip/, "must detect pip");
  assert.match(out, /pytest/, "must include pytest as a gate");
});

test("dry-run on an empty directory reports unknown stack", () => {
  const result = dryRun(join(fixtures, "empty"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  const out = result.stdout;
  assert.match(out, /Unknown/, "must report Unknown stack for an empty directory");
  assert.match(out, /Mode: dry-run\. This run changed nothing/, "must still declare dry-run mode");
});

test("dry-run output always includes safety footer", () => {
  const result = dryRun(join(fixtures, "node"));
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Refused by default/, "must include refusal footer");
});

test("dry-run detects protected paths when present", () => {
  const result = dryRun(join(fixtures, "node"));
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Protected paths it would never auto-merge/, "must list protected paths section");
});
