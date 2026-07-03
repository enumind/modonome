import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { parseDecisions, hasEligibleApproval } from "../scripts/check-decisions-authority.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SCRIPT = join(root, "scripts", "check-decisions-authority.mjs");
const MOCK_SERVER = join(here, "helpers", "mock-github-reviews-server.mjs");

const RESOLVED_ENTRY = (id) => `- id: ${id}\n  question: q?\n  decision: d.\n  resolved: 2026-06-24\n`;
const decisions = (body) => `# Decisions\n\n## Resolved\n\n${body}\n## Open\n`;

// ---------------------------------------------------------------------------
// 1 + 2: structural parsing (pure function, no process spawn needed)
// ---------------------------------------------------------------------------

test("parseDecisions rejects an unauthorized H2 heading", () => {
  const text = decisions(RESOLVED_ENTRY("a")) + "\n## Administrative Exception\n- **Status:** APPROVED BY OWNER\n";
  const { violations } = parseDecisions(text);
  assert.ok(violations.some((v) => v.includes("is not permitted")), violations.join("\n"));
});

test("parseDecisions flags a Resolved entry missing required keys", () => {
  const text = decisions("- id: incomplete\n  question: q?\n"); // no decision, no resolved
  const { violations } = parseDecisions(text);
  assert.ok(violations.some((v) => v.includes("missing required key")), violations.join("\n"));
});

test("parseDecisions is clean on a well-formed Resolved entry", () => {
  const text = decisions(RESOLVED_ENTRY("fine"));
  const { violations, resolvedEntries } = parseDecisions(text);
  assert.deepEqual(violations, []);
  assert.equal(resolvedEntries.length, 1);
  assert.equal(resolvedEntries[0].id, "fine");
});

// ---------------------------------------------------------------------------
// 3: provenance decision logic (pure function; git-author trust removed)
// ---------------------------------------------------------------------------

test("hasEligibleApproval: true when a codeowner other than the author approved", () => {
  const reviews = [{ user: { login: "owner1" }, state: "APPROVED" }];
  assert.equal(hasEligibleApproval(reviews, "some-agent", new Set(["owner1"])), true);
});

test("hasEligibleApproval: false on self-approval, even by a codeowner", () => {
  const reviews = [{ user: { login: "nateshpp" }, state: "APPROVED" }];
  assert.equal(hasEligibleApproval(reviews, "nateshpp", new Set(["nateshpp"])), false);
});

test("hasEligibleApproval: false when the approver is not CODEOWNERS-listed", () => {
  const reviews = [{ user: { login: "randomcontributor" }, state: "APPROVED" }];
  assert.equal(hasEligibleApproval(reviews, "some-agent", new Set(["owner1"])), false);
});

test("hasEligibleApproval: false with no reviews at all", () => {
  assert.equal(hasEligibleApproval([], "some-agent", new Set(["owner1"])), false);
});

test("hasEligibleApproval: only the latest review per login counts (revoked approval)", () => {
  const reviews = [
    { user: { login: "owner1" }, state: "APPROVED" },
    { user: { login: "owner1" }, state: "CHANGES_REQUESTED" },
  ];
  assert.equal(hasEligibleApproval(reviews, "some-agent", new Set(["owner1"])), false);
});

// ---------------------------------------------------------------------------
// CLI integration: structural checks need no git repo at all.
// ---------------------------------------------------------------------------

function runGate(dir, args = []) {
  return spawnSync("node", [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, MODONOME_ROOT: dir } });
}

function plainDecisionsDir(content) {
  const dir = mkdtempSync(join(tmpdir(), "decisions-authority-"));
  mkdirSync(join(dir, ".modonome"), { recursive: true });
  writeFileSync(join(dir, ".modonome", "DECISIONS.md"), content);
  return dir;
}

test("passes on this repo's own .modonome/DECISIONS.md", () => {
  const r = spawnSync("node", [SCRIPT], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, `expected pass on the real repo:\n${r.stdout}\n${r.stderr}`);
});

test("CLI: rejects an unauthorized H2 heading outside Resolved/Open", () => {
  const dir = plainDecisionsDir(
    decisions(RESOLVED_ENTRY("a")) + "\n## Administrative Exception\n- **Status:** APPROVED BY OWNER\n"
  );
  try {
    const r = runGate(dir);
    assert.equal(r.status, 1, `expected rejection:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /is not permitted/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: rejects a Resolved entry missing a required key", () => {
  const dir = plainDecisionsDir(decisions("- id: incomplete\n  question: q?\n"));
  try {
    const r = runGate(dir);
    assert.equal(r.status, 1, `expected rejection:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /missing required key/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// CLI integration: new-entry provenance, against a real git history and a
// mock GitHub API server (no real network egress).
// ---------------------------------------------------------------------------

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r;
}

// A repo with one commit (base: entry "a" only) and a second commit that adds
// a new Resolved entry "b" on top. Returns { dir, baseSha }.
function repoWithNewEntry() {
  const dir = mkdtempSync(join(tmpdir(), "decisions-authority-git-"));
  git(["init", "-q"], dir);
  git(["config", "user.email", "t@e.com"], dir);
  git(["config", "user.name", "t"], dir);
  mkdirSync(join(dir, ".github"), { recursive: true });
  mkdirSync(join(dir, ".modonome"), { recursive: true });
  writeFileSync(join(dir, ".github", "CODEOWNERS"), "* @owner1\n");
  writeFileSync(join(dir, ".modonome", "DECISIONS.md"), decisions(RESOLVED_ENTRY("a")));
  git(["add", "-A"], dir);
  git(["commit", "-qm", "base"], dir);
  const baseSha = git(["rev-parse", "HEAD"], dir).stdout.trim();

  writeFileSync(join(dir, ".modonome", "DECISIONS.md"), decisions(RESOLVED_ENTRY("a") + RESOLVED_ENTRY("b")));
  git(["add", "-A"], dir);
  git(["commit", "-qm", "add b"], dir);

  return { dir, baseSha };
}

// The mock server has to run as its own OS process: the CLI-under-test is
// driven via spawnSync, which blocks this test's event loop for the duration
// of the child. An in-process HTTP server can't accept or answer a request
// during that window, so it has to live somewhere spawnSync can't freeze.
function startMockReviewServer(reviews) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [MOCK_SERVER, JSON.stringify(reviews)], { stdio: ["ignore", "pipe", "inherit"] });
    let buf = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      const m = buf.match(/READY (\d+)/);
      if (m) resolve({ url: `http://127.0.0.1:${m[1]}`, close: () => child.kill() });
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`mock review server exited ${code}`));
    });
  });
}

function runGateWithPRContext(dir, baseSha, { apiBase, reviews, prAuthor = "some-agent" }) {
  return spawnSync("node", [SCRIPT, baseSha], {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      MODONOME_ROOT: dir,
      GITHUB_REPOSITORY: "enumind/modonome",
      GITHUB_TOKEN: "fake-token-for-test",
      MODONOME_PR_NUMBER: "1",
      MODONOME_PR_AUTHOR: prAuthor,
      MODONOME_GITHUB_API_BASE: apiBase,
    },
  });
}

test("CLI: a malformed PR number (not a bare integer) is treated as no PR context", async () => {
  // GITHUB_EVENT_PATH is GitHub-Actions-written, but it's still file input, not
  // a hardcoded value; a PR number that doesn't look like one must not flow
  // into the reviews API URL.
  const { dir, baseSha } = repoWithNewEntry();
  const mock = await startMockReviewServer([{ user: { login: "owner1" }, state: "APPROVED" }]);
  try {
    const r = spawnSync("node", [SCRIPT, baseSha], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        MODONOME_ROOT: dir,
        GITHUB_REPOSITORY: "enumind/modonome",
        GITHUB_TOKEN: "fake-token-for-test",
        MODONOME_PR_NUMBER: "1/../reviews",
        MODONOME_PR_AUTHOR: "some-agent",
        MODONOME_GITHUB_API_BASE: mock.url,
      },
    });
    assert.equal(r.status, 1, `expected rejection:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /no PR context/);
  } finally {
    await mock.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: new Resolved entry with no PR context is rejected", async () => {
  const { dir, baseSha } = repoWithNewEntry();
  try {
    const r = spawnSync("node", [SCRIPT, baseSha], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, MODONOME_ROOT: dir },
    });
    assert.equal(r.status, 1, `expected rejection:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /no PR context/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: new Resolved entry approved by a CODEOWNERS-listed reviewer (not the author) passes", async () => {
  const { dir, baseSha } = repoWithNewEntry();
  const mock = await startMockReviewServer([{ user: { login: "owner1" }, state: "APPROVED" }]);
  try {
    const r = runGateWithPRContext(dir, baseSha, { apiBase: mock.url, prAuthor: "some-agent" });
    assert.equal(r.status, 0, `expected pass:\n${r.stdout}\n${r.stderr}`);
  } finally {
    await mock.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: new Resolved entry self-approved by its own author is rejected", async () => {
  const { dir, baseSha } = repoWithNewEntry();
  const mock = await startMockReviewServer([{ user: { login: "owner1" }, state: "APPROVED" }]);
  try {
    // The PR author IS the sole approving codeowner: self-approval, must fail.
    const r = runGateWithPRContext(dir, baseSha, { apiBase: mock.url, prAuthor: "owner1" });
    assert.equal(r.status, 1, `expected rejection:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /Self-approval does not count/);
  } finally {
    await mock.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: new Resolved entry with no approving reviews is rejected", async () => {
  const { dir, baseSha } = repoWithNewEntry();
  const mock = await startMockReviewServer([]);
  try {
    const r = runGateWithPRContext(dir, baseSha, { apiBase: mock.url });
    assert.equal(r.status, 1, `expected rejection:\n${r.stdout}\n${r.stderr}`);
  } finally {
    await mock.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: no new Resolved entries skips provenance entirely, even with no PR context", () => {
  const { dir } = repoWithNewEntry();
  try {
    // Diff against HEAD itself: no new entries relative to "base" == HEAD.
    const r = spawnSync("node", [SCRIPT, "HEAD"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, MODONOME_ROOT: dir },
    });
    assert.equal(r.status, 0, `expected pass (no new entries):\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
