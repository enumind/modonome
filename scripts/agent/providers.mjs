// Provider registry: maps a provider name to its transport, cost class, and
// auth env var. This is what the budget gate reads to decide whether a role
// is billable, instead of hard-coding "local" as the only free option.
//
// costClass values: "paid" (metered hosted spend), "free" (no charge but still
// remote), "local" (self-hosted, no charge, no network dependency).

// Built-in providers. A config's `providers` map (see resolveProvider) is
// merged on top, so a host repo can add or override entries without a code
// change here.
export const BUILTIN_PROVIDERS = {
  anthropic: { transport: "anthropic-cli", costClass: "paid", authEnv: "ANTHROPIC_API_KEY" },
  local: { transport: "openai-http", costClass: "local", authEnv: null, defaultBaseUrl: undefined },
  "github-models": {
    transport: "openai-http",
    costClass: "free",
    authEnv: "GITHUB_TOKEN",
    defaultBaseUrl: "https://models.github.ai/inference",
  },
  "openai-compatible": { transport: "openai-http", costClass: "free", authEnv: "OPENAI_API_KEY" },
};

// Unknown-provider fallback. Treated as paid/anthropic-cli so an unrecognized
// provider name never silently escapes the budget gate.
const UNKNOWN_PROVIDER_DEFAULT = { transport: "anthropic-cli", costClass: "paid", authEnv: null };

/**
 * Resolve a provider descriptor by name. Built-ins are merged with an optional
 * config-provided override map (cfg.providers), so a host repo can redefine or
 * add providers without touching this file. An unknown name (not built-in and
 * not in the override map) falls back to the paid/anthropic-cli default rather
 * than throwing, since existing configs that only use anthropic/local must
 * keep resolving without any providers map at all.
 *
 * @param {string} name - Provider name, e.g. "anthropic", "local", "github-models".
 * @param {object} [providersOverride] - Optional cfg.providers map to merge over built-ins.
 * @returns {{ transport: string, costClass: string, authEnv: string|null, defaultBaseUrl?: string }}
 */
export function resolveProvider(name, providersOverride) {
  const base = BUILTIN_PROVIDERS[name];
  const override = providersOverride?.[name];
  if (!base && !override) return { ...UNKNOWN_PROVIDER_DEFAULT };
  return { ...UNKNOWN_PROVIDER_DEFAULT, ...base, ...override };
}

// A cost class is billable only when it is "paid". Free and local roles never
// require remote_model_budget_usd_per_day.
export function isBillable(costClass) {
  return costClass === "paid";
}

// Self-test: run with --self-test to verify basic behavior without external deps.
if (process.argv.includes("--self-test")) {
  const anthropic = resolveProvider("anthropic");
  console.assert(anthropic.costClass === "paid", "anthropic is paid");
  console.assert(anthropic.transport === "anthropic-cli", "anthropic transport");

  const local = resolveProvider("local");
  console.assert(local.costClass === "local", "local is local");
  console.assert(isBillable(local.costClass) === false, "local is not billable");

  const gh = resolveProvider("github-models");
  console.assert(gh.costClass === "free", "github-models is free");
  console.assert(gh.defaultBaseUrl === "https://models.github.ai/inference", "github-models base url");

  const override = resolveProvider("anthropic", { anthropic: { costClass: "free" } });
  console.assert(override.costClass === "free", "override merges over built-in");

  const unknown = resolveProvider("mystery-provider");
  console.assert(unknown.costClass === "paid", "unknown provider defaults to paid");

  console.assert(isBillable("paid") === true, "paid is billable");
  console.assert(isBillable("free") === false, "free is not billable");
  console.assert(isBillable("local") === false, "local is not billable");

  console.log("providers self-test passed.");
}
