import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { AI_SIGNATURE_RE } from "../scripts/lib/detect-attribution.mjs";
import {
  cleanCommitMessage,
  planCommitRewrites,
  remediationFingerprint,
} from "../scripts/lib/remediate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const REMEDIATE = join(root, "scripts", "remediate.mjs");

// A co-author trailer, assembled from fragments so this test file carries no contiguous
// AI-authorship signature of its own (check-style scans tests/*.mjs).
const COAUTHOR = "Co-" + "authored-by: Pat Doe <pat@example.com>";
const FORBIDDEN_ENV = {
  GIT_AUTHOR_NAME: "Claude",
  GIT_AUTHOR_EMAIL: "agent@anthropic.com",
  GIT_COMMITTER_NAME: "Claude",
  GIT_COMMITTER_EMAIL: "agent@anthropic.com",
};

function runRemediate(args, { cwd, env = {} }) {
  return spawnSync("node", [REMEDIATE, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, MODONOME_ARMED: "", ...env },
  });
}

// Build a temp git repo whose origin/main is the base commit, then lay down a feature
// branch with one signature-in-message commit and one forbidden-identity commit.
function makePollutedRepo() {
  const dir = mkdtempSync(join(tmpdir(), "remediate-"));
  const g = (args, opts = {}) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", ...opts });
    if (r.status !== 0 && !opts.allowFail) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return (r.stdout || "").trim();
  };
  g(["init", "-q", "-b", "main"]);
  g(["config", "user.name", "Human Dev"]);
  g(["config", "user.email", "human@example.com"]);

  writeFileSync(join(dir, "a.txt"), "one\n");
  g(["add", "."]);
  g(["commit", "-q", "-m", "base commit"]);
  const base = g(["rev-parse", "HEAD"]);
  g(["update-ref", "refs/remotes/origin/main", base]);

  g(["checkout", "-q", "-b", "feature/x"]);
  writeFileSync(join(dir, "b.txt"), "two\n");
  g(["add", "."]);
  g(["commit", "-q", "-m", `add b\n\n${COAUTHOR}`]);

  writeFileSync(join(dir, "c.txt"), "three\n");
  g(["add", "."]);
  g(["commit", "-q", "-m", "add c"], { env: { ...process.env, ...FORBIDDEN_ENV } });

  return { dir, g, base };
}

function arm(dir, overrides = {}) {
  const cfg = { autonomy_enabled: true, dry_run: false, remediation_apply_enabled: true, ...overrides };
  mkdirSync(join(dir, ".modonome"), { recursive: true });
  writeFileSync(
    join(dir, ".modonome", "config.yaml"),
    `schema_version: 1\nautonomy_enabled: ${cfg.autonomy_enabled}\ndry_run: ${cfg.dry_run}\nremediation_apply_enabled: ${cfg.remediation_apply_enabled}\n`,
  );
}

// ---------------------------------------------------------------------------
// Pure library
// ---------------------------------------------------------------------------

test("cleanCommitMessage strips a signature trailer and its trailing blank line", () => {
  const cleaned = cleanCommitMessage(`add feature\n\nreal body\n\n${COAUTHOR}`);
  assert.strictEqual(cleaned, "add feature\n\nreal body");
  assert.doesNotMatch(cleaned, AI_SIGNATURE_RE);
});

test("cleanCommitMessage leaves a clean message untouched", () => {
  const msg = "fix: correct the boundary\n\nExplains the fix.";
  assert.strictEqual(cleanCommitMessage(msg), msg);
});

test("cleanCommitMessage never returns an empty message", () => {
  const cleaned = cleanCommitMessage(COAUTHOR);
  assert.notStrictEqual(cleaned.trim(), "");
});

test("planCommitRewrites flags a forbidden identity and rewrites it to the target", () => {
  const commits = [
    { sha: "aaa", an: "Claude", ae: "agent@anthropic.com", cn: "Claude", ce: "agent@anthropic.com", message: "add c" },
  ];
  const [p] = planCommitRewrites(commits, { name: "Human Dev", email: "human@example.com" });
  assert.strictEqual(p.changed, true);
  assert.ok(p.reasons.includes("forbidden-author"));
  assert.ok(p.reasons.includes("forbidden-committer"));
  assert.deepStrictEqual(p.author, { name: "Human Dev", email: "human@example.com" });
});

test("planCommitRewrites flags a signature in the message but preserves a clean identity", () => {
  const commits = [
    { sha: "bbb", an: "Human Dev", ae: "human@example.com", cn: "Human Dev", ce: "human@example.com", message: `add b\n\n${COAUTHOR}` },
  ];
  const [p] = planCommitRewrites(commits, { name: "Target", email: "target@example.com" });
  assert.strictEqual(p.changed, true);
  assert.deepStrictEqual(p.reasons, ["ai-signature-in-message"]);
  assert.deepStrictEqual(p.author, { name: "Human Dev", email: "human@example.com" });
  assert.doesNotMatch(p.newMessage, AI_SIGNATURE_RE);
});

test("planCommitRewrites leaves a clean commit unchanged", () => {
  const commits = [
    { sha: "ccc", an: "Human Dev", ae: "human@example.com", cn: "Human Dev", ce: "human@example.com", message: "plain subject" },
  ];
  const [p] = planCommitRewrites(commits, { name: "Target", email: "target@example.com" });
  assert.strictEqual(p.changed, false);
  assert.deepStrictEqual(p.reasons, []);
});

test("remediationFingerprint is deterministic and decision-sensitive", () => {
  const base = { branch: null, commits: planCommitRewrites(
    [{ sha: "x", an: "Human Dev", ae: "human@example.com", cn: "Human Dev", ce: "human@example.com", message: "clean" }],
    { name: "T", email: "t@example.com" },
  ) };
  const dirty = { branch: null, commits: planCommitRewrites(
    [{ sha: "y", an: "Claude", ae: "agent@anthropic.com", cn: "Claude", ce: "agent@anthropic.com", message: "clean" }],
    { name: "T", email: "t@example.com" },
  ) };
  assert.strictEqual(remediationFingerprint(base), remediationFingerprint(base));
  assert.notStrictEqual(remediationFingerprint(base), remediationFingerprint(dirty));
  assert.match(remediationFingerprint(base), /^sha256:[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------
// Applier (end-to-end against a temp git repo)
// ---------------------------------------------------------------------------

test("apply rewrites metadata, keeps every tree SHA, and is idempotent", () => {
  const { dir, g } = makePollutedRepo();
  arm(dir);
  const treeBefore = g(["rev-parse", "HEAD^{tree}"]);

  const r = runRemediate(["apply"], { cwd: dir, env: { MODONOME_ARMED: "true" } });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /original tree SHA/);

  // Tree content is byte-identical: the whole-tree SHA is unchanged.
  assert.strictEqual(g(["rev-parse", "HEAD^{tree}"]), treeBefore);

  // No forbidden identity and no signature survive in the rewritten range.
  const ids = g(["log", "origin/main..HEAD", "--format=%an <%ae> | %cn <%ce>"]);
  assert.doesNotMatch(ids, /Claude|anthropic\.com/);
  const bodies = g(["log", "origin/main..HEAD", "--format=%B"]);
  assert.doesNotMatch(bodies, AI_SIGNATURE_RE);
  assert.doesNotMatch(bodies, /authored-by/i);

  // Idempotent: a second apply finds nothing to do and does not move HEAD.
  const head = g(["rev-parse", "HEAD"]);
  const again = runRemediate(["apply"], { cwd: dir, env: { MODONOME_ARMED: "true" } });
  assert.strictEqual(again.status, 0, `${again.stdout}\n${again.stderr}`);
  assert.match(again.stdout, /already clean/);
  assert.strictEqual(g(["rev-parse", "HEAD"]), head);
});

test("apply refuses when the capability is not armed and leaves history untouched", () => {
  const { dir, g } = makePollutedRepo();
  arm(dir, { autonomy_enabled: false });
  const head = g(["rev-parse", "HEAD"]);

  const r = runRemediate(["apply"], { cwd: dir, env: { MODONOME_ARMED: "true" } });
  assert.strictEqual(r.status, 3, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /not armed/);
  assert.match(r.stderr, /autonomy_enabled/);
  assert.strictEqual(g(["rev-parse", "HEAD"]), head);
});

test("apply refuses on the default branch", () => {
  const { dir, g } = makePollutedRepo();
  arm(dir);
  g(["checkout", "-q", "main"]);
  const r = runRemediate(["apply"], { cwd: dir, env: { MODONOME_ARMED: "true" } });
  assert.strictEqual(r.status, 3, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /refusing to rewrite history/);
});

test("apply refuses when the working tree has tracked modifications", () => {
  const { dir, g } = makePollutedRepo();
  arm(dir);
  writeFileSync(join(dir, "b.txt"), "modified\n");
  const r = runRemediate(["apply"], { cwd: dir, env: { MODONOME_ARMED: "true" } });
  assert.strictEqual(r.status, 3, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /tracked modifications/);
});

test("plan previews without arming and always exits 0", () => {
  const { dir } = makePollutedRepo();
  const r = runRemediate(["plan"], { cwd: dir });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /2 commit\(s\) would be rewritten/);
  assert.match(r.stdout, /Fingerprint:\s+sha256:/);
});
