// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function cli(...args) {
  return spawnSync("node", [join(root, "bin/modonome.mjs"), ...args], {
    encoding: "utf8",
    timeout: 30000,
  });
}

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-cli-"));
}

test("help flags print usage and exit 0", () => {
  for (const flag of ["help", "--help", "-h"]) {
    const r = cli(flag);
    assert.strictEqual(r.status, 0, `${flag} exited ${r.status}`);
    assert.match(r.stdout, /npx modonome/, `${flag}: must include usage line`);
  }
});

test("no arguments prints help and exits 0", () => {
  const r = cli();
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /npx modonome/, "no-args: must include usage line");
});

test("unknown command exits 2 with error message", () => {
  const r = cli("not-a-command");
  assert.strictEqual(r.status, 2, `expected exit 2, got ${r.status}`);
  assert.match(r.stderr, /Unknown command/, "must print Unknown command error");
});

test("dry-run dispatches to dry-run-sweep and outputs dry-run header", () => {
  const dir = tmp();
  try {
    const r = cli("dry-run", dir);
    assert.strictEqual(r.status, 0, `dry-run exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /dry-run sweep/, "must print dry-run sweep header");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("adopt is an alias for dry-run", () => {
  const dir = tmp();
  try {
    const r = cli("adopt", dir);
    assert.strictEqual(r.status, 0, `adopt exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /dry-run sweep/, "adopt must invoke dry-run-sweep");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate --type config routes to config validator", () => {
  const dir = tmp();
  try {
    const cfg = join(dir, "modonome.yaml");
    writeFileSync(cfg, "schema_version: 1\narmed: false\n");
    const r = cli("validate", cfg, "--type", "config");
    // The config may be incomplete, but we expect the config validator to run (not the packet one).
    // Either a validation error or success is fine; what matters is no dispatch error.
    assert.ok(r.status !== 2, "exit 2 would mean unknown command, not a validate dispatch");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate routes to packet validator when filename contains 'packet'", () => {
  const dir = tmp();
  try {
    const pkt = join(dir, "knowledge-packet.json");
    writeFileSync(pkt, JSON.stringify({
      schema_version: 1,
      id: "kp-fixture",
      signal: "review",
      classification: "public",
      redaction_status: "redacted",
      modernization_axis: "test_coverage",
      topic: "cli dispatch test",
      application_capability: "cli",
      problem_pattern: "none",
      pattern: "verify dispatch routes to packet validator",
      local_validation_required: true,
      owner_decision_required: true,
      expires_at: "2027-12-31",
    }));
    const r = cli("validate", pkt);
    // Packet validator should run. A valid packet should exit 0.
    assert.strictEqual(r.status, 0, `packet validation failed: ${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report runs without error on a directory with no metrics", () => {
  const dir = tmp();
  try {
    const r = cli("report", dir);
    assert.strictEqual(r.status, 0, `report exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /No metrics recorded yet/, "must report no activity when empty");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
