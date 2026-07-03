// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

test("prompt bundle is current and levers do not drift", () => {
  const bundle = spawnSync("node", [join(root, "scripts", "build-prompt.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(bundle.status, 0, bundle.stderr);
  const drift = spawnSync("node", [join(root, "scripts", "check-drift.mjs")], { encoding: "utf8" });
  assert.equal(drift.status, 0, drift.stderr);
});

test("CLI entry point responds to --help without error", () => {
  const r = spawnSync("node", [join(root, "bin", "modonome.mjs"), "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes("dry-run"), "help text should mention dry-run command");
});
