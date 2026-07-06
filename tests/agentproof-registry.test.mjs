// Tests for the Hardened Registry (ADR-042). Schema validation only: no network call,
// matching this repository's offline-tests requirement. run_url is checked for a
// plausible https:// shape, never fetched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkRegistry } from "../scripts/check-agentproof-registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = JSON.parse(readFileSync(join(root, "schemas", "agentproof-registry.schema.json"), "utf8"));

const validEntry = {
  repo: "example-org/example-repo",
  run_url: "https://github.com/example-org/example-repo/actions/runs/123",
  digest: "sha256:abcdef0123456789",
  verified_at: "2026-07-04",
};

test("an empty registry passes", () => {
  assert.deepEqual(checkRegistry({ entries: [] }, schema), []);
});

test("a registry with one well-formed entry passes", () => {
  assert.deepEqual(checkRegistry({ entries: [validEntry] }, schema), []);
});

test("a comment field alongside entries is allowed", () => {
  assert.deepEqual(checkRegistry({ comment: "context", entries: [validEntry] }, schema), []);
});

test("an entry missing a required field fails", () => {
  const { digest, ...missingDigest } = validEntry;
  const problems = checkRegistry({ entries: [missingDigest] }, schema);
  assert.ok(problems.length > 0);
  assert.match(problems[0], /digest/);
});

test("a malformed run_url fails", () => {
  const bad = { ...validEntry, run_url: "not-a-url" };
  const problems = checkRegistry({ entries: [bad] }, schema);
  assert.ok(problems.length > 0);
  assert.match(problems.join(" "), /run_url/);
});

test("a run_url using a non-https scheme fails", () => {
  const bad = { ...validEntry, run_url: "http://example.com/run/1" };
  const problems = checkRegistry({ entries: [bad] }, schema);
  assert.ok(problems.length > 0);
});

test("an unexpected top-level property fails (additionalProperties: false)", () => {
  const problems = checkRegistry({ entries: [], extra: true }, schema);
  assert.ok(problems.length > 0);
});

test("an unexpected entry property fails (additionalProperties: false)", () => {
  const bad = { ...validEntry, extra_field: "nope" };
  const problems = checkRegistry({ entries: [bad] }, schema);
  assert.ok(problems.length > 0);
});

test("a missing entries array fails", () => {
  const problems = checkRegistry({}, schema);
  assert.ok(problems.length > 0);
  assert.match(problems.join(" "), /entries/);
});

test("the real committed registry passes via the CLI", () => {
  const r = spawnSync("node", [join(root, "scripts/check-agentproof-registry.mjs")], {
    encoding: "utf8",
    timeout: 30000,
  });
  assert.strictEqual(r.status, 0, `expected exit 0:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /PASS: registry is schema-valid/);
});
