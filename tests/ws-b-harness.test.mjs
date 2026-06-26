import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planCycle, runCycle, parseArgs } from "../scripts/agent/run-cycle.mjs";
import { renderPrompt } from "../scripts/agent/render-prompt.mjs";
import { loadConfig } from "../scripts/validate-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// A config fixture with distinct maker/checker models and a models registry.
function cfg(overrides = {}) {
  return {
    require_distinct_maker_checker_model: true,
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "container", model: "claude-haiku-4-5" },
      checker: { runner: "container", model: "claude-sonnet-4-6" },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "claude-haiku-4-5": { provider: "anthropic" },
      "claude-sonnet-4-6": { provider: "anthropic" },
      "local-default": { provider: "local", base_url: "http://localhost:11434" },
    },
    ...overrides,
  };
}

const RID = "2026-06-26T00-00-00-000Z";

test("renderPrompt substitutes placeholders from the env", () => {
  const out = renderPrompt("maker", { MAKER_ID: "maker:x", MAKER_MODEL: "claude-haiku-4-5", RUN_BRANCH: "modonome/run-1" });
  assert.match(out, /maker_id to 'maker:x'/);
  assert.match(out, /maker_model to 'claude-haiku-4-5'/);
  assert.match(out, /branch 'modonome\/run-1'/);
  assert.doesNotMatch(out, /\$\{/, "no unsubstituted placeholders remain");
});

test("renderPrompt throws when a referenced variable is unset", () => {
  assert.throws(() => renderPrompt("checker", { CHECKER_ID: "c", CHECKER_MODEL: "m" }), /RUN_BRANCH/);
});

test("planCycle resolves distinct maker and checker with pinned ids", () => {
  const plan = planCycle({ target: "examples/demo-app" }, cfg(), RID);
  assert.equal(plan.appName, "demo-app");
  assert.equal(plan.maker.model, "claude-haiku-4-5");
  assert.equal(plan.checker.model, "claude-sonnet-4-6");
  assert.notEqual(plan.maker.id, plan.checker.id);
  assert.match(plan.maker.id, /^maker:demo-app:.*claude-haiku-4-5$/);
  assert.equal(plan.transcriptDir, join("examples/demo-app", "runs", RID));
});

test("planCycle rejects identical maker and checker models", () => {
  const c = cfg({ roles: { maker: { model: "claude-haiku-4-5" }, checker: { model: "claude-haiku-4-5" } } });
  assert.throws(() => planCycle({ target: "examples/demo-app" }, c, RID), /distinct models are required/);
});

test("planCycle allows identical models only when the flag is off", () => {
  const c = cfg({ require_distinct_maker_checker_model: false, roles: { maker: { model: "claude-haiku-4-5" }, checker: { model: "claude-haiku-4-5" } } });
  const plan = planCycle({ target: "examples/demo-app" }, c, RID);
  assert.equal(plan.maker.model, plan.checker.model);
});

test("planCycle rejects an unpinned model", () => {
  assert.throws(() => planCycle({ target: "examples/demo-app", makerModel: "gpt-made-up" }, cfg(), RID), /not in the models registry/);
});

test("planCycle enforces the turn cap", () => {
  assert.throws(() => planCycle({ target: "examples/demo-app", maxTurns: 9999 }, cfg(), RID), /exceeds the hard cap/);
  assert.throws(() => planCycle({ target: "examples/demo-app", maxTurns: 0 }, cfg(), RID), /positive integer/);
});

test("planCycle requires a target", () => {
  assert.throws(() => planCycle({}, cfg(), RID), /--target is required/);
});

test("a hosted run is refused when the daily budget is zero", () => {
  // execute path, budget 0, hosted models -> refusal before any spawn.
  assert.throws(() => runCycle({ target: "examples/demo-app" }, { execute: true, cfg: cfg(), runId: RID, env: { RUN_BRANCH: "b" } }), /budget.*is 0/);
});

test("dry run returns a plan and calls no model", () => {
  const result = runCycle({ target: "examples/demo-app" }, { execute: false, cfg: cfg(), runId: RID });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.remoteRunAllowed ?? result.remoteAllowed, false);
});

test("the real config resolves a valid distinct-model plan", () => {
  const real = loadConfig(join(root, ".modonome", "config.yaml"));
  const plan = planCycle({ target: "examples/demo-app" }, real, RID);
  assert.notEqual(plan.maker.model, plan.checker.model);
});

test("parseArgs reads target, models, turns, and execute", () => {
  const o = parseArgs(["--target", "examples/demo-app", "--maker-model", "m", "--checker-model", "c", "--max-turns", "10", "--execute"]);
  assert.equal(o.target, "examples/demo-app");
  assert.equal(o.makerModel, "m");
  assert.equal(o.checkerModel, "c");
  assert.equal(o.maxTurns, 10);
  assert.equal(o.execute, true);
});
