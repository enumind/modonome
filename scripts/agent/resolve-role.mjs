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
// The role's primary model: an explicit `model`, else the head of its prioritized
// `models` fallback list, else the role default. Keeping `model` authoritative when
// present preserves every existing config; a role that lists only `models` resolves to
// its first choice as the primary.
function primaryModel(roleCfg, roleDefaults) {
  if (roleCfg.model) return roleCfg.model;
  if (Array.isArray(roleCfg.models) && roleCfg.models.length > 0) return roleCfg.models[0];
  return roleDefaults.model;
}

export function resolveRole(cfg, role) {
  const roleDefaults = ROLE_DEFAULTS[role] ?? GENERIC_ROLE_DEFAULT;
  const roleCfg = cfg.roles?.[role] ?? {};

  const runner = roleCfg.runner ?? roleDefaults.runner;
  const model = primaryModel(roleCfg, roleDefaults);

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

  // The agent's declared capability profile. Skills and tools are declarative tags the
  // loop and prompts can read; they grant no capability by themselves. Empty arrays when
  // a role declares none, so callers never null-check.
  const skills = Array.isArray(roleCfg.skills) ? [...roleCfg.skills] : [];
  const tools = Array.isArray(roleCfg.tools) ? [...roleCfg.tools] : [];

  return { runner, runnerLabels, cliPath, model, modelProvider, modelBaseUrl, transport, costClass, authEnv, skills, tools };
}

// Resolve a role's prioritized model list into an ordered array of fully-resolved model
// descriptors, highest priority first. Source is roleCfg.models when present, else the
// single primary model, so a role with one model still yields a one-entry chain. Each
// entry carries the same provider/transport/cost fields resolveRole returns, so a caller
// can walk the chain and fall back from one model to the next.
export function resolveRoleModelChain(cfg, role) {
  const roleDefaults = ROLE_DEFAULTS[role] ?? GENERIC_ROLE_DEFAULT;
  const roleCfg = cfg.roles?.[role] ?? {};
  const list =
    Array.isArray(roleCfg.models) && roleCfg.models.length > 0
      ? roleCfg.models
      : [primaryModel(roleCfg, roleDefaults)];

  return list.map((model) => {
    const modelCfg = cfg.models?.[model] ?? {};
    const modelProvider = modelCfg.provider ?? "anthropic";
    const { transport, costClass, authEnv } = resolveProvider(modelProvider, cfg.providers);
    return { model, modelProvider, modelBaseUrl: modelCfg.base_url, transport, costClass, authEnv };
  });
}

// Pick the first model in a chain that is affordable under the daily budget, so a
// prioritized list falls back from a paid frontier choice to a free or local one when
// no budget is set. A local or free model is always affordable; a paid model needs
// budget > 0. Returns null when nothing in the chain is affordable, which a caller
// treats as "this role cannot run under the current budget" rather than a silent
// downgrade. Pure: it decides on cost class alone, never a clock or a network probe
// (runtime unreachability fallback is the loop's job, tracked separately).
export function selectUsableModel(chain, { budgetUsdPerDay = 0 } = {}) {
  for (const entry of chain) {
    const affordable = entry.costClass !== "paid" || budgetUsdPerDay > 0;
    if (affordable) return entry;
  }
  return null;
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
