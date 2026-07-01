// Coverage for the agentic tool-loop execution path (WI-030). Fully offline: an
// injected spawnImpl stands in for child_process.spawn, so no real binary is ever
// launched. Exercises the adapter module (containment, caps, timeout, bounded
// failure) and the run-cycle dispatch on exec_mode (default single-shot vs
// tool-loop).
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runToolLoopAdapter,
  resolveAdapterCommand,
  containedCwd,
  buildAdapterArgs,
} from "../scripts/agent/tool-loop-adapter.mjs";
import { invokeRoleToolLoop, resolveExecMode, planCycle } from "../scripts/agent/run-cycle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const ADAPTER = { name: "opencode", license: "MIT", boundary: "process", version: "0.3.0" };

// A scriptable fake child process. Captures the constructor call, emits the
// configured stdout/stderr, then closes (or hangs, when never told to close).
function makeFakeSpawn(script = {}) {
  const calls = [];
  const spawnImpl = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    const writes = [];
    child.stdin = { write: (d) => writes.push(String(d)), end: () => {} };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdinWrites = writes;
    child.killed = false;
    child.kill = (sig) => { child.killed = true; child.killSignal = sig; };

    // Emit on the next tick so listeners are attached first.
    queueMicrotask(() => {
      if (script.throwOnSpawn) return; // handled below (never reached: throw path)
      if (script.stdout) child.stdout.emit("data", script.stdout);
      if (script.stderr) child.stderr.emit("data", script.stderr);
      if (script.errorMessage) {
        child.emit("error", new Error(script.errorMessage));
        return;
      }
      if (script.hang) return; // never closes; only a timeout can settle it
      child.emit("close", script.code ?? 0, script.signal ?? null);
    });
    return child;
  };
  return { spawnImpl, calls };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test("resolveAdapterCommand prefers command, falls back to name", () => {
  assert.equal(resolveAdapterCommand({ command: "oc", name: "opencode" }), "oc");
  assert.equal(resolveAdapterCommand({ name: "opencode" }), "opencode");
  assert.throws(() => resolveAdapterCommand({}), /no usable command/);
  assert.throws(() => resolveAdapterCommand(null), /no usable command/);
});

test("containedCwd pins to the resolved target inside the root", () => {
  const cwd = containedCwd(root, "examples/demo-app");
  assert.equal(cwd, resolve(root, "examples/demo-app"));
});

test("containedCwd refuses a target that escapes the root (ADR-009)", () => {
  assert.throws(() => containedCwd(root, "../outside"), /escapes the repo root/);
  assert.throws(() => containedCwd(root, "/etc"), /escapes the repo root/);
  assert.throws(() => containedCwd("/home/user/modonome", "../../etc/passwd"), /escapes the repo root/);
});

test("buildAdapterArgs forwards the capped turns and endpoint, reads prompt from stdin", () => {
  const args = buildAdapterArgs({ baseUrl: "http://x/v1", model: "m" }, 12, {});
  assert.deepEqual(args, ["--prompt-stdin", "--max-turns", "12", "--base-url", "http://x/v1", "--model", "m"]);
  assert.deepEqual(buildAdapterArgs({}, 5, { args: ["custom"] }), ["custom"]);
});

// ---------------------------------------------------------------------------
// runToolLoopAdapter
// ---------------------------------------------------------------------------

test("a bounded scripted run completes and returns transcript + status 0", async () => {
  const { spawnImpl, calls } = makeFakeSpawn({ stdout: "did the work\n", code: 0 });
  const result = await runToolLoopAdapter({
    prompt: "do the task",
    endpoint: { baseUrl: "http://127.0.0.1:1/v1", authToken: "tok", model: "m" },
    root,
    target: "examples/demo-app",
    adapterEntry: ADAPTER,
    maxTurns: 10,
    deps: { spawnImpl },
  });
  assert.equal(result.status, 0);
  assert.match(result.transcript, /did the work/);
  assert.match(result.transcript, /tool-loop status: 0/);
  // cwd pinned to target; credential passed via env, not argv.
  assert.equal(calls[0].options.cwd, resolve(root, "examples/demo-app"));
  assert.equal(calls[0].options.env.OPENAI_API_KEY, "tok");
  assert.ok(!calls[0].args.join(" ").includes("tok"), "token must not appear in argv");
});

test("prompt is delivered on stdin, not in argv", async () => {
  const children = [];
  const spawnImpl = (command, args, options) => {
    const child = new EventEmitter();
    const writes = [];
    child.stdin = { write: (d) => writes.push(String(d)), end: () => {} };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdinWrites = writes;
    child.args = args;
    child.kill = () => {};
    children.push(child);
    queueMicrotask(() => child.emit("close", 0, null));
    return child;
  };
  await runToolLoopAdapter({
    prompt: "SECRET-PROMPT-BODY",
    endpoint: { baseUrl: "http://x/v1", model: "m" },
    root,
    target: "examples/demo-app",
    adapterEntry: ADAPTER,
    deps: { spawnImpl },
  });
  assert.ok(!children[0].args.join(" ").includes("SECRET-PROMPT-BODY"), "prompt must not be in argv");
  assert.equal(children[0].stdinWrites.join(""), "SECRET-PROMPT-BODY");
});

test("the turn cap is clamped to the hard cap before forwarding", async () => {
  const { spawnImpl, calls } = makeFakeSpawn({ code: 0 });
  await runToolLoopAdapter({
    prompt: "x",
    endpoint: { baseUrl: "http://x/v1", model: "m" },
    root,
    target: "examples/demo-app",
    adapterEntry: ADAPTER,
    maxTurns: 5000,
    deps: { spawnImpl },
  });
  const turnsIdx = calls[0].args.indexOf("--max-turns");
  assert.equal(calls[0].args[turnsIdx + 1], "80", "turns forwarded to the CLI are clamped to the hard cap");
});

test("a non-zero exit is a clean non-throwing failure result", async () => {
  const { spawnImpl } = makeFakeSpawn({ stderr: "boom\n", code: 2 });
  const result = await runToolLoopAdapter({
    prompt: "x",
    endpoint: { baseUrl: "http://x/v1", model: "m" },
    root,
    target: "examples/demo-app",
    adapterEntry: ADAPTER,
    deps: { spawnImpl },
  });
  assert.equal(result.status, 2);
  assert.match(result.reason, /exited with status 2/);
  assert.match(result.transcript, /boom/);
});

test("a run that exceeds the time cap is killed and times out cleanly", async () => {
  const { spawnImpl, calls } = makeFakeSpawn({ hang: true });
  const result = await runToolLoopAdapter({
    prompt: "x",
    endpoint: { baseUrl: "http://x/v1", model: "m" },
    root,
    target: "examples/demo-app",
    adapterEntry: ADAPTER,
    timeoutMs: 20,
    deps: { spawnImpl },
  });
  assert.equal(result.status, 124);
  assert.match(result.reason, /timed out/);
});

test("a spawn-time process error is a bounded failure, not a throw", async () => {
  const { spawnImpl } = makeFakeSpawn({ errorMessage: "ENOENT: no such binary" });
  const result = await runToolLoopAdapter({
    prompt: "x",
    endpoint: { baseUrl: "http://x/v1", model: "m" },
    root,
    target: "examples/demo-app",
    adapterEntry: ADAPTER,
    deps: { spawnImpl },
  });
  assert.equal(result.status, 1);
  assert.match(result.reason, /process error|ENOENT/);
});

test("a malicious escaping target is refused before any spawn (containment)", async () => {
  const { spawnImpl, calls } = makeFakeSpawn({ code: 0 });
  const result = await runToolLoopAdapter({
    prompt: "x",
    endpoint: { baseUrl: "http://x/v1", model: "m" },
    root,
    target: "../../etc",
    adapterEntry: ADAPTER,
    deps: { spawnImpl },
  });
  assert.equal(result.status, 1);
  assert.match(result.reason, /escapes the repo root/);
  assert.equal(calls.length, 0, "no process is spawned when containment fails");
});

test("a missing adapter command is a bounded refusal, not a crash", async () => {
  const { spawnImpl, calls } = makeFakeSpawn({ code: 0 });
  const result = await runToolLoopAdapter({
    prompt: "x",
    endpoint: {},
    root,
    target: "examples/demo-app",
    adapterEntry: {},
    deps: { spawnImpl },
  });
  assert.equal(result.status, 1);
  assert.match(result.reason, /no usable command/);
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// run-cycle dispatch on exec_mode
// ---------------------------------------------------------------------------

const OAI_CFG = {
  remote_model_budget_usd_per_day: 0,
  roles: {
    maker: { runner: "container", model: "local-a" },
    checker: { runner: "container", model: "local-b" },
  },
  runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
  models: {
    "local-a": { provider: "local", base_url: "http://127.0.0.1:1", exec_mode: "tool-loop" },
    "local-b": { provider: "local", base_url: "http://127.0.0.1:2" },
  },
};

test("resolveExecMode defaults to patch and honors tool-loop", () => {
  assert.equal(resolveExecMode(OAI_CFG, "local-a"), "tool-loop");
  assert.equal(resolveExecMode(OAI_CFG, "local-b"), "patch");
  assert.equal(resolveExecMode(OAI_CFG, "unknown"), "patch");
  assert.equal(resolveExecMode({}, "x"), "patch");
});

test("planCycle attaches execMode from the model config", () => {
  const plan = planCycle({ target: "examples/demo-app" }, OAI_CFG, "run-1");
  assert.equal(plan.maker.execMode, "tool-loop");
  assert.equal(plan.checker.execMode, "patch");
});

test("invokeRoleToolLoop routes to the injected adapter and records the metric", async (t) => {
  const transcriptDir = join("runs", "tool-loop-test", "route");
  mkdirSync(join(root, transcriptDir), { recursive: true });
  t.after(() => rmSync(join(root, "runs", "tool-loop-test"), { recursive: true, force: true }));

  let received = null;
  const plan = {
    runId: "run-1",
    transcriptDir,
    target: "examples/demo-app",
    maxTurns: 40,
    maker: {
      id: "maker:demo:run-1:local-a",
      model: "local-a",
      modelBaseUrl: "http://127.0.0.1:1/v1",
      modelProvider: "local",
      authEnv: null,
      transport: "openai-http",
      execMode: "tool-loop",
    },
  };
  const status = await invokeRoleToolLoop(plan, "maker", { RUN_BRANCH: "modonome/run-test" }, {
    adapterEntry: ADAPTER,
    runToolLoopImpl: async (args) => {
      received = args;
      return { status: 0, transcript: "adapter ran\n", reason: "adapter completed." };
    },
  });
  assert.equal(status, 0);
  assert.equal(received.target, "examples/demo-app");
  assert.equal(received.endpoint.baseUrl, "http://127.0.0.1:1/v1");
  assert.equal(received.endpoint.model, "local-a");
  assert.equal(received.adapterEntry.name, "opencode");

  const metrics = readFileSync(join(root, transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics[0].exec_mode, "tool-loop");
  assert.equal(metrics[0].adapter, "opencode");
  assert.equal(metrics[0].adapter_status, 0);
});

test("invokeRoleToolLoop returns 0 (no-op) on a bounded adapter failure", async (t) => {
  const transcriptDir = join("runs", "tool-loop-test", "bounded");
  mkdirSync(join(root, transcriptDir), { recursive: true });
  t.after(() => rmSync(join(root, "runs", "tool-loop-test"), { recursive: true, force: true }));

  const plan = {
    runId: "run-1",
    transcriptDir,
    target: "examples/demo-app",
    maxTurns: 40,
    maker: {
      id: "maker:demo:run-1:local-a", model: "local-a", modelBaseUrl: "http://x/v1",
      modelProvider: "local", authEnv: null, transport: "openai-http", execMode: "tool-loop",
    },
  };
  const status = await invokeRoleToolLoop(plan, "maker", { RUN_BRANCH: "b" }, {
    adapterEntry: ADAPTER,
    runToolLoopImpl: async () => ({ status: 124, transcript: "hung\n", reason: "adapter timed out." }),
  });
  assert.equal(status, 0, "a bounded adapter failure is a clean no-op for the cycle");
  const metrics = readFileSync(join(root, transcriptDir, "metrics.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(metrics[0].adapter_status, 124);
  assert.match(metrics[0].adapter_reason, /timed out/);
});
