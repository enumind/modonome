import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  buildLearningRecord,
  validateLearningRecord,
} from "../scripts/promote-learning.mjs";
import { REQUIRED_FIELDS } from "../scripts/lib/learnings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function run(script, args = []) {
  return spawnSync("node", [join(root, "scripts", script), ...args], {
    encoding: "utf8",
    timeout: 30000,
  });
}

test("buildLearningRecord with valid opts returns all required fields", () => {
  const record = buildLearningRecord({
    lesson: "always validate input",
    evidenceSummary: "found in 3 audits",
    correctionSignalId: "docs/adr/ADR-026.md",
    gateAdded: "new validation gate",
    gateLocation: "scripts/check-style.mjs",
  });

  for (const field of REQUIRED_FIELDS) {
    assert.ok(
      record[field] !== undefined && String(record[field]).trim() !== "",
      `field ${field} should be present and non-empty`,
    );
  }
});

test("buildLearningRecord throws on missing lesson", () => {
  assert.throws(
    () => buildLearningRecord({ evidenceSummary: "x" }),
    /missing required option 'lesson'/,
  );
});

test("buildLearningRecord throws on missing evidenceSummary", () => {
  assert.throws(
    () => buildLearningRecord({ lesson: "example" }),
    /missing required option 'evidenceSummary'/,
  );
});

test("buildLearningRecord generates deterministic id from lesson", () => {
  const record1 = buildLearningRecord({
    lesson: "duplicate logic",
    evidenceSummary: "x",
  });
  const record2 = buildLearningRecord({
    lesson: "duplicate logic",
    evidenceSummary: "y",
  });
  assert.strictEqual(record1.id, record2.id);
});

test("buildLearningRecord uses provided id if given", () => {
  const record = buildLearningRecord({
    id: "CUSTOM-123",
    lesson: "example",
    evidenceSummary: "x",
  });
  assert.strictEqual(record.id, "CUSTOM-123");
});

test("buildLearningRecord defaults dates to today in YYYY-MM-DD format", () => {
  const record = buildLearningRecord({
    lesson: "example",
    evidenceSummary: "x",
  });
  const today = new Date().toISOString().slice(0, 10);
  assert.strictEqual(record.observation_date, today);
  assert.strictEqual(record.promotion_date, today);
  assert.match(record.observation_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(record.promotion_date, /^\d{4}-\d{2}-\d{2}$/);
});

test("buildLearningRecord uses provided dates if given", () => {
  const record = buildLearningRecord({
    lesson: "example",
    evidenceSummary: "x",
    observationDate: "2026-06-15",
    promotionDate: "2026-07-01",
  });
  assert.strictEqual(record.observation_date, "2026-06-15");
  assert.strictEqual(record.promotion_date, "2026-07-01");
});

test("validateLearningRecord returns no errors for valid record", () => {
  const record = buildLearningRecord({
    lesson: "good lesson",
    evidenceSummary: "observed in audit",
    correctionSignalId: "docs/adr/ADR-026.md",
    gateAdded: "check added",
    gateLocation: "scripts/check-style.mjs",
  });
  const errors = validateLearningRecord(record);
  assert.strictEqual(errors.length, 0);
});

test("validateLearningRecord rejects gate_location outside allowed dirs", () => {
  const record = buildLearningRecord({
    lesson: "example",
    evidenceSummary: "x",
    gateLocation: "docs/something.md",
  });
  const errors = validateLearningRecord(record);
  assert.ok(errors.some((e) => e.includes("gate_location")));
  assert.ok(errors.some((e) => e.includes("scripts/, tests/, or .github/")));
});

test("validateLearningRecord accepts gate_location under scripts/", () => {
  const record = buildLearningRecord({
    lesson: "example",
    evidenceSummary: "x",
    gateLocation: "scripts/check-style.mjs",
  });
  const errors = validateLearningRecord(record);
  assert.ok(!errors.some((e) => e.includes("gate_location")));
});

test("validateLearningRecord accepts gate_location under tests/", () => {
  const record = buildLearningRecord({
    lesson: "example",
    evidenceSummary: "x",
    gateLocation: "tests/my-test.test.mjs",
  });
  const errors = validateLearningRecord(record);
  assert.ok(!errors.some((e) => e.includes("gate_location")));
});

test("validateLearningRecord accepts gate_location under .github/", () => {
  const record = buildLearningRecord({
    lesson: "example",
    evidenceSummary: "x",
    gateLocation: ".github/workflows/ci.yml",
  });
  const errors = validateLearningRecord(record);
  assert.ok(!errors.some((e) => e.includes("gate_location")));
});

test("validateLearningRecord rejects missing required fields", () => {
  const record = {
    id: "LRN-001",
    lesson: "",
    correction_signal_id: "",
    observation_date: "",
    promotion_date: "",
    evidence_summary: "",
    gate_added: "",
    gate_location: "",
  };
  const errors = validateLearningRecord(record);
  assert.ok(errors.length > 0, "should have validation errors");
});

test("CLI: promote-learning prints JSON to stdout", () => {
  const r = run("promote-learning.mjs", [
    "--lesson", "no empty blocks",
    "--evidence-summary", "found in 2 audits",
    "--correction-signal-id", "docs/adr/ADR-026.md",
    "--gate-added", "new check",
    "--gate-location", "scripts/check-style.mjs",
  ]);
  assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
  const record = JSON.parse(r.stdout);
  assert.strictEqual(record.lesson, "no empty blocks");
  assert.strictEqual(record.evidence_summary, "found in 2 audits");
  for (const field of REQUIRED_FIELDS) {
    assert.ok(record[field] !== undefined);
  }
});

test("CLI: promote-learning fails without lesson", () => {
  const r = run("promote-learning.mjs", [
    "--evidence-summary", "x",
  ]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /missing required option 'lesson'/);
});

test("CLI: promote-learning fails without evidence-summary", () => {
  const r = run("promote-learning.mjs", [
    "--lesson", "example",
  ]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /missing required option 'evidenceSummary'/);
});

test("CLI: promote-learning fails with invalid gate-location", () => {
  const r = run("promote-learning.mjs", [
    "--lesson", "example",
    "--evidence-summary", "x",
    "--correction-signal-id", "docs/adr/ADR-026.md",
    "--gate-added", "y",
    "--gate-location", "docs/bad-location.md",
  ]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /validation errors/);
  assert.match(r.stderr, /gate_location/);
});

test("CLI: promote-learning accepts all options and outputs valid JSON", () => {
  const r = run("promote-learning.mjs", [
    "--id", "LRN-CUSTOM",
    "--lesson", "important rule",
    "--evidence-summary", "comprehensive evidence",
    "--correction-signal-id", "docs/adr/ADR-026.md",
    "--observation-date", "2026-06-20",
    "--promotion-date", "2026-07-01",
    "--gate-added", "new safety gate",
    "--gate-location", "tests/security.test.mjs",
  ]);
  assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
  const record = JSON.parse(r.stdout);
  assert.strictEqual(record.id, "LRN-CUSTOM");
  assert.strictEqual(record.lesson, "important rule");
  assert.strictEqual(record.evidence_summary, "comprehensive evidence");
  assert.strictEqual(record.correction_signal_id, "docs/adr/ADR-026.md");
  assert.strictEqual(record.observation_date, "2026-06-20");
  assert.strictEqual(record.promotion_date, "2026-07-01");
  assert.strictEqual(record.gate_added, "new safety gate");
  assert.strictEqual(record.gate_location, "tests/security.test.mjs");
});
