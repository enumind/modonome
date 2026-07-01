// Unit and integration coverage for the openai-http single-shot execution
// path: extractDiff/applyPatch (scripts/agent/apply-patch.mjs) and the
// invokeRoleOpenAI dispatch branch in scripts/agent/run-cycle.mjs. Fully
// offline: the mock OpenAI server binds to 127.0.0.1 and no real network call
// is ever made.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { extractDiff, applyPatch } from "../scripts/agent/apply-patch.mjs";
import { invokeRoleOpenAI, runCycle } from "../scripts/agent/run-cycle.mjs";
import { startMockServer } from "./helpers/mock-openai-server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function git(args, cwd) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
  return res.stdout;
}

// Create a throwaway git repo with a single committed file, and return the
// repo dir plus a unified diff (produced by a real `git diff`, so it is
// guaranteed to be well-formed and to apply cleanly against the committed
// state) that changes "line two" to "line TWO".
function makeGitFixture() {
  const dir = mkdtempSync(join(tmpdir(), "modonome-apply-patch-"));
  git(["init", "-q"], dir);
  git(["config", "user.email", "test@example.com"], dir);
  git(["config", "user.name", "test"], dir);
  writeFileSync(join(dir, "hello.txt"), "line one\nline two\nline three\n");
  git(["add", "hello.txt"], dir);
  git(["commit", "-q", "-m", "init"], dir);

  writeFileSync(join(dir, "hello.txt"), "line one\nline TWO\nline three\n");
  const diff = git(["diff"], dir);
  // Restore the working tree to the committed state so callers apply the diff
  // themselves rather than inheriting the already-edited file.
  git(["checkout", "--", "hello.txt"], dir);
  return { dir, diff };
}

// ---------------------------------------------------------------------------
// extractDiff
// ---------------------------------------------------------------------------

test("extractDiff pulls a diff out of a ```diff fenced block", () => {
  const body = "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n";
  const text = `Here is the change:\n\n\`\`\`diff\n${body}\`\`\`\n\nDone.`;
  assert.equal(extractDiff(text), body.trim());
});

test("extractDiff pulls a diff out of a ```patch fenced block", () => {
  const body = "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n";
  const text = `\`\`\`patch\n${body}\`\`\``;
  assert.equal(extractDiff(text), body.trim());
});

test("extractDiff accepts a bare fenced block whose body looks like a diff", () => {
  const body = "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n";
  const text = `\`\`\`\n${body}\`\`\``;
  assert.equal(extractDiff(text), body.trim());
});

test("extractDiff accepts a raw diff --git body with no fence", () => {
  const body = "diff --git a/x b/x\nindex 000..111 100644\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b";
  assert.equal(extractDiff(body), body.trim());
});

test("extractDiff returns null when no diff-shaped content is present", () => {
  assert.equal(extractDiff("I made no changes; everything already looked correct."), null);
  assert.equal(extractDiff(""), null);
  assert.equal(extractDiff(undefined), null);
});

// ---------------------------------------------------------------------------
// applyPatch
// ---------------------------------------------------------------------------

test("applyPatch applies a well-formed diff and modifies the file", () => {
  const { dir, diff } = makeGitFixture();
  try {
    const result = applyPatch(diff, dir);
    assert.equal(result.applied, true);
    assert.equal(readFileSync(join(dir, "hello.txt"), "utf8"), "line one\nline TWO\nline three\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("applyPatch on a malformed diff returns applied:false and leaves the tree unchanged", () => {
  const { dir } = makeGitFixture();
  try {
    const before = readFileSync(join(dir, "hello.txt"), "utf8");
    const bogus = "diff --git a/hello.txt b/hello.txt\n--- a/hello.txt\n+++ b/hello.txt\n@@ -1,3 +1,3 @@\n line one\n-this line does not exist\n+line TWO\n line three\n";
    const result = applyPatch(bogus, dir);
    assert.equal(result.applied, false);
    assert.match(result.reason, /does not apply cleanly/);
    assert.equal(readFileSync(join(dir, "hello.txt"), "utf8"), before, "tree must be unchanged");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("applyPatch on empty/no diff content returns applied:false without invoking git", () => {
  const result = applyPatch("", "/tmp");
  assert.equal(result.applied, false);
  assert.match(result.reason, /no diff content/);
});

// ---------------------------------------------------------------------------
// invokeRoleOpenAI integration (mock server, no real network)
// ---------------------------------------------------------------------------

// Build a minimal plan shape invokeRoleOpenAI needs: plan[role] (a resolved
// role descriptor) plus runId/transcriptDir. transcriptDir is deliberately
// kept under the repo's gitignored runs/ prefix (see .gitignore) and unique
// per test, independent from the git-apply fixture's own directory.
function makePlan(role, roleDescriptor, transcriptSubdir) {
  const runId = "test-run";
  const transcriptDir = join("runs", "run-cycle-openai-test", transcriptSubdir);
  mkdirSync(join(root, transcriptDir), { recursive: true });
  return {
    runId,
    transcriptDir,
    [role]: roleDescriptor,
  };
}

function cleanupTranscripts() {
  rmSync(join(root, "runs", "run-cycle-openai-test"), { recursive: true, force: true });
}

test("invokeRoleOpenAI applies a diff returned by the model and records the metric", async (t) => {
  const mock = await startMockServer({
    mode: "success",
    completion: { content: "```diff\ndiff --git a/hello.txt b/hello.txt\n--- a/hello.txt\n+++ b/hello.txt\n@@ -1,3 +1,3 @@\n line one\n-line two\n+line TWO\n line three\n```" },
  });
  const { dir: target } = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:test-run:mock-model",
    model: "mock-model",
    modelBaseUrl: mock.url,
    modelProvider: "openai-compatible",
    authEnv: null,
  }, "apply");
  plan.target = target;

  const status = await invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" });
  assert.equal(status, 0);
  assert.equal(readFileSync(join(target, "hello.txt"), "utf8"), "line one\nline TWO\nline three\n");

  assert.equal(mock.requests.length, 1);
  assert.equal(mock.requests[0].body.model, "mock-model");

  const log = readFileSync(join(root, plan.transcriptDir, "maker.log"), "utf8");
  assert.match(log, /patch applied: true/);

  const metrics = readFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].event, "maker_run");
  assert.equal(metrics[0].maker_model, "mock-model");
  assert.equal(metrics[0].patch_applied, true);
});

test("invokeRoleOpenAI is a clean no-op when the response contains no diff", async (t) => {
  const mock = await startMockServer({
    mode: "success",
    completion: { content: "Everything already looks correct; no changes needed." },
  });
  const { dir: target } = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("checker", {
    id: "checker:demo:test-run:mock-model",
    model: "mock-model",
    modelBaseUrl: mock.url,
    modelProvider: "openai-compatible",
    authEnv: null,
  }, "noop");
  plan.target = target;

  const before = readFileSync(join(target, "hello.txt"), "utf8");
  const status = await invokeRoleOpenAI(plan, "checker", { RUN_BRANCH: "modonome/run-test" });
  assert.equal(status, 0, "a no-diff response is a clean no-op, not a failure");
  assert.equal(readFileSync(join(target, "hello.txt"), "utf8"), before, "tree must be unchanged");

  const metrics = readFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics[0].patch_applied, false);
  assert.match(metrics[0].patch_reason, /no diff found/);
});

test("invokeRoleOpenAI is a clean no-op when the diff does not apply", async (t) => {
  const mock = await startMockServer({
    mode: "success",
    completion: { content: "```diff\ndiff --git a/hello.txt b/hello.txt\n--- a/hello.txt\n+++ b/hello.txt\n@@ -1,3 +1,3 @@\n line one\n-line that does not exist\n+line TWO\n line three\n```" },
  });
  const { dir: target } = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:test-run:mock-model",
    model: "mock-model",
    modelBaseUrl: mock.url,
    modelProvider: "openai-compatible",
    authEnv: null,
  }, "bad-diff");
  plan.target = target;

  const before = readFileSync(join(target, "hello.txt"), "utf8");
  const status = await invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" });
  assert.equal(status, 0);
  assert.equal(readFileSync(join(target, "hello.txt"), "utf8"), before);

  const metrics = readFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics[0].patch_applied, false);
  assert.match(metrics[0].patch_reason, /does not apply cleanly/);
});

test("invokeRoleOpenAI sends no Authorization header when authEnv is unset (tokenless local endpoint)", async (t) => {
  const mock = await startMockServer({ mode: "success", completion: { content: "no diff here" } });
  const { dir: target } = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:test-run:mock-model",
    model: "mock-model",
    modelBaseUrl: mock.url,
    modelProvider: "local",
    authEnv: null,
  }, "no-auth");
  plan.target = target;

  await invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" });
  assert.equal("authorization" in mock.requests[0].headers, false);
});

test("invokeRoleOpenAI reads the auth token from env[role.authEnv] when set", async (t) => {
  const mock = await startMockServer({ mode: "success", completion: { content: "no diff here" } });
  const { dir: target } = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:test-run:mock-model",
    model: "mock-model",
    modelBaseUrl: mock.url,
    modelProvider: "openai-compatible",
    authEnv: "MOCK_TOKEN",
  }, "with-auth");
  plan.target = target;

  await invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test", MOCK_TOKEN: "shh-secret" });
  assert.equal(mock.requests[0].headers.authorization, "Bearer shh-secret");
});

// ---------------------------------------------------------------------------
// runCycle dry-run must still make no call for an openai-http role.
// ---------------------------------------------------------------------------

test("runCycle dry-run makes no model call for an openai-http role", () => {
  const cfg = {
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "container", model: "local-a" },
      checker: { runner: "container", model: "local-b" },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "local-a": { provider: "local", base_url: "http://127.0.0.1:1" },
      "local-b": { provider: "local", base_url: "http://127.0.0.1:2" },
    },
  };
  const result = runCycle({ target: "examples/demo-app" }, { execute: false, cfg, runId: "dry-oai" });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.maker.transport, "openai-http");
  assert.equal(existsSync(join(root, "examples/demo-app", "runs", "dry-oai")), false, "dry-run must create no transcript dir");
});
