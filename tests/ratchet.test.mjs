// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

const guard = join(root, "scripts", "guard-ratchet.mjs");
const apFixtures = join(root, "agentproof", "fixtures");

function ratchet(diffPath) {
  return spawnSync("node", [guard, "--diff", diffPath], { encoding: "utf8" });
}

test("ratchet passes clean diffs and rejects gaming diffs", () => {
  for (const f of files(join(fx, "ratchet-diffs", "clean"))) {
    const r = ratchet(f);
    assert.equal(r.status, 0, `expected clean: ${f}\n${r.stderr}`);
  }
  for (const f of files(join(fx, "ratchet-diffs", "gaming"))) {
    const r = ratchet(f);
    assert.equal(r.status, 1, `expected rejected: ${f}`);
  }
});

test("ratchet rejects vacuous (tautological) assertions across languages", () => {
  for (const f of [
    "ratchet-vacuous-matcher.patch",
    "ratchet-vacuous-java.patch",
    "ratchet-vacuous-csharp.patch",
  ]) {
    const r = ratchet(join(apFixtures, f));
    assert.equal(r.status, 1, `expected vacuous assertion rejected: ${f}\n${r.stdout}`);
    assert.match(r.stderr, /vacuous assertion/, `must name the vacuous assertion: ${f}`);
  }
});

test("ratchet does not flag real assertions that compare a value to a literal", () => {
  const r = ratchet(join(apFixtures, "ratchet-vacuous-clean.patch"));
  assert.equal(r.status, 0, `real assertions must pass:\n${r.stderr}`);
});

test("ratchet catches assertion removal in .mjs and .cjs test files", () => {
  const r = ratchet(join(apFixtures, "ratchet-mjs-assertion-removal.patch"));
  assert.equal(r.status, 1, `mjs assertion removal must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
});

test("ratchet counts removed Python bare assert statements", () => {
  const r = ratchet(join(apFixtures, "ratchet-python-bare-assert-removal.patch"));
  assert.equal(r.status, 1, `bare assert removal must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
});

test("ratchet rejects vacuous Python bare assertions", () => {
  const r = ratchet(join(apFixtures, "ratchet-python-vacuous-assert.patch"));
  assert.equal(r.status, 1, `assert True must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /vacuous Python assertion/, "must name the vacuous Python assertion");
});

test("ratchet accepts a Python diff that adds real bare assertions", () => {
  const r = ratchet(join(apFixtures, "ratchet-python-bare-assert-clean.patch"));
  assert.equal(r.status, 0, `real bare assertions must pass:\n${r.stderr}`);
});

test("ratchet refuses an unsafe git ref rather than shelling it out", () => {
  const r = spawnSync("node", [guard, "origin/main; rm -rf /tmp/pwned"], { encoding: "utf8" });
  assert.notEqual(r.status, 0, "an unsafe ref must not be accepted");
  assert.match(r.stderr, /refusing to diff against unsafe ref/, "must name the refusal reason");
});

test("ratchet surfaces a git failure when the base ref does not exist", () => {
  const r = spawnSync("node", [guard, "this-ref-does-not-exist-anywhere"], { encoding: "utf8" });
  assert.notEqual(r.status, 0, "a nonexistent ref must fail, not silently pass");
});

test("ratchet in base-ref mode compares the working tree to a real ref with no differences", () => {
  const r = spawnSync("node", [guard, "HEAD"], { encoding: "utf8", cwd: root });
  assert.equal(r.status, 0, `diffing HEAD against itself should be clean:\n${r.stderr}`);
});
