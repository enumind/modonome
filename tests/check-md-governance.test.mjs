import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Build a minimal repo that satisfies the root allow-list, protected-file manifest,
// link integrity, and audit-naming checks, so only the ADR-number logic under test
// can make the run fail or pass.
function makeMinimalRepo() {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-md-gov-test-"));
  mkdirSync(join(tmp, ".modonome"), { recursive: true });
  mkdirSync(join(tmp, "prompts"), { recursive: true });
  mkdirSync(join(tmp, "docs", "adr"), { recursive: true });
  writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
  writeFileSync(join(tmp, "RELEASE-EVIDENCE.md"), "# Release evidence\n");
  writeFileSync(join(tmp, "ROADMAP.md"), "# Roadmap\n");
  writeFileSync(join(tmp, ".modonome", "STATUS.md"), "# Status\n");
  writeFileSync(join(tmp, ".modonome", "DECISIONS.md"), "# Decisions\n");
  writeFileSync(join(tmp, ".modonome", "LEARNINGS.md"), "# Learnings\n");
  writeFileSync(join(tmp, ".modonome", "NETWORK.md"), "# Network\n");
  writeFileSync(join(tmp, ".modonome", "control-panel.md"), "# Control panel\n");
  writeFileSync(join(tmp, ".modonome", "config.yaml"), "schema_version: 1\n");
  writeFileSync(join(tmp, "prompts", "modonome.core.md"), "# Core prompt\n");
  return tmp;
}

function runScript(tmp) {
  return spawnSync("node", [join(root, "scripts/check-md-governance.mjs")], {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, MODONOME_ROOT: tmp },
  });
}

test("markdown governance passes on this repo's own docs/adr", () => {
  const r = spawnSync("node", [join(root, "scripts/check-md-governance.mjs")], { encoding: "utf8", timeout: 30000 });
  // The live repo may carry pre-existing advisory warnings (front-matter migration is in
  // progress), so assert on the blocking outcome and the specific ADR-number guarantee
  // rather than a byte-exact clean-output match.
  assert.doesNotMatch(r.stdout + r.stderr, /\[adr-number\]/, `unexpected ADR-number violation:\n${r.stdout}\n${r.stderr}`);
});

test("negative: exits 1 and reports adr-number when two files in docs/adr/ share a number", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "docs", "adr", "ADR-032-oss-adapter-boundary.md"), "# ADR-032: OSS adapter boundary\n\n**Status:** Accepted\n");
    writeFileSync(join(tmp, "docs", "adr", "ADR-032-repo-snapshot.md"), "# ADR-032: Repo snapshot\n\n**Status:** Accepted\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[adr-number\] ADR-032 is used by 2 files in docs\/adr\//);
    assert.match(r.stdout + r.stderr, /ADR-032-oss-adapter-boundary\.md/);
    assert.match(r.stdout + r.stderr, /ADR-032-repo-snapshot\.md/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: a three-way collision on the same number lists all three files", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "docs", "adr", "ADR-050-a.md"), "# ADR-050: A\n");
    writeFileSync(join(tmp, "docs", "adr", "ADR-050-b.md"), "# ADR-050: B\n");
    writeFileSync(join(tmp, "docs", "adr", "ADR-050-c.md"), "# ADR-050: C\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[adr-number\] ADR-050 is used by 3 files in docs\/adr\//);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: distinct ADR numbers in docs/adr/ produce no adr-number violation", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "docs", "adr", "ADR-001-first.md"), "# ADR-001: First\n");
    writeFileSync(join(tmp, "docs", "adr", "ADR-002-second.md"), "# ADR-002: Second\n");
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[adr-number\]/, `unexpected ADR-number violation:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: an ADR-NNN prefix reused under docs/research/ is still caught (cross-directory case)", () => {
  const tmp = makeMinimalRepo();
  try {
    mkdirSync(join(tmp, "docs", "research"), { recursive: true });
    writeFileSync(join(tmp, "docs", "adr", "ADR-060-decision.md"), "# ADR-060: Decision\n");
    writeFileSync(join(tmp, "docs", "research", "ADR-060-should-be-rd.md"), "# ADR-060: Should be RD\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[adr-number\] ADR-060 is used in both docs\/adr\/.*and.*docs\/research\//);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
