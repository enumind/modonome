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

// A git-init'd variant of makeMinimalRepo(), for the staleness check, which shells out
// to `git log` and needs a real repository to query.
function makeMinimalGitRepo() {
  const tmp = makeMinimalRepo();
  spawnSync("git", ["init", "-q"], { cwd: tmp });
  spawnSync("git", ["config", "user.email", "test@test.com"], { cwd: tmp });
  spawnSync("git", ["config", "user.name", "test"], { cwd: tmp });
  spawnSync("git", ["add", "-A"], { cwd: tmp });
  spawnSync("git", ["commit", "-q", "-m", "initial"], { cwd: tmp });
  return tmp;
}

function gitCommit(tmp, message) {
  spawnSync("git", ["add", "-A"], { cwd: tmp });
  spawnSync("git", ["commit", "-q", "-m", message], { cwd: tmp });
}

// Commit with an explicit, backdated timestamp, so staleness tests do not depend on
// same-day wall-clock ordering between setup commits and a `last_reviewed` stamp (git's
// `--since` treats a bare date as "since now" when it equals today; see commitsSince()).
function gitCommitAt(tmp, message, isoDate) {
  spawnSync("git", ["add", "-A"], { cwd: tmp });
  spawnSync("git", ["commit", "-q", "-m", message], {
    cwd: tmp,
    env: { ...process.env, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate },
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

// ---------------------------------------------------------------------------
// Staleness gate (docs/compliance/, docs/audits/ only).
// ---------------------------------------------------------------------------

test("negative: a docs/compliance/ file with no front-matter is blocking", () => {
  const tmp = makeMinimalRepo();
  try {
    mkdirSync(join(tmp, "docs", "compliance"), { recursive: true });
    writeFileSync(join(tmp, "docs", "compliance", "some-claim.md"), "# Some claim\n\nNo front-matter here.\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[staleness\] docs\/compliance\/some-claim\.md is missing 'last_reviewed'/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: a docs/audits/ file with a malformed last_reviewed date is blocking", () => {
  const tmp = makeMinimalRepo();
  try {
    mkdirSync(join(tmp, "docs", "audits"), { recursive: true });
    writeFileSync(
      join(tmp, "docs", "audits", "some-audit-2026-07-01.md"),
      "---\nstatus: active\nowner: \"@test\"\nlast_reviewed: not-a-date\n---\n\n# Some audit\n"
    );
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[staleness\].*last_reviewed "not-a-date" is not a YYYY-MM-DD date/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: many commits touching a cited path since last_reviewed trips the staleness threshold", () => {
  const tmp = makeMinimalGitRepo();
  try {
    mkdirSync(join(tmp, "docs", "compliance"), { recursive: true });
    mkdirSync(join(tmp, "scripts"), { recursive: true });
    writeFileSync(join(tmp, "scripts", "cited.mjs"), "// v0\n");
    writeFileSync(
      join(tmp, "docs", "compliance", "old-claim.md"),
      "---\nstatus: active\nowner: \"@test\"\nlast_reviewed: 2020-01-01\n---\n\n# Old claim\n\nCites `scripts/cited.mjs`.\n"
    );
    gitCommit(tmp, "add old claim");
    for (let i = 1; i <= 16; i++) {
      writeFileSync(join(tmp, "scripts", "cited.mjs"), `// v${i}\n`);
      gitCommit(tmp, `touch ${i}`);
    }
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[staleness\] docs\/compliance\/old-claim\.md: last_reviewed is 2020-01-01, but \d+ commits/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: a recently-reviewed docs/compliance/ file with the same cited path does not trip staleness", () => {
  // All setup activity is backdated to before last_reviewed, and nothing happens after
  // it, so this does not depend on same-day wall-clock ordering (see gitCommitAt).
  const tmp = makeMinimalGitRepo();
  try {
    mkdirSync(join(tmp, "docs", "compliance"), { recursive: true });
    mkdirSync(join(tmp, "scripts"), { recursive: true });
    writeFileSync(join(tmp, "scripts", "cited.mjs"), "// v0\n");
    gitCommitAt(tmp, "add cited script", "2020-01-01T00:00:00");
    for (let i = 1; i <= 16; i++) {
      writeFileSync(join(tmp, "scripts", "cited.mjs"), `// v${i}\n`);
      gitCommitAt(tmp, `touch ${i}`, "2020-01-01T00:00:00");
    }
    writeFileSync(
      join(tmp, "docs", "compliance", "fresh-claim.md"),
      "---\nstatus: active\nowner: \"@test\"\nlast_reviewed: 2020-01-02\n---\n\n# Fresh claim\n\nCites `scripts/cited.mjs`.\n"
    );
    gitCommitAt(tmp, "add fresh claim, reviewed the day after all setup activity", "2020-01-02T00:00:00");
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[staleness\]/, `unexpected staleness violation:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: a docs/audits/ file is exempt from the commit-threshold check, unlike docs/compliance/", () => {
  // Same setup as the compliance negative test above (16 commits touching the cited
  // path after last_reviewed), but under docs/audits/: must NOT trip staleness, because
  // audits are point-in-time snapshots exempted from the commit-threshold check.
  const tmp = makeMinimalGitRepo();
  try {
    mkdirSync(join(tmp, "docs", "audits"), { recursive: true });
    mkdirSync(join(tmp, "scripts"), { recursive: true });
    writeFileSync(join(tmp, "scripts", "cited.mjs"), "// v0\n");
    writeFileSync(
      join(tmp, "docs", "audits", "some-audit-2020-01-01.md"),
      "---\nstatus: active\nowner: \"@test\"\nlast_reviewed: 2020-01-01\n---\n\n# Some audit\n\nCites `scripts/cited.mjs`.\n"
    );
    gitCommit(tmp, "add cited script and audit");
    for (let i = 1; i <= 16; i++) {
      writeFileSync(join(tmp, "scripts", "cited.mjs"), `// v${i}\n`);
      gitCommit(tmp, `touch ${i}`);
    }
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[staleness\]/, `unexpected staleness violation:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: a superseded doc is exempt from the staleness threshold", () => {
  const tmp = makeMinimalGitRepo();
  try {
    mkdirSync(join(tmp, "docs", "audits"), { recursive: true });
    mkdirSync(join(tmp, "scripts"), { recursive: true });
    writeFileSync(join(tmp, "scripts", "cited.mjs"), "// v0\n");
    writeFileSync(
      join(tmp, "docs", "audits", "old-audit-2020-01-01.md"),
      "---\nstatus: superseded\nowner: \"@test\"\nlast_reviewed: 2020-01-01\n---\n\n# Old audit\n\nCites `scripts/cited.mjs`.\n"
    );
    gitCommit(tmp, "add superseded audit");
    for (let i = 1; i <= 16; i++) {
      writeFileSync(join(tmp, "scripts", "cited.mjs"), `// v${i}\n`);
      gitCommit(tmp, `touch ${i}`);
    }
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[staleness\]/, `unexpected staleness violation:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
