// Generic role registry (WI-040). Role dispatch is config-driven: the built-in
// maker/checker/self-govern roles resolve exactly as before, and a crew role
// added in config (a researcher, tester, and so on) resolves to a valid
// descriptor and is honored by the executed role sequence with no core-code
// change. The maker/checker separation of duties stays first-class and enforced.
// Fully offline: no model call, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../scripts/validate-config.mjs";
import { resolveRole } from "../scripts/agent/resolve-role.mjs";
import { planCycle, runCycle, resolveRoleSequence } from "../scripts/agent/run-cycle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const configPath = join(root, ".modonome", "config.yaml");

// A single-environment config with no runner reachability declared, so routing
// stays inline for every role (matching the shipped default posture). Crew roles
// are added by extending `roles`, `models`, and optionally `role_sequence`.
function baseCfg(extra = {}) {
  return {
    schema_version: 1,
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
    },
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Built-in roles resolve exactly as before, default sequence is maker/checker.
// ---------------------------------------------------------------------------

test("default config resolves maker and checker exactly as before", () => {
  const cfg = loadConfig(configPath);

  const maker = resolveRole(cfg, "maker");
  assert.equal(maker.runner, "container");
  assert.equal(maker.model, "claude-sonnet-4-6");
  assert.equal(maker.modelProvider, "anthropic");
  assert.equal(maker.transport, "anthropic-cli");
  assert.equal(maker.costClass, "paid");
  assert.equal(maker.modelBaseUrl, undefined);
  assert.deepEqual(maker.runnerLabels, ["ubuntu-latest"]);

  const checker = resolveRole(cfg, "checker");
  assert.equal(checker.runner, "container");
  assert.equal(checker.model, "claude-opus-4-8");
  assert.equal(checker.modelProvider, "anthropic");
});

test("default role sequence is [maker, checker] when nothing is configured", () => {
  assert.deepEqual(resolveRoleSequence({}), ["maker", "checker"]);
  assert.deepEqual(resolveRoleSequence(loadConfig(configPath)), ["maker", "checker"]);
  // An empty role_sequence array falls back to the default rather than running nothing.
  assert.deepEqual(resolveRoleSequence({ role_sequence: [] }), ["maker", "checker"]);
});

test("resolveRoleSequence returns a fresh array (no shared mutable default)", () => {
  const a = resolveRoleSequence({});
  a.push("checker");
  assert.deepEqual(resolveRoleSequence({}), ["maker", "checker"]);
});

// ---------------------------------------------------------------------------
// A crew role added only in config resolves to a valid descriptor.
// ---------------------------------------------------------------------------

test("a config-only researcher role resolves its configured provider and transport", () => {
  const cfg = baseCfg({
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      researcher: { runner: "local", model: "research-model" },
    },
    runners: {
      container: { labels: ["ubuntu-latest"], cli_path: "claude" },
      local: { labels: ["self-hosted"], cli_path: "claude" },
    },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
      "research-model": { provider: "github-models" },
    },
  });

  const researcher = resolveRole(cfg, "researcher");
  assert.equal(researcher.runner, "local");
  assert.equal(researcher.model, "research-model");
  assert.equal(researcher.modelProvider, "github-models");
  // github-models resolves through the provider registry to the openai-http
  // transport at the free cost class, so the crew role picks its own transport.
  assert.equal(researcher.transport, "openai-http");
  assert.equal(researcher.costClass, "free");
  assert.deepEqual(researcher.runnerLabels, ["self-hosted"]);
});

test("a crew role with no built-in default inherits safe container/hosted defaults", () => {
  // No entry under roles for this name at all: it still resolves to a valid shape.
  const r = resolveRole(baseCfg(), "envisioner");
  assert.equal(r.runner, "container");
  assert.equal(r.model, "claude-sonnet-4-6");
  assert.equal(r.modelProvider, "anthropic");
  assert.equal(r.transport, "anthropic-cli");
});

// ---------------------------------------------------------------------------
// A configured role sequence including a crew role is honored by the plan.
// ---------------------------------------------------------------------------

test("planCycle honors a role_sequence including a crew role, no core-code change", () => {
  const cfg = baseCfg({
    role_sequence: ["maker", "checker", "researcher"],
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      researcher: { runner: "container", model: "research-model" },
    },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
      "research-model": { provider: "github-models" },
    },
  });

  const plan = planCycle({ target: "examples/demo-app" }, cfg, "seq-run");
  assert.deepEqual(plan.roleSequence, ["maker", "checker", "researcher"]);
  // The crew role is attached to the plan under its own name with a resolved
  // descriptor, id, and route, alongside the unchanged maker/checker entries.
  assert.equal(plan.researcher.model, "research-model");
  assert.equal(plan.researcher.transport, "openai-http");
  assert.equal(plan.researcher.id, "researcher:demo-app:seq-run:research-model");
  assert.ok(plan.researcher.route, "crew role has a resolved route");
  assert.equal(plan.maker.model, "claude-sonnet-4-6");
  assert.equal(plan.checker.model, "claude-opus-4-8");
});

test("a crew role model absent from the models registry is rejected during planning", () => {
  const cfg = baseCfg({
    role_sequence: ["maker", "checker", "researcher"],
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      researcher: { runner: "container", model: "unpinned-model" },
    },
  });
  assert.throws(
    () => planCycle({ target: "examples/demo-app" }, cfg, "bad-crew"),
    /researcher model "unpinned-model" is not in the models registry/,
  );
});

// ---------------------------------------------------------------------------
// Separation of duties stays first-class and enforced.
// ---------------------------------------------------------------------------

test("require_distinct_maker_checker_model still throws when maker and checker share a model", () => {
  const cfg = baseCfg({
    require_distinct_maker_checker_model: true,
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-sonnet-4-6" },
    },
    models: { "claude-sonnet-4-6": { provider: "anthropic" } },
  });
  assert.throws(
    () => planCycle({ target: "examples/demo-app" }, cfg, "dup-model"),
    /maker and checker resolve to the same model \(claude-sonnet-4-6\); distinct models are required/,
  );
});

test("distinctness applies only to the maker/checker pair, not to crew roles", () => {
  // A crew role may share a model with the maker; that is not a maker/checker
  // pairing and must not trip the separation-of-duties check.
  const cfg = baseCfg({
    require_distinct_maker_checker_model: true,
    role_sequence: ["maker", "checker", "researcher"],
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      researcher: { runner: "container", model: "claude-sonnet-4-6" },
    },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
    },
  });
  const plan = planCycle({ target: "examples/demo-app" }, cfg, "crew-shares");
  assert.equal(plan.researcher.model, "claude-sonnet-4-6");
  assert.equal(plan.maker.model, "claude-sonnet-4-6");
});

// ---------------------------------------------------------------------------
// The executed loop iterates the derived sequence (exercised via the enqueue
// path so no model is ever called).
// ---------------------------------------------------------------------------

test("runCycle enqueues one action per role in a crew-extended sequence", () => {
  const queueDir = mkdtempSync(join(tmpdir(), "modonome-role-registry-"));
  try {
    const cfg = baseCfg({
      remote_model_budget_usd_per_day: 100,
      role_sequence: ["maker", "checker", "researcher"],
      roles: {
        maker: { runner: "container", model: "claude-sonnet-4-6" },
        checker: { runner: "container", model: "claude-opus-4-8" },
        researcher: { runner: "container", model: "research-model" },
      },
      models: {
        "claude-sonnet-4-6": { provider: "anthropic" },
        "claude-opus-4-8": { provider: "anthropic" },
        "research-model": { provider: "github-models" },
      },
    });
    const result = runCycle(
      { target: "examples/demo-app", enqueue: true },
      { execute: true, cfg, runId: "enqueue-run", queueDir },
    );
    assert.equal(result.mode, "enqueued");
    assert.deepEqual(result.enqueued.map((e) => e.role), ["maker", "checker", "researcher"]);
  } finally {
    rmSync(queueDir, { recursive: true, force: true });
  }
});
