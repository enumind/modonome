import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveArming } from "../bin/modonome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const cli = join(root, "bin/modonome.mjs");

function tmpRepo(configBody) {
  const dir = mkdtempSync(join(tmpdir(), "modonome-arming-"));
  mkdirSync(join(dir, ".modonome"), { recursive: true });
  if (configBody !== undefined) {
    writeFileSync(join(dir, ".modonome", "config.yaml"), configBody);
  }
  return dir;
}

function runStatus(dir, env) {
  return spawnSync("node", [cli, "status", dir], {
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, ...env },
  });
}

// ---------------------------------------------------------------------------
// Unit tests on resolveArming: the pure arming gate
// ---------------------------------------------------------------------------

test("config autonomy_enabled true does NOT arm without MODONOME_ARMED", () => {
  const dir = tmpRepo("schema_version: 1\nautonomy_enabled: true\n");
  try {
    const r = resolveArming(dir, {});
    assert.strictEqual(r.configSaysArmed, true, "config opts in");
    assert.strictEqual(r.envArmed, false, "env not set");
    assert.strictEqual(r.effectiveArmed, false, "must NOT be armed by config alone");
    assert.match(r.warning, /MODONOME_ARMED not set/, "must warn about dry-run override");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arming requires both env var and config opt-in", () => {
  const dir = tmpRepo("schema_version: 1\nautonomy_enabled: true\n");
  try {
    const r = resolveArming(dir, { MODONOME_ARMED: "true" });
    assert.strictEqual(r.effectiveArmed, true, "armed when both env and config agree");
    assert.strictEqual(r.warning, null, "no warning when armed correctly");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("env var alone does not arm when config keeps autonomy disabled", () => {
  const dir = tmpRepo("schema_version: 1\nautonomy_enabled: false\n");
  try {
    const r = resolveArming(dir, { MODONOME_ARMED: "true" });
    assert.strictEqual(r.configSaysArmed, false);
    assert.strictEqual(r.effectiveArmed, false, "config must also opt in");
    assert.strictEqual(r.warning, null, "no false-armed warning when config is disabled");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MODONOME_ARMED with any value other than 'true' does not arm", () => {
  const dir = tmpRepo("schema_version: 1\nautonomy_enabled: true\n");
  try {
    for (const val of ["1", "yes", "TRUE", "on", ""]) {
      const r = resolveArming(dir, { MODONOME_ARMED: val });
      assert.strictEqual(r.effectiveArmed, false, `value ${JSON.stringify(val)} must not arm`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing config is treated as not armed", () => {
  const dir = mkdtempSync(join(tmpdir(), "modonome-arming-noconf-"));
  try {
    const r = resolveArming(dir, { MODONOME_ARMED: "true" });
    assert.strictEqual(r.configSaysArmed, false);
    assert.strictEqual(r.effectiveArmed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// CLI integration: the status command and the dry-run warning
// ---------------------------------------------------------------------------

test("status command reports dry-run when config arms but env does not", () => {
  const dir = tmpRepo("schema_version: 1\nautonomy_enabled: true\n");
  try {
    const r = runStatus(dir, { MODONOME_ARMED: "" });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /Effective state:\s+dry-run/, "must report dry-run");
    assert.match(r.stdout, /Config autonomy:\s+enabled \(advisory\)/, "config shown as advisory");
    assert.match(r.stderr, /MODONOME_ARMED not set/, "warning emitted to stderr");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("status command reports ARMED only when env var is set and config opts in", () => {
  const dir = tmpRepo("schema_version: 1\nautonomy_enabled: true\n");
  try {
    const r = runStatus(dir, { MODONOME_ARMED: "true" });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /Effective state:\s+ARMED/, "must report ARMED");
    assert.doesNotMatch(r.stderr, /MODONOME_ARMED not set/, "no warning when armed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
