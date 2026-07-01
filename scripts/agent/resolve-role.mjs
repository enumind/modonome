// Resolve runner and model configuration for a named agent role.
// Reads the roles, runners, and models maps from the loaded config object and
// returns a flat descriptor. CLI flags applied later in the call chain override
// the values returned here.
//
// Defaults (when the config omits a field):
//   runner: container
//   model:  role-specific hosted Claude model
//   All other fields fall back to the container runner or a no-op value.

import { resolveProvider } from "./providers.mjs";

// Built-in role defaults for the roles the harness ships with. A role present in
// cfg.roles but absent here is a crew role added in config: it inherits the generic
// fallback (container runner, the generic maker model) and reads its runner/model
// overrides from cfg.roles like any other role, so a new role needs no code change.
const ROLE_DEFAULTS = {
  maker: { runner: "container", model: "claude-sonnet-4-6" },
  checker: { runner: "container", model: "claude-opus-4-8" },
  "self-govern": { runner: "container", model: "claude-haiku-4-5-20251001" },
};

// Generic fallback for any role without a built-in default. Keeps a crew role
// resolvable to a valid descriptor with safe container/hosted defaults.
const GENERIC_ROLE_DEFAULT = { runner: "container", model: "claude-sonnet-4-6" };

const RUNNER_DEFAULTS = {
  container: { labels: ["ubuntu-latest"], cli_path: "claude" },
  local: { labels: ["self-hosted"], cli_path: "claude" },
};

/**
 * Resolve runner and model settings for a named role.
 *
 * @param {object} cfg - Parsed config object (output of parseFlatYaml or loadConfig).
 * @param {string} role - One of "maker", "checker", "self-govern".
 * @returns {{ runner: string, runnerLabels: string[], cliPath: string,
 *             model: string, modelProvider: string, modelBaseUrl: string|undefined,
 *             transport: string, costClass: string, authEnv: string|null }}
 */
export function resolveRole(cfg, role) {
  const roleDefaults = ROLE_DEFAULTS[role] ?? GENERIC_ROLE_DEFAULT;
  const roleCfg = cfg.roles?.[role] ?? {};

  const runner = roleCfg.runner ?? roleDefaults.runner;
  const model = roleCfg.model ?? roleDefaults.model;

  const runnerDefaults = RUNNER_DEFAULTS[runner] ?? RUNNER_DEFAULTS.container;
  const runnerCfg = cfg.runners?.[runner] ?? {};
  const runnerLabels = runnerCfg.labels ?? runnerDefaults.labels;
  const cliPath = runnerCfg.cli_path ?? runnerDefaults.cli_path;

  const modelCfg = cfg.models?.[model] ?? {};
  const modelProvider = modelCfg.provider ?? "anthropic";
  const modelBaseUrl = modelCfg.base_url;

  // Cost classification: the registry decides transport and cost class, so the
  // budget gate can be repriced by provider instead of a hard-coded "local" check.
  const { transport, costClass, authEnv } = resolveProvider(modelProvider, cfg.providers);

  return { runner, runnerLabels, cliPath, model, modelProvider, modelBaseUrl, transport, costClass, authEnv };
}

// Self-test: run with --self-test to verify basic behavior without external deps.
if (process.argv.includes("--self-test")) {
  const cfg = {
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      "self-govern": { runner: "local", model: "local-default" },
    },
    runners: {
      container: { labels: ["ubuntu-latest"], cli_path: "claude" },
      local: { labels: ["self-hosted", "mac-mini"], cli_path: "claude" },
    },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
      "local-default": { provider: "local", base_url: "http://mac-mini.local:11434" },
    },
  };

  const maker = resolveRole(cfg, "maker");
  console.assert(maker.runner === "container", "maker runner");
  console.assert(maker.model === "claude-sonnet-4-6", "maker model");
  console.assert(maker.modelProvider === "anthropic", "maker provider");
  console.assert(maker.modelBaseUrl === undefined, "maker no base_url");
  console.assert(maker.costClass === "paid", "maker cost class");
  console.assert(maker.transport === "anthropic-cli", "maker transport");

  const selfGovern = resolveRole(cfg, "self-govern");
  console.assert(selfGovern.runner === "local", "self-govern runner");
  console.assert(selfGovern.model === "local-default", "self-govern model");
  console.assert(selfGovern.modelProvider === "local", "self-govern provider");
  console.assert(selfGovern.modelBaseUrl === "http://mac-mini.local:11434", "self-govern base_url");
  console.assert(selfGovern.runnerLabels.includes("mac-mini"), "self-govern labels");
  console.assert(selfGovern.costClass === "local", "self-govern cost class");

  // Fallback when no config provided.
  const bare = resolveRole({}, "checker");
  console.assert(bare.runner === "container", "bare checker runner");
  console.assert(bare.model === "claude-opus-4-8", "bare checker model");

  console.log("resolve-role self-test passed.");
}
