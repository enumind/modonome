import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { validate } from "../scripts/lib/jsonschema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ---------------------------------------------------------------------------
// Helpers for negative-test temp repos
// ---------------------------------------------------------------------------

// A minimal ci.yml that satisfies every needle the script checks.
const VALID_CI_YML = `name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/check-drift.mjs
      - run: node scripts/check-style.mjs .
      - run: node --test tests/*.test.mjs
      - run: node scripts/check-repo-hygiene.mjs
      - run: node scripts/guard-ratchet.mjs
      - run: node agentproof/runner.mjs
      - run: node scripts/check-learning-traceability.mjs
      - run: node scripts/check-promotion-readiness.mjs
      - run: node scripts/check-work-items.mjs
      - run: node scripts/check-checker-engagement.mjs
      - run: node scripts/check-licenses.mjs
      - run: node scripts/test-prompt-behavior.mjs
      - run: node scripts/check-md-governance.mjs
      - run: node scripts/check-architecture-drift.mjs
      - run: node scripts/check-self-application.mjs
      - run: node scripts/snapshot.mjs . --check
      - run: git checkout "origin/\${{ github.base_ref }}" -- scripts/guard-ratchet.mjs
      - run: git checkout "origin/\${{ github.base_ref }}" -- scripts/check-style.mjs
      - run: git checkout "origin/\${{ github.base_ref }}" -- scripts/check-repo-hygiene.mjs
      - run: git checkout "origin/\${{ github.base_ref }}" -- scripts/lib/branch-name.mjs
      - run: git checkout "origin/\${{ github.base_ref }}" -- scripts/lib/commit-identity.mjs
      - run: git checkout "origin/\${{ github.base_ref }}" -- scripts/lib/detect-attribution.mjs
`;

// A minimal safe template config.yaml.
const VALID_TEMPLATE_CONFIG = `schema_version: 1
autonomy_enabled: false
dry_run: true
auto_merge: false
max_merges_per_day: 0
repo_network_enabled: false
share_raw_code_across_repos: false
`;

// A minimal live config.yaml with no protected_paths_extra (matching CODEOWNERS below).
// snapshot.ci_mode: fail satisfies section 6 (snapshot dogfooding, ADR-033).
const VALID_LIVE_CONFIG = `schema_version: 1
autonomy_enabled: false
dry_run: true
auto_merge: false
protected_paths_extra: []
snapshot:
  ci_mode: fail
`;

// CODEOWNERS with no paths that require protected_paths_extra entries.
const VALID_CODEOWNERS = `* @owner\n`;

// Minimal AGENTS.md that points agents at the snapshot map (section 6 requirement).
const VALID_AGENTS_MD = `# Agents\n\nRead .modonome/snapshot/map.md before reading source.\n`;

// Minimal install-hooks.mjs that mentions snapshot.mjs (section 6 requirement); this
// fixture file is never executed, only grepped for the substring.
const VALID_INSTALL_HOOKS = `// pre-commit hook regenerates the snapshot: node scripts/snapshot.mjs .\n`;

// Minimal metrics schema (same as the real one).
const METRICS_SCHEMA = JSON.stringify(JSON.parse(readFileSync(join(root, "schemas/metrics.schema.json"), "utf8")));

// Build a minimal passing temp repo and return the path. Caller must rmSync(tmp, {recursive:true}).
function makeMinimalRepo() {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-test-"));
  mkdirSync(join(tmp, ".github", "workflows"), { recursive: true });
  mkdirSync(join(tmp, "templates", ".modonome"), { recursive: true });
  mkdirSync(join(tmp, ".modonome", "snapshot"), { recursive: true });
  mkdirSync(join(tmp, "schemas"), { recursive: true });
  mkdirSync(join(tmp, "scripts"), { recursive: true });
  writeFileSync(join(tmp, ".github", "workflows", "ci.yml"), VALID_CI_YML);
  writeFileSync(join(tmp, "templates", ".modonome", "config.yaml"), VALID_TEMPLATE_CONFIG);
  writeFileSync(join(tmp, ".modonome", "config.yaml"), VALID_LIVE_CONFIG);
  writeFileSync(join(tmp, ".modonome", "snapshot", "signature.json"), JSON.stringify({ merkle_root: "sha256:0" }));
  writeFileSync(join(tmp, ".github", "CODEOWNERS"), VALID_CODEOWNERS);
  writeFileSync(join(tmp, "schemas", "metrics.schema.json"), METRICS_SCHEMA);
  writeFileSync(join(tmp, "AGENTS.md"), VALID_AGENTS_MD);
  writeFileSync(join(tmp, "scripts", "install-hooks.mjs"), VALID_INSTALL_HOOKS);
  return tmp;
}

function runScript(tmp) {
  return spawnSync(
    "node",
    [join(root, "scripts/check-self-application.mjs")],
    { encoding: "utf8", timeout: 30000, env: { ...process.env, MODONOME_ROOT: tmp } }
  );
}

test("self-application conformance passes on this repo", () => {
  const r = spawnSync("node", [join(root, "scripts/check-self-application.mjs")], { encoding: "utf8", timeout: 30000 });
  assert.strictEqual(r.status, 0, `check-self-application.mjs exited ${r.status}:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /PASS: every repo-local self-governance invariant holds/);
});

test("shipped metrics example conforms to the metrics schema", () => {
  const schema = JSON.parse(readFileSync(join(root, "schemas/metrics.schema.json"), "utf8"));
  const text = readFileSync(join(root, ".modonome/metrics.example.jsonl"), "utf8");
  const lines = text.split("\n").filter((l) => l.trim());
  assert.ok(lines.length > 0, "example file should have at least one event");
  for (const [i, line] of lines.entries()) {
    const errs = validate(schema, JSON.parse(line));
    assert.deepStrictEqual(errs, [], `line ${i + 1} violates the metrics schema: ${errs.join("; ")}`);
  }
});

test("the metrics schema check has teeth (rejects the old malformed shape)", () => {
  const schema = JSON.parse(readFileSync(join(root, "schemas/metrics.schema.json"), "utf8"));
  // The shape that used to ship: "type" instead of "event", no schema_version.
  const bad = { ts: "2026-06-16T09:12:03Z", type: "item_created", id: "item-001" };
  const errs = validate(schema, bad);
  assert.ok(errs.length > 0, "malformed metrics line should fail schema validation");
});

// ---------------------------------------------------------------------------
// Negative tests: each builds a temp repo with exactly one bad state.
// ---------------------------------------------------------------------------

test("negative: exits 1 when ci.yml is missing a required gate needle", () => {
  const tmp = makeMinimalRepo();
  try {
    // Remove the agentproof needle from ci.yml so the check fires.
    const badCI = VALID_CI_YML.replace("node agentproof/runner.mjs\n", "");
    writeFileSync(join(tmp, ".github", "workflows", "ci.yml"), badCI);
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: exits 1 when a detector is not loaded from the base branch (trust-isolation kernel)", () => {
  const tmp = makeMinimalRepo();
  try {
    // Drop the detect-attribution base-pin line: the attribution detector would then
    // run from the PR's own copy, which is exactly the self-weakening this guards.
    const badCI = VALID_CI_YML.replace(
      '      - run: git checkout "origin/${{ github.base_ref }}" -- scripts/lib/detect-attribution.mjs\n',
      "",
    );
    writeFileSync(join(tmp, ".github", "workflows", "ci.yml"), badCI);
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /detect-attribution\.mjs from the base branch/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: exits 1 when template config has an unsafe default (auto_merge: true)", () => {
  const tmp = makeMinimalRepo();
  try {
    const badConfig = VALID_TEMPLATE_CONFIG.replace("auto_merge: false", "auto_merge: true");
    writeFileSync(join(tmp, "templates", ".modonome", "config.yaml"), badConfig);
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: exits 1 when .modonome/metrics.jsonl is committed", () => {
  const tmp = makeMinimalRepo();
  try {
    // A valid metrics line so schema validation does not add a second error.
    const validLine = JSON.stringify({ schema_version: 1, ts: "2026-01-01T00:00:00Z", event: "item_created" });
    writeFileSync(join(tmp, ".modonome", "metrics.jsonl"), validLine + "\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: exits 1 when CODEOWNERS and protected_paths_extra disagree", () => {
  const tmp = makeMinimalRepo();
  try {
    // CODEOWNERS protects /scripts/ but live config does not list it.
    const badOwners = `* @owner\n/scripts/ @owner\n`;
    writeFileSync(join(tmp, ".github", "CODEOWNERS"), badOwners);
    // protected_paths_extra stays empty (from VALID_LIVE_CONFIG).
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /CODEOWNERS protects "scripts\/" but protected_paths_extra does not list it/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Badge consistency: README.md's hand-typed AgentProof score must match the
// runner's own computed score. A lightweight stub runner keeps this test fast
// and isolated from the real 35-scenario suite.
// ---------------------------------------------------------------------------

function withStubRunner(tmp, score, extendedScore, totalScore) {
  mkdirSync(join(tmp, "agentproof"), { recursive: true });
  const json = JSON.stringify({ score, extended_score: extendedScore, total_score: totalScore });
  writeFileSync(join(tmp, "agentproof", "runner.mjs"), `console.log(${JSON.stringify(json)});\n`);
}

test("negative: exits 1 when README.md's badge does not match the runner's computed score", () => {
  const tmp = makeMinimalRepo();
  try {
    withStubRunner(tmp, "25/25");
    writeFileSync(join(tmp, "README.md"), "Score: 20/20 HARDENED\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /README\.md does not contain the current AgentProof score "25\/25"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: passes when README.md's badge matches the runner's computed score", () => {
  const tmp = makeMinimalRepo();
  try {
    withStubRunner(tmp, "25/25");
    writeFileSync(join(tmp, "README.md"), "Score: 25/25 HARDENED\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 0, `expected exit 0 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: exits 1 when agentproof/SPEC.md's extended/total count is stale, even though the normative score still matches", () => {
  // Regression test: the normative score alone is nearly invariant by design (ADR-027
  // fixes it at 25/25), so a check that only compares `score` can never catch the
  // scenario-count drift it exists to catch. This reproduces exactly that: the
  // normative score matches, but the extended/total counts do not.
  const tmp = makeMinimalRepo();
  try {
    withStubRunner(tmp, "25/25", "10/10", "35/35");
    writeFileSync(join(tmp, "README.md"), "Score: 25/25 HARDENED\n");
    mkdirSync(join(tmp, "agentproof"), { recursive: true });
    writeFileSync(join(tmp, "agentproof", "README.md"), "Score: 25/25 normative | 9/9 extended (34/34 total)\n");
    writeFileSync(join(tmp, "agentproof", "SPEC.md"), "Score: 25/25 normative | 9/9 extended (34/34 total)\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /agentproof\/README\.md does not contain the current AgentProof score "10\/10"/);
    assert.match(r.stdout + r.stderr, /agentproof\/SPEC\.md does not contain the current AgentProof score "35\/35"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: passes when README.md, agentproof/README.md, and agentproof/SPEC.md all agree with the runner", () => {
  const tmp = makeMinimalRepo();
  try {
    withStubRunner(tmp, "25/25", "10/10", "35/35");
    writeFileSync(join(tmp, "README.md"), "Score: 25/25 HARDENED\n");
    mkdirSync(join(tmp, "agentproof"), { recursive: true });
    writeFileSync(join(tmp, "agentproof", "README.md"), "Score: 25/25 normative | 10/10 extended (35/35 total)\n");
    writeFileSync(join(tmp, "agentproof", "SPEC.md"), "Score: 25/25 normative | 10/10 extended (35/35 total)\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 0, `expected exit 0 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: a fixture with no agentproof/ directory skips the badge check entirely", () => {
  const tmp = makeMinimalRepo();
  try {
    // No agentproof/runner.mjs; badge consistency is not applicable to this fixture.
    const r = runScript(tmp);
    assert.strictEqual(r.status, 0, `expected exit 0 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
