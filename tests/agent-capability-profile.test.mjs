// Agent capability profiles (ADR-039): a role carries skills, tools, and a prioritized
// model fallback list, resolved without a maker/checker cycle and without a model call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRole, resolveRoleModelChain, selectUsableModel } from "../scripts/agent/resolve-role.mjs";
import { validateConfig } from "../scripts/lib/config-validate.mjs";

const CFG = {
  require_distinct_maker_checker_model: true,
  roles: {
    maker: { runner: "container", model: "claude-sonnet-4-6" },
    checker: { runner: "container", model: "claude-opus-4-8", skills: ["adversarial-review"], tools: ["read-only-fs"] },
    researcher: { runner: "container", models: ["frontier-gpt", "local-default"], skills: ["cite-sources"], tools: ["web-search"] },
  },
  models: {
    "claude-sonnet-4-6": { provider: "anthropic" },
    "claude-opus-4-8": { provider: "anthropic" },
    "frontier-gpt": { provider: "openai-compatible", base_url: "https://api.openai.com/v1" },
    "local-default": { provider: "local", base_url: "http://localhost:11434" },
  },
  providers: {},
};

test("resolveRole surfaces a role's skills and tools, defaulting to empty arrays", () => {
  assert.deepEqual(resolveRole(CFG, "checker").skills, ["adversarial-review"]);
  assert.deepEqual(resolveRole(CFG, "checker").tools, ["read-only-fs"]);
  assert.deepEqual(resolveRole(CFG, "maker").skills, [], "a role with no skills resolves to an empty array");
  assert.deepEqual(resolveRole(CFG, "maker").tools, []);
});

test("a role configured only with a models list resolves its first choice as the primary", () => {
  const r = resolveRole(CFG, "researcher");
  assert.equal(r.model, "frontier-gpt", "the head of the prioritized list is the primary model");
  assert.equal(r.modelProvider, "openai-compatible");
});

test("resolveRoleModelChain returns the fallback order, fully resolved", () => {
  const chain = resolveRoleModelChain(CFG, "researcher");
  assert.deepEqual(chain.map((c) => c.model), ["frontier-gpt", "local-default"]);
  assert.equal(chain[0].costClass, "free", "openai-compatible is a free cost class in the registry");
  assert.equal(chain[1].costClass, "local");
  assert.equal(chain[1].modelBaseUrl, "http://localhost:11434");
});

test("a single-model role still yields a one-entry chain", () => {
  assert.deepEqual(resolveRoleModelChain(CFG, "maker").map((c) => c.model), ["claude-sonnet-4-6"]);
});

test("selectUsableModel falls back past a paid model when there is no budget", () => {
  const chain = [
    { model: "paid-frontier", costClass: "paid" },
    { model: "local-fallback", costClass: "local" },
  ];
  assert.equal(selectUsableModel(chain, { budgetUsdPerDay: 0 }).model, "local-fallback", "no budget falls back to local");
  assert.equal(selectUsableModel(chain, { budgetUsdPerDay: 5 }).model, "paid-frontier", "with budget the frontier choice wins");
  assert.equal(selectUsableModel([{ model: "only-paid", costClass: "paid" }], { budgetUsdPerDay: 0 }), null, "no affordable model returns null, never a silent skip");
});

test("the distinct-model safety rule uses the primary of a models list", () => {
  const clash = {
    require_distinct_maker_checker_model: true,
    roles: {
      maker: { models: ["claude-opus-4-8", "local-default"] },
      checker: { model: "claude-opus-4-8" },
    },
    models: { "claude-opus-4-8": { provider: "anthropic" }, "local-default": { provider: "local", base_url: "http://x" } },
  };
  const errs = validateConfig(clash);
  assert.ok(
    errs.some((e) => /both resolve to primary model "claude-opus-4-8"/.test(e)),
    "a maker whose primary (models[0]) equals the checker's model must trip the rule",
  );
});
