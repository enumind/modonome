// WI-041 (ADR-039 follow-up): runtime model fallback in the loop. resolveRoleModelChain
// and selectUsableModel (scripts/agent/resolve-role.mjs) already pick the best model a
// budget affords, statically, before any call is made. This covers what that explicitly
// left out: when the chosen model turns out unreachable at invocation time, the loop
// itself falls back to the next model in the role's chain rather than failing the whole
// cycle. Fully offline: the mock server binds to 127.0.0.1, and "unreachable" is a real
// closed local port, never a live network call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { planCycle, invokeRoleOpenAI, buildFallbackChain, isUnreachableError } from "../scripts/agent/run-cycle.mjs";
import { startMockServer } from "./helpers/mock-openai-server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// A closed local port: fetch fails at the network layer (ECONNREFUSED/"fetch failed"),
// never reaching an HTTP response. Distinct from the mock server's own "error" mode,
// which IS a reachable endpoint answering with a real non-2xx status.
const UNREACHABLE_URL = "http://127.0.0.1:59999";

// ---------------------------------------------------------------------------
// isUnreachableError
// ---------------------------------------------------------------------------

test("isUnreachableError matches network-layer failures and timeouts", () => {
  assert.equal(isUnreachableError(new Error("fetch failed")), true);
  assert.equal(isUnreachableError(new Error("connect ECONNREFUSED 127.0.0.1:1234")), true);
  assert.equal(isUnreachableError(new Error("getaddrinfo ENOTFOUND some.host")), true);
  assert.equal(isUnreachableError(new Error("openai-client: request timed out after 60000ms.")), true);
});

test("isUnreachableError does not match a real answer from a reachable endpoint", () => {
  assert.equal(isUnreachableError(new Error("openai-client: request failed with status 400: bad request")), false);
  assert.equal(isUnreachableError(new Error("openai-client: request failed with status 401: unauthorized")), false);
  assert.equal(isUnreachableError(new Error("openai-client: malformed response (missing choices[0].message.content).")), false);
});

// ---------------------------------------------------------------------------
// buildFallbackChain (pure)
// ---------------------------------------------------------------------------

const CFG = {
  roles: {
    maker: { runner: "container", models: ["local-a", "local-b", "hosted-paid"] },
    checker: { runner: "container", model: "claude-opus-4-8" },
  },
  models: {
    "local-a": { provider: "local", base_url: "http://127.0.0.1:1111" },
    "local-b": { provider: "local", base_url: "http://127.0.0.1:2222" },
    "hosted-paid": { provider: "anthropic" },
    "claude-opus-4-8": { provider: "anthropic" },
  },
};

test("buildFallbackChain orders the primary first, then the rest of the role's models list", () => {
  const known = new Set(Object.keys(CFG.models));
  const resolved = { model: "local-a", modelProvider: "local", modelBaseUrl: "http://127.0.0.1:1111", transport: "openai-http", costClass: "local", authEnv: null };
  const chain = buildFallbackChain(CFG, "maker", resolved, known);
  assert.deepEqual(chain.map((c) => c.model), ["local-a", "local-b", "hosted-paid"]);
  assert.equal(chain[2].costClass, "paid");
});

test("buildFallbackChain puts a CLI-overridden primary first even if it is not the config's own first choice", () => {
  const known = new Set(Object.keys(CFG.models));
  const resolved = { model: "local-b", modelProvider: "local", modelBaseUrl: "http://127.0.0.1:2222", transport: "openai-http", costClass: "local", authEnv: null };
  const chain = buildFallbackChain(CFG, "maker", resolved, known);
  assert.deepEqual(chain.map((c) => c.model), ["local-b", "local-a", "hosted-paid"], "no duplicate entry for the overridden primary");
});

test("buildFallbackChain prunes fallback entries not in the models registry, without throwing", () => {
  const known = new Set(["local-a"]);
  const resolved = { model: "local-a", modelProvider: "local", modelBaseUrl: "http://127.0.0.1:1111", transport: "openai-http", costClass: "local", authEnv: null };
  const chain = buildFallbackChain(CFG, "maker", resolved, known);
  assert.deepEqual(chain.map((c) => c.model), ["local-a"]);
});

test("planCycle attaches a resolved chain to maker and checker", () => {
  const plan = planCycle({ target: "examples/demo-app" }, CFG, "chain-test");
  assert.deepEqual(plan.maker.chain.map((c) => c.model), ["local-a", "local-b", "hosted-paid"]);
  assert.deepEqual(plan.checker.chain.map((c) => c.model), ["claude-opus-4-8"]);
});

// ---------------------------------------------------------------------------
// invokeRoleOpenAI: runtime fallback integration (real fetch, no real network)
// ---------------------------------------------------------------------------

function git(args, cwd) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
  return res.stdout;
}

function makeGitFixture() {
  const dir = mkdtempSync(join(tmpdir(), "modonome-fallback-"));
  git(["init", "-q"], dir);
  git(["config", "user.email", "test@example.com"], dir);
  git(["config", "user.name", "test"], dir);
  writeFileSync(join(dir, "hello.txt"), "line one\nline two\nline three\n");
  git(["add", "hello.txt"], dir);
  git(["commit", "-q", "-m", "init"], dir);
  return dir;
}

function makePlan(role, roleDescriptor, transcriptSubdir, extra = {}) {
  const runId = "fallback-run";
  const transcriptDir = join("runs", "agent-model-fallback-test", transcriptSubdir);
  mkdirSync(join(root, transcriptDir), { recursive: true });
  return { runId, appName: "demo", transcriptDir, remoteAllowed: false, [role]: roleDescriptor, ...extra };
}

function cleanupTranscripts() {
  rmSync(join(root, "runs", "agent-model-fallback-test"), { recursive: true, force: true });
}

const DIFF = "```diff\ndiff --git a/hello.txt b/hello.txt\n--- a/hello.txt\n+++ b/hello.txt\n@@ -1,3 +1,3 @@\n line one\n-line two\n+line TWO\n line three\n```";

test("invokeRoleOpenAI falls back to the next model when the primary is unreachable", async (t) => {
  const mock = await startMockServer({ mode: "success", completion: { content: DIFF } });
  const target = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:fallback-run:local-a",
    model: "local-a",
    modelBaseUrl: UNREACHABLE_URL,
    modelProvider: "local",
    authEnv: null,
    chain: [
      { model: "local-a", modelProvider: "local", modelBaseUrl: UNREACHABLE_URL, transport: "openai-http", costClass: "local", authEnv: null },
      { model: "local-b", modelProvider: "local", modelBaseUrl: mock.url, transport: "openai-http", costClass: "local", authEnv: null },
    ],
  }, "fallback-success");
  plan.target = target;

  const status = await invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" });
  assert.equal(status, 0);
  assert.equal(readFileSync(join(target, "hello.txt"), "utf8"), "line one\nline TWO\nline three\n");
  assert.equal(mock.requests.length, 1, "only the reachable candidate was actually called");

  const metrics = readFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].maker_model, "local-b", "the metric records the model that actually answered, not the planned primary");
  assert.equal(metrics[0].maker_id, "maker:demo:fallback-run:local-b");
  assert.deepEqual(metrics[0].model_fallback_from, ["local-a"]);
});

test("invokeRoleOpenAI does not fall back on a real (non-network) error from a reachable endpoint", async (t) => {
  const mock = await startMockServer({ mode: "error", errorStatus: 400 });
  const second = await startMockServer({ mode: "success", completion: { content: DIFF } });
  const target = makeGitFixture();
  t.after(async () => {
    await mock.close();
    await second.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:fallback-run:local-a",
    model: "local-a",
    modelBaseUrl: mock.url,
    modelProvider: "local",
    authEnv: null,
    chain: [
      { model: "local-a", modelProvider: "local", modelBaseUrl: mock.url, transport: "openai-http", costClass: "local", authEnv: null },
      { model: "local-b", modelProvider: "local", modelBaseUrl: second.url, transport: "openai-http", costClass: "local", authEnv: null },
    ],
  }, "no-fallback-on-real-error");
  plan.target = target;

  await assert.rejects(
    () => invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" }),
    /status 400/,
  );
  assert.equal(second.requests.length, 0, "a real answer must never trigger a silent fallback to a different model");
});

test("invokeRoleOpenAI skips an unaffordable paid candidate without attempting it, and surfaces a clear error", async (t) => {
  const target = makeGitFixture();
  t.after(() => {
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:fallback-run:local-a",
    model: "local-a",
    modelBaseUrl: UNREACHABLE_URL,
    modelProvider: "local",
    authEnv: null,
    // hosted-paid has no base_url and anthropic has no default openai-http base_url either,
    // so an attempt against it would fail with a distinct "baseUrl is required" error. Real
    // chatCompletion (no injected impl) runs here: if the budget skip is broken and this
    // candidate is actually attempted, the rejection below would not match and the test
    // would fail, which is the point, the skip must happen before any call is made.
    chain: [
      { model: "local-a", modelProvider: "local", modelBaseUrl: UNREACHABLE_URL, transport: "openai-http", costClass: "local", authEnv: null },
      { model: "hosted-paid", modelProvider: "anthropic", modelBaseUrl: undefined, transport: "openai-http", costClass: "paid", authEnv: null },
    ],
  }, "unaffordable-fallback");
  plan.target = target;
  plan.remoteAllowed = false;

  await assert.rejects(
    () => invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" }),
    /fetch failed|ECONNREFUSED/,
    "the rejection must come from the unreachable local candidate, proving the paid one was never attempted",
  );
});

test("invokeRoleOpenAI with no chain (a hand-built plan) behaves exactly as the single-model path", async (t) => {
  const mock = await startMockServer({ mode: "success", completion: { content: DIFF } });
  const target = makeGitFixture();
  t.after(async () => {
    await mock.close();
    rmSync(target, { recursive: true, force: true });
    cleanupTranscripts();
  });

  const plan = makePlan("maker", {
    id: "maker:demo:fallback-run:mock-model",
    model: "mock-model",
    modelBaseUrl: mock.url,
    modelProvider: "openai-compatible",
    authEnv: null,
  }, "no-chain");
  plan.target = target;

  const status = await invokeRoleOpenAI(plan, "maker", { RUN_BRANCH: "modonome/run-test" });
  assert.equal(status, 0);
  const metrics = readFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics[0].maker_model, "mock-model");
  assert.equal(metrics[0].model_fallback_from, undefined);
});
