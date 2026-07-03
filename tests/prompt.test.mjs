// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const bundlePath = join(root, "prompts", "modonome.bundle.md");

test("prompt bundle is current and levers do not drift", () => {
  const bundle = spawnSync("node", [join(root, "scripts", "build-prompt.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(bundle.status, 0, bundle.stderr);
  const drift = spawnSync("node", [join(root, "scripts", "check-drift.mjs")], { encoding: "utf8" });
  assert.equal(drift.status, 0, drift.stderr);
});

test("build-prompt --write regenerates an identical bundle", () => {
  const before = readFileSync(bundlePath, "utf8");
  try {
    const result = spawnSync("node", [join(root, "scripts", "build-prompt.mjs"), "--write"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /wrote prompts\/modonome\.bundle\.md/);
    assert.equal(readFileSync(bundlePath, "utf8"), before, "--write should reproduce the committed bundle exactly");
  } finally {
    writeFileSync(bundlePath, before);
  }
});

test("build-prompt --check reports drift when the bundle is missing", () => {
  const before = readFileSync(bundlePath, "utf8");
  try {
    unlinkSync(bundlePath);
    const result = spawnSync("node", [join(root, "scripts", "build-prompt.mjs"), "--check"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Bundle drift/);
  } finally {
    writeFileSync(bundlePath, before);
  }
});

test("drift guard catches a lever missing from the template config", () => {
  const templatePath = join(root, "templates", ".modonome", "config.yaml");
  const before = readFileSync(templatePath, "utf8");
  try {
    const withoutLever = before.replace(/^autonomy_enabled:.*\n/m, "");
    writeFileSync(templatePath, withoutLever);
    const drift = spawnSync("node", [join(root, "scripts", "check-drift.mjs")], { encoding: "utf8" });
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /template config is missing levers/);
  } finally {
    writeFileSync(templatePath, before);
  }
});

test("drift guard catches an unexpected lever in the template config", () => {
  const templatePath = join(root, "templates", ".modonome", "config.yaml");
  const before = readFileSync(templatePath, "utf8");
  try {
    writeFileSync(templatePath, before + "\nnot_a_real_lever: true\n");
    const drift = spawnSync("node", [join(root, "scripts", "check-drift.mjs")], { encoding: "utf8" });
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /template config has unexpected levers/);
  } finally {
    writeFileSync(templatePath, before);
  }
});

test("drift guard catches a stale prompt bundle", () => {
  const before = readFileSync(bundlePath, "utf8");
  try {
    writeFileSync(bundlePath, before + "\nstale trailing line\n");
    const drift = spawnSync("node", [join(root, "scripts", "check-drift.mjs")], { encoding: "utf8" });
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /prompt bundle is out of date/);
  } finally {
    writeFileSync(bundlePath, before);
  }
});

test("CLI entry point responds to --help without error", () => {
  const r = spawnSync("node", [join(root, "bin", "modonome.mjs"), "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes("dry-run"), "help text should mention dry-run command");
});
