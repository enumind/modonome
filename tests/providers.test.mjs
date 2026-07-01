import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveProvider, isBillable, BUILTIN_PROVIDERS } from "../scripts/agent/providers.mjs";
import { resolveRole } from "../scripts/agent/resolve-role.mjs";
import { planCycle } from "../scripts/agent/run-cycle.mjs";
import { loadConfig } from "../scripts/validate-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const RID = "2026-06-26T00-00-00-000Z";

test("registry returns correct descriptor for anthropic (paid, anthropic-cli)", () => {
  const p = resolveProvider("anthropic");
  assert.equal(p.transport, "anthropic-cli");
  assert.equal(p.costClass, "paid");
  assert.equal(p.authEnv, "ANTHROPIC_API_KEY");
});

test("registry returns correct descriptor for local (local, no auth)", () => {
  const p = resolveProvider("local");
  assert.equal(p.transport, "openai-http");
  assert.equal(p.costClass, "local");
  assert.equal(p.authEnv, null);
});

test("registry returns correct descriptor for github-models (free, default base url)", () => {
  const p = resolveProvider("github-models");
  assert.equal(p.transport, "openai-http");
  assert.equal(p.costClass, "free");
  assert.equal(p.authEnv, "GITHUB_TOKEN");
  assert.equal(p.defaultBaseUrl, "https://models.github.ai/inference");
});

test("registry returns correct descriptor for openai-compatible (free, generic)", () => {
  const p = resolveProvider("openai-compatible");
  assert.equal(p.transport, "openai-http");
  assert.equal(p.costClass, "free");
  assert.equal(p.authEnv, "OPENAI_API_KEY");
});

test("BUILTIN_PROVIDERS exposes exactly the four built-in names", () => {
  assert.deepEqual(
    new Set(Object.keys(BUILTIN_PROVIDERS)),
    new Set(["anthropic", "local", "github-models", "openai-compatible"])
  );
});

test("config providers override merges over a built-in entry", () => {
  const p = resolveProvider("anthropic", { anthropic: { costClass: "free" } });
  assert.equal(p.costClass, "free");
  // Fields not touched by the override are preserved from the built-in.
  assert.equal(p.transport, "anthropic-cli");
  assert.equal(p.authEnv, "ANTHROPIC_API_KEY");
});

test("config providers can add a brand-new provider name", () => {
  const p = resolveProvider("acme", { acme: { transport: "openai-http", costClass: "free", authEnv: "ACME_KEY" } });
  assert.equal(p.transport, "openai-http");
  assert.equal(p.costClass, "free");
  assert.equal(p.authEnv, "ACME_KEY");
});

test("an unknown provider with no override defaults to paid/anthropic-cli", () => {
  const p = resolveProvider("totally-unknown");
  assert.equal(p.costClass, "paid");
  assert.equal(p.transport, "anthropic-cli");
});

test("resolveProvider tolerates an absent providersOverride argument", () => {
  const p = resolveProvider("local", undefined);
  assert.equal(p.costClass, "local");
});

test("isBillable is true only for paid", () => {
  assert.equal(isBillable("paid"), true);
  assert.equal(isBillable("free"), false);
  assert.equal(isBillable("local"), false);
  assert.equal(isBillable("anything-else"), false);
});

test("resolveRole returns transport, costClass, and authEnv alongside legacy fields", () => {
  const cfg = {
    roles: { maker: { model: "gh-model" } },
    models: { "gh-model": { provider: "github-models" } },
  };
  const r = resolveRole(cfg, "maker");
  assert.equal(r.modelProvider, "github-models");
  assert.equal(r.transport, "openai-http");
  assert.equal(r.costClass, "free");
  assert.equal(r.authEnv, "GITHUB_TOKEN");
});

test("resolveRole passes cfg.providers through to the registry", () => {
  const cfg = {
    roles: { maker: { model: "m" } },
    models: { m: { provider: "anthropic" } },
    providers: { anthropic: { costClass: "free" } },
  };
  const r = resolveRole(cfg, "maker");
  assert.equal(r.costClass, "free");
});

// planCycle budget behavior, repriced by cost class.

function baseCfg(overrides = {}) {
  return {
    require_distinct_maker_checker_model: true,
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "container", model: "gh-maker" },
      checker: { runner: "container", model: "local-checker" },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "gh-maker": { provider: "github-models" },
      "local-checker": { provider: "local" },
    },
    ...overrides,
  };
}

test("(a) maker github-models + checker local needs no budget even at 0", () => {
  const plan = planCycle({ target: "examples/demo-app" }, baseCfg(), RID);
  assert.equal(plan.usesRemote, false);
  assert.equal(plan.remoteAllowed, false);
  assert.equal(plan.budget, 0);
});

test("(b) a paid role with budget 0 still requires the budget", () => {
  const cfg = baseCfg({
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "local-checker" },
    },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "local-checker": { provider: "local" },
    },
  });
  const plan = planCycle({ target: "examples/demo-app" }, cfg, RID);
  assert.equal(plan.usesRemote, true);
  assert.equal(plan.remoteAllowed, false);
});

test("(c) existing anthropic+local config is unchanged: both hosted roles gate on budget", () => {
  const cfg = {
    require_distinct_maker_checker_model: true,
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
      "local-default": { provider: "local", base_url: "http://localhost:11434" },
    },
  };
  const plan = planCycle({ target: "examples/demo-app" }, cfg, RID);
  assert.equal(plan.usesRemote, true);
  assert.equal(plan.remoteAllowed, false);
});

test("(c) existing anthropic+local config with a local role never requires budget", () => {
  const cfg = {
    require_distinct_maker_checker_model: true,
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "local", model: "local-default" },
      checker: { runner: "local", model: "local-default-2" },
    },
    runners: { local: { labels: ["self-hosted"], cli_path: "claude" } },
    models: {
      "local-default": { provider: "local", base_url: "http://localhost:11434" },
      "local-default-2": { provider: "local", base_url: "http://localhost:11435" },
    },
  };
  const plan = planCycle({ target: "examples/demo-app" }, cfg, RID);
  assert.equal(plan.usesRemote, false);
  assert.equal(plan.remoteAllowed, false);
});

test("the real repo config still resolves to a billable plan gated on budget 0", () => {
  const real = loadConfig(join(root, ".modonome", "config.yaml"));
  const plan = planCycle({ target: "examples/demo-app" }, real, RID);
  assert.equal(plan.usesRemote, true);
  assert.equal(plan.remoteAllowed, real.remote_model_budget_usd_per_day > 0);
});
