import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseFlatYaml } from "../scripts/lib/yaml-lite.mjs";
import { loadConfig, validateConfig } from "../scripts/validate-config.mjs";
import { resolveRole } from "../scripts/agent/resolve-role.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const configPath = join(root, ".modonome", "config.yaml");

// (a) Backward-compat: flat top-level keys in the real config parse to expected values.
test("backward-compat: flat keys in real config parse correctly", () => {
  const cfg = loadConfig(configPath);
  assert.equal(cfg.autonomy_enabled, false);
  assert.equal(cfg.dry_run, true);
  assert.equal(cfg.auto_merge, false);
  assert.equal(cfg.state_dir, ".modonome");
  assert.equal(cfg.require_distinct_maker_checker_model, true);
  assert.deepEqual(cfg.trusted_author_allowlist, []);
  assert.ok(Array.isArray(cfg.protected_paths_extra), "protected_paths_extra is array");
  assert.ok(cfg.protected_paths_extra.length > 0, "protected_paths_extra has entries");
  assert.equal(cfg.max_merges_per_day, 0);
});

// (b) Nested parse: roles.maker.model, models[local-default].base_url, runners.local.labels.
test("nested parse: roles, models, runners resolve correctly", () => {
  const cfg = loadConfig(configPath);
  assert.equal(cfg.roles?.maker?.model, "qwen2.5.1-coder-7b-instruct");
  assert.equal(cfg.roles?.checker?.model, "mistralai/mistral-7b-instruct-v0.3");
  assert.equal(cfg.roles?.dogfood?.model, "claude-haiku-4-5");
  assert.ok(cfg.models?.["local-default"]?.base_url, "local-default base_url is set");
  assert.equal(cfg.models?.["local-default"]?.base_url, "http://mac-mini.local:11434");
  assert.ok(Array.isArray(cfg.runners?.local?.labels), "local labels is array");
  assert.ok(cfg.runners?.local?.labels.includes("mac-mini"), "local labels includes mac-mini");
});

// (c) validateConfig on the real config returns zero errors.
test("validateConfig on the real config returns zero errors", () => {
  const cfg = loadConfig(configPath);
  const errors = validateConfig(cfg);
  assert.deepEqual(errors, [], `Unexpected errors: ${errors.join("; ")}`);
});

// (d) A config where roles.maker.model equals roles.checker.model produces a distinct-model error.
test("distinct-model enforcement: same maker/checker model triggers error", () => {
  const cfg = {
    schema_version: 1,
    autonomy_enabled: false,
    dry_run: true,
    auto_merge: false,
    state_dir: ".modonome",
    require_distinct_maker_checker_model: true,
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-sonnet-4-6" },
    },
  };
  const errors = validateConfig(cfg);
  assert.ok(errors.length > 0, "expected at least one error");
  assert.ok(
    errors.some((e) => e.includes("claude-sonnet-4-6")),
    `error should name the model; got: ${errors.join("; ")}`
  );
  assert.ok(
    errors.some((e) => e.includes("maker") && e.includes("checker")),
    `error should name both roles; got: ${errors.join("; ")}`
  );
});

// (e) resolveRole(cfg, 'maker') returns runner 'local' and model 'qwen2.5.1-coder-7b-instruct'.
test("resolveRole for maker returns correct runner and model", () => {
  const cfg = loadConfig(configPath);
  const result = resolveRole(cfg, "maker");
  assert.equal(result.runner, "local");
  assert.equal(result.model, "qwen2.5.1-coder-7b-instruct");
  assert.equal(result.modelProvider, "local");
  assert.deepEqual(result.runnerLabels, ["self-hosted", "mac-mini"]);
  assert.equal(result.cliPath, "claude");
  assert.equal(result.modelBaseUrl, "http://127.0.0.1:8080/v1");
});
