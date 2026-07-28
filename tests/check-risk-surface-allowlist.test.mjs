import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { parseAllowlist } from "../scripts/lib/risk-surface-allowlist.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SCRIPT = join(root, "scripts/check-risk-surface-allowlist.mjs");
const FIXTURES = join(root, "fixtures/risk-surface/allowlist");

function run(...args) {
  return spawnSync("node", [SCRIPT, ...args], { encoding: "utf8", timeout: 30000 });
}

// ---------------------------------------------------------------------------
// Pure pass-through: the gate's PASS/FAIL decision and printed problem list
// are exactly what parseAllowlist already decided; this file adds no
// additional validation logic of its own.
// ---------------------------------------------------------------------------

test("the gate's pass/fail decision matches parseAllowlist's own errors list", () => {
  const valid = '{"schema_version": 1, "entries": []}';
  assert.deepEqual(parseAllowlist(valid).errors, []);
  const r = run(join(FIXTURES, "single-valid-entry.json"));
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

// ---------------------------------------------------------------------------
// CLI integration
// ---------------------------------------------------------------------------

test("a single well-formed entry exits 0", () => {
  const r = run(join(FIXTURES, "single-valid-entry.json"));
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /PASS: 1 allowlist entry valid\./);
});

test("an expired entry is still structurally valid and exits 0 (expiry is a scan-time concern, not a validation-time one)", () => {
  const r = run(join(FIXTURES, "expired-entry.json"));
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

test("a glob file pattern is a valid entry shape and exits 0", () => {
  const r = run(join(FIXTURES, "glob-entry.json"));
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

test("malformed JSON exits 1 with a specific stderr message, not a crash", () => {
  const r = run(join(FIXTURES, "malformed.json"));
  assert.strictEqual(r.status, 1, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /FAIL: 1 risk-surface-guard allowlist problem\(s\):/);
  assert.match(r.stderr, /invalid JSON/);
});

test("a missing file is treated as zero suppressions, not an error", () => {
  const r = run(join(FIXTURES, "does-not-exist.json"));
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /not present; zero suppressions is the default state\./);
});

test("the gate passes against this repository's own live allowlist file", () => {
  const r = run();
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /Risk Surface Guard allowlist validation \(ADR-047\)/);
});

// ---------------------------------------------------------------------------
// Adversarial cases
// ---------------------------------------------------------------------------

test("a duplicate entry id exits 1 and names the duplicate", () => {
  const dir = mkdtempSync(join(tmpdir(), "risk-surface-allowlist-"));
  try {
    const file = join(dir, "duplicate-id.json");
    writeFileSync(
      file,
      JSON.stringify({
        schema_version: 1,
        entries: [
          { id: "dup", rule: "RS101", file: "a.js", reason: "r1", added_by: "x", added_at: "2026-01-01", expires_at: "2099-01-01" },
          { id: "dup", rule: "RS102", file: "b.js", reason: "r2", added_by: "x", added_at: "2026-01-01", expires_at: "2099-01-01" },
        ],
      }),
    );
    const r = run(file);
    assert.strictEqual(r.status, 1, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /duplicate entry id "dup"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown rule id exits 1 and names the unrecognized rule", () => {
  const dir = mkdtempSync(join(tmpdir(), "risk-surface-allowlist-"));
  try {
    const file = join(dir, "unknown-rule.json");
    writeFileSync(
      file,
      JSON.stringify({
        schema_version: 1,
        entries: [
          {
            id: "bad-rule",
            rule: "RS999",
            file: "a.js",
            reason: "r1",
            added_by: "x",
            added_at: "2026-01-01",
            expires_at: "2099-01-01",
          },
        ],
      }),
    );
    const r = run(file);
    assert.strictEqual(r.status, 1, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /unknown rule id "RS999"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("expires_at before added_at exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "risk-surface-allowlist-"));
  try {
    const file = join(dir, "backwards-dates.json");
    writeFileSync(
      file,
      JSON.stringify({
        schema_version: 1,
        entries: [
          {
            id: "backwards",
            rule: "RS101",
            file: "a.js",
            reason: "r1",
            added_by: "x",
            added_at: "2026-06-01",
            expires_at: "2026-01-01",
          },
        ],
      }),
    );
    const r = run(file);
    assert.strictEqual(r.status, 1, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /expires_at is before added_at/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown top-level property exits 1 (additionalProperties: false)", () => {
  const dir = mkdtempSync(join(tmpdir(), "risk-surface-allowlist-"));
  try {
    const file = join(dir, "extra-prop.json");
    writeFileSync(file, JSON.stringify({ schema_version: 1, entries: [], notes: "not allowed" }));
    const r = run(file);
    assert.strictEqual(r.status, 1, `${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
