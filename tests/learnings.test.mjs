import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { readPromotedLearnings, REQUIRED_FIELDS } from "../scripts/lib/learnings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function run(script, args = [], env = {}) {
  return spawnSync("node", [join(root, "scripts", script), ...args], {
    encoding: "utf8", timeout: 30000, env: { ...process.env, ...env },
  });
}

test("every promoted learning carries all required traceability fields", () => {
  const learnings = readPromotedLearnings(root);
  assert.ok(learnings.length > 0, "expected at least one promoted learning");
  for (const l of learnings) {
    for (const f of REQUIRED_FIELDS) {
      assert.ok(l[f] !== undefined && String(l[f]).trim() !== "", `${l.id || "?"} missing field ${f}`);
    }
  }
});

test("learning traceability gate passes on this repo", () => {
  const r = run("check-learning-traceability.mjs");
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /all fully traceable/);
});

test("learning traceability gate has teeth (staging window enforced)", () => {
  // Our bootstrap learnings are staged 0 days; requiring 5 must fail.
  const r = run("check-learning-traceability.mjs", [], { MODONOME_MIN_STAGE_DAYS: "5" });
  assert.strictEqual(r.status, 1, "expected failure when MIN_STAGE_DAYS exceeds actual staging");
  assert.match(r.stderr, /below MODONOME_MIN_STAGE_DAYS/);
});

test("capability promotion readiness passes (no capability default-on)", () => {
  const r = run("check-promotion-readiness.mjs");
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /no capability ships default-on/);
});

test("audit-learnings lists chains and fails an unknown query", () => {
  const all = run("audit-learnings.mjs");
  assert.strictEqual(all.status, 0);
  assert.match(all.stdout, /L-001/);
  assert.match(all.stdout, /signal -> observation -> learning -> gate/);

  const miss = run("audit-learnings.mjs", ["no-such-rule-xyz"]);
  assert.strictEqual(miss.status, 1);
});

// NEGATIVE test. A temp root with repo_network_enabled: true in the template
// config but no promotion ADR must cause the gate to exit 1.
test("promotion readiness gate fails when capability is default-on without an ADR", () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), "modonome-promo-neg-"));
  mkdirSync(join(tmpRoot, "templates", ".modonome"), { recursive: true });
  mkdirSync(join(tmpRoot, ".modonome"), { recursive: true });
  mkdirSync(join(tmpRoot, "docs", "adr"), { recursive: true });
  writeFileSync(
    join(tmpRoot, "templates", ".modonome", "config.yaml"),
    "repo_network_enabled: true\n",
  );
  writeFileSync(join(tmpRoot, ".modonome", "config.yaml"), "");
  const r = spawnSync(
    "node",
    [join(root, "scripts", "check-promotion-readiness.mjs"), "--root", tmpRoot],
    { encoding: "utf8", timeout: 30000, env: process.env },
  );
  assert.strictEqual(r.status, 1, `expected exit 1; got ${r.status}\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /promotion problem/);
});

// POSITIVE test. Adding a promotion ADR with all required headings satisfies the gate.
test("promotion readiness gate passes when a valid promotion ADR exists", () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), "modonome-promo-pos-"));
  mkdirSync(join(tmpRoot, "templates", ".modonome"), { recursive: true });
  mkdirSync(join(tmpRoot, ".modonome"), { recursive: true });
  mkdirSync(join(tmpRoot, "docs", "adr"), { recursive: true });
  writeFileSync(
    join(tmpRoot, "templates", ".modonome", "config.yaml"),
    "repo_network_enabled: true\n",
  );
  writeFileSync(join(tmpRoot, ".modonome", "config.yaml"), "");
  // Promotion ADR must include the flag name and all required section headings.
  const adrBody = [
    "# ADR-TEST: repo_network_enabled Promotion",
    "",
    "## Promotion",
    "This ADR promotes repo_network_enabled to default-on.",
    "",
    "## Observation Window",
    "Observed over 30 days with no incidents.",
    "",
    "## Evidence",
    "Zero security events across 500 runs.",
    "",
    "## Rollback",
    "Set repo_network_enabled: false in config.",
  ].join("\n");
  writeFileSync(join(tmpRoot, "docs", "adr", "ADR-test-promotion.md"), adrBody);
  const r = spawnSync(
    "node",
    [join(root, "scripts", "check-promotion-readiness.mjs"), "--root", tmpRoot],
    { encoding: "utf8", timeout: 30000, env: process.env },
  );
  assert.strictEqual(r.status, 0, `expected exit 0; got ${r.status}\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /no capability ships default-on/);
});
