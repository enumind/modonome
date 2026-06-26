import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { validateConfig, loadConfig } from "../scripts/validate-config.mjs";
import { validatePacket } from "../scripts/validate-knowledge-packet.mjs";
import { parseFlatYaml } from "../scripts/lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const guard = join(root, "scripts", "guard-ratchet.mjs");

// Chaos test helper: any call must either return errors cleanly OR not throw.
// A crash or hang is a failure.
function noThrow(fn) {
  try {
    fn();
  } catch (e) {
    // Catching and re-throwing as a test failure is fine; crashing is not.
    assert.fail(`unexpected exception: ${e.message}`);
  }
}

// Wrap guard-ratchet call with a hard 5-second timeout.
function ratchetWithTimeout(content) {
  const tmpPath = join(root, "fixtures", "ratchet-diffs", "clean", "_chaos-tmp.diff");
  writeFileSync(tmpPath, content, "utf8");
  try {
    return spawnSync("node", [guard, "--diff", tmpPath], { encoding: "utf8", timeout: 5000 });
  } finally {
    spawnSync("rm", ["-f", tmpPath]);
  }
}

describe("chaos: malformed YAML inputs to parseFlatYaml", () => {
  test("single-character corruption in key-value pair does not throw", () => {
    // Almost-valid YAML: a colon that looks like a key but has no value after it
    noThrow(() => parseFlatYaml("autonomy_enabled:true")); // missing space after colon
  });

  test("YAML line missing colon entirely does not throw", () => {
    noThrow(() => parseFlatYaml("autonomy_enabled true\nstate_dir: .modonome"));
  });

  test("YAML with unclosed bracket does not throw", () => {
    noThrow(() => parseFlatYaml("trusted_author_allowlist: [bot, ci\nstate_dir: .modonome"));
  });

  test("YAML with only comment lines does not throw", () => {
    noThrow(() => {
      const result = parseFlatYaml("# comment only\n# another comment");
      assert.equal(typeof result, "object");
    });
  });

  test("YAML with mixed valid and corrupted lines still parses valid lines", () => {
    noThrow(() => {
      const result = parseFlatYaml("state_dir: .modonome\n\x00corrupted\nautonomy_enabled: false");
      assert.equal(result.state_dir, ".modonome");
    });
  });
});

describe("chaos: extremely long field values in config", () => {
  const tenKB = "x".repeat(10_000);

  test("given a 10KB string in a config topic field, validateConfig does not crash", () => {
    noThrow(() => {
      const cfg = { schema_version: 1, state_dir: tenKB, autonomy_enabled: false };
      const errors = validateConfig(cfg);
      assert.ok(Array.isArray(errors), "errors must be an array");
    });
  });

  test("given a 10KB string in a packet topic field, validatePacket does not crash", () => {
    noThrow(() => {
      const packet = {
        schema_version: 1,
        id: "kp-chaos-001",
        signal: "review",
        classification: "public",
        redaction_status: "redacted",
        modernization_axis: "test_coverage",
        topic: tenKB,
        application_capability: "checkout",
        problem_pattern: "performance",
        pattern: "benchmark",
        local_validation_required: true,
        owner_decision_required: true,
        expires_at: "2026-12-31",
      };
      const errors = validatePacket(packet);
      assert.ok(Array.isArray(errors), "errors must be an array");
    });
  });
});

describe("chaos: binary garbage and null bytes in diff content", () => {
  test("diff containing binary garbage is handled cleanly by guard-ratchet (exit 0 or 1, no crash)", () => {
    // Binary garbage: random non-printable bytes mixed into diff header lines.
    const garbage = "diff --git a/foo.ts b/foo.ts\n--- a/foo.ts\n+++ b/foo.ts\n@@\n+" +
      Buffer.from([0x00, 0x01, 0x80, 0xff, 0x1b, 0x07]).toString("binary") +
      "\n+// normal line\n";
    const r = ratchetWithTimeout(garbage);
    assert.ok(r.status === 0 || r.status === 1, `guard-ratchet must exit 0 or 1, got ${r.status}`);
    assert.ok(r.signal === null, `guard-ratchet must not be killed by signal, got ${r.signal}`);
  });

  test("diff with null bytes in file header is handled cleanly", () => {
    const content = "diff --git a/test\x00.ts b/test\x00.ts\n--- a/test.ts\n+++ b/test.ts\n@@\n+// line\n";
    const r = ratchetWithTimeout(content);
    assert.ok(r.status === 0 || r.status === 1, `expected clean exit, got ${r.status}`);
    assert.ok(r.signal === null, "must not be killed");
  });
});

describe("chaos: null bytes and control characters in config values", () => {
  test("config with null byte in state_dir field is rejected or handled without crash", () => {
    noThrow(() => {
      const cfg = { schema_version: 1, state_dir: ".modonome\x00evil", autonomy_enabled: false };
      const errors = validateConfig(cfg);
      assert.ok(Array.isArray(errors), "must return errors array, not crash");
    });
  });

  test("config with control characters in trusted_author_allowlist is rejected or handled without crash", () => {
    noThrow(() => {
      const cfg = {
        schema_version: 1,
        state_dir: ".modonome",
        autonomy_enabled: false,
        trusted_author_allowlist: ["\x01\x02\x03"],
      };
      const errors = validateConfig(cfg);
      assert.ok(Array.isArray(errors), "must return errors array, not crash");
    });
  });
});

describe("chaos: deeply nested YAML (50 levels)", () => {
  test("given 50-level deeply nested YAML, parseFlatYaml does not crash or hang", () => {
    // Build YAML with 50 levels of indentation.
    const lines = [];
    for (let i = 0; i < 50; i++) {
      lines.push(" ".repeat(i * 2) + `level${i}:`);
    }
    lines.push(" ".repeat(50 * 2) + "leaf: value");
    const deepYaml = lines.join("\n");
    noThrow(() => {
      const result = parseFlatYaml(deepYaml);
      assert.ok(typeof result === "object", "must return an object");
    });
  });
});
