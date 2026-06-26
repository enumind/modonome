import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { validateConfig } from "../scripts/validate-config.mjs";
import { validateWorkItem } from "../scripts/validate-work-item.mjs";
import { validatePacket } from "../scripts/validate-knowledge-packet.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const guard = join(root, "scripts", "guard-ratchet.mjs");

// Build a synthetic 1000-line diff that is clean (no gaming patterns).
function buildLargeDiff(lines) {
  const chunks = [];
  chunks.push("diff --git a/src/app.test.ts b/src/app.test.ts");
  chunks.push("--- a/src/app.test.ts");
  chunks.push("+++ b/src/app.test.ts");
  for (let i = 0; i < lines; i++) {
    chunks.push(`+// generated line ${i} - no assertions removed`);
  }
  return chunks.join("\n") + "\n";
}

describe("performance: guard-ratchet on a 1000-line diff", () => {
  test("given a 1000-line clean diff, when guard-ratchet runs, then it completes in under 500ms", { timeout: 1500 }, () => {
    const diff = buildLargeDiff(1000);
    const tmpPath = join(root, "fixtures", "ratchet-diffs", "clean", "_perf-1000-lines.diff");
    writeFileSync(tmpPath, diff, "utf8");
    try {
      const start = Date.now();
      const r = spawnSync("node", [guard, "--diff", tmpPath], { encoding: "utf8", timeout: 1500 });
      const elapsed = Date.now() - start;
      assert.equal(r.status, 0, `guard-ratchet must pass clean diff: ${r.stderr}`);
      assert.ok(elapsed < 500, `guard-ratchet took ${elapsed}ms, expected < 500ms`);
    } finally {
      spawnSync("rm", ["-f", tmpPath]);
    }
  });
});

describe("performance: config validation", () => {
  test("given a valid config object, when validateConfig runs, then it completes in under 100ms", { timeout: 300 }, () => {
    const cfg = {
      schema_version: 1,
      autonomy_enabled: false,
      dry_run: true,
      auto_merge: false,
      max_merges_per_day: 0,
      require_distinct_maker_checker: true,
      require_branch_protection: true,
      trusted_author_allowlist: ["ci-bot"],
      state_dir: ".modonome",
    };
    const start = Date.now();
    const errors = validateConfig(cfg);
    const elapsed = Date.now() - start;
    assert.deepEqual(errors, [], "valid config must have no errors");
    assert.ok(elapsed < 100, `validateConfig took ${elapsed}ms, expected < 100ms`);
  });

  test("given an invalid config object, when validateConfig runs, then it still completes in under 100ms", { timeout: 300 }, () => {
    const cfg = {
      schema_version: 1,
      autonomy_enabled: true,
      auto_merge: true,
      max_merges_per_day: 0, // violates safety rule
    };
    const start = Date.now();
    const errors = validateConfig(cfg);
    const elapsed = Date.now() - start;
    assert.ok(errors.length > 0, "invalid config must produce errors");
    assert.ok(elapsed < 100, `validateConfig took ${elapsed}ms, expected < 100ms`);
  });
});

describe("performance: work item validation", () => {
  test("given a valid work item, when validateWorkItem runs, then it completes in under 100ms", { timeout: 300 }, () => {
    const item = {
      schema_version: 1,
      id: "wi-perf-001",
      state: "queued",
      attempts: 0,
      max_attempts: 3,
      touches_protected_path: false,
      allowed_edit_set: ["src/foo.ts"],
      gates: ["npm test"],
    };
    const start = Date.now();
    const errors = validateWorkItem(item);
    const elapsed = Date.now() - start;
    assert.deepEqual(errors, [], "valid work item must have no errors");
    assert.ok(elapsed < 100, `validateWorkItem took ${elapsed}ms, expected < 100ms`);
  });

  test("given an invalid work item (same maker and checker), when validateWorkItem runs, then it completes in under 100ms", { timeout: 300 }, () => {
    const item = {
      schema_version: 1,
      id: "wi-perf-002",
      state: "merge_ready",
      attempts: 1,
      max_attempts: 3,
      touches_protected_path: false,
      allowed_edit_set: ["src/foo.ts"],
      gates: ["npm test"],
      maker_id: "alice",
      checker_id: "alice", // same; violates separation of duties
    };
    const start = Date.now();
    const errors = validateWorkItem(item);
    const elapsed = Date.now() - start;
    assert.ok(errors.length > 0, "work item with same maker/checker must produce errors");
    assert.ok(elapsed < 100, `validateWorkItem took ${elapsed}ms, expected < 100ms`);
  });
});

describe("performance: knowledge packet validation", () => {
  test("given a valid knowledge packet, when validatePacket runs, then it completes in under 100ms", { timeout: 300 }, () => {
    const packet = {
      schema_version: 1,
      id: "kp-perf-001",
      signal: "review",
      classification: "public",
      redaction_status: "redacted",
      modernization_axis: "test_coverage",
      topic: "performance test packet",
      application_capability: "checkout",
      problem_pattern: "slow validation",
      pattern: "benchmark validation routines",
      local_validation_required: true,
      owner_decision_required: true,
      expires_at: "2026-12-31",
    };
    const start = Date.now();
    const errors = validatePacket(packet);
    const elapsed = Date.now() - start;
    assert.deepEqual(errors, [], "valid packet must have no errors");
    assert.ok(elapsed < 100, `validatePacket took ${elapsed}ms, expected < 100ms`);
  });

  test("given a packet with a secret, when validatePacket runs, then it still completes in under 100ms", { timeout: 300 }, () => {
    const packet = {
      schema_version: 1,
      id: "kp-perf-002",
      signal: "review",
      classification: "public",
      redaction_status: "redacted",
      modernization_axis: "test_coverage",
      topic: "leaky packet",
      application_capability: "auth",
      problem_pattern: "secret in packet",
      pattern: "AKIA1234567890ABCDEF",
      local_validation_required: true,
      owner_decision_required: true,
      expires_at: "2026-12-31",
    };
    const start = Date.now();
    const errors = validatePacket(packet);
    const elapsed = Date.now() - start;
    assert.ok(errors.length > 0, "packet with secret must be rejected");
    assert.ok(elapsed < 100, `validatePacket took ${elapsed}ms, expected < 100ms`);
  });
});
