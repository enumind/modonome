// Execution-target routing. Deciding an action and executing it are separate
// concerns: a role whose model endpoint is only reachable from one environment
// (a local Ollama/llama.cpp host, a CI runner with models:read, a networked
// frontier API) must be routed to a worker that can reach it.
//
// resolveExecutionTarget maps a resolved role descriptor to the required
// execution-environment id, reading each configured runner target's declared
// reachability. Inline execution stays the default when the local environment
// already is the target; an unreachable combination fails closed with a clear
// message naming the role, the endpoint, and that no reachable target exists.
//
// Zero dependencies. No network.

// Classify a role's model endpoint into a coarse reachability descriptor:
//   kind: "local"    self-hosted / private-host endpoint (Ollama, llama.cpp)
//   kind: "github"   the github-models provider (needs models:read)
//   kind: "frontier" a networked openai/anthropic-compatible endpoint (needs egress)
// The classification drives which runner targets can serve the action.
export function classifyEndpoint(role) {
  const provider = role.modelProvider ?? "anthropic";
  const baseUrl = role.modelBaseUrl;
  if (provider === "local" || isPrivateHost(baseUrl)) {
    return { kind: "local", provider, baseUrl };
  }
  if (provider === "github-models") {
    return { kind: "github", provider, baseUrl };
  }
  return { kind: "frontier", provider, baseUrl };
}

// A base_url points at a private/self-hosted host when its hostname is
// localhost, a loopback address, a *.local mDNS name, or an RFC1918 range.
function isPrivateHost(baseUrl) {
  if (!baseUrl) return false;
  let host;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
  if (host.endsWith(".local")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

/**
 * Decide whether a runner target can reach a role's endpoint. A target declares
 * its reach with optional fields on its config entry:
 *   reachable_providers: provider names it can call (for example ["local"],
 *     ["github-models"], or ["openai-compatible"]).
 *   reachable_endpoints: base_url prefix patterns it can call.
 * A frontier endpoint is reachable from any target that declares egress, which
 * we model as a target listing the provider (or "*") in reachable_providers.
 *
 * @param {object} target - A runner config entry (cfg.runners[name]).
 * @param {{ kind: string, provider: string, baseUrl?: string }} roleEndpoint
 * @returns {boolean}
 */
export function canReach(target, roleEndpoint) {
  if (!target) return false;
  const providers = target.reachable_providers ?? [];
  const endpoints = target.reachable_endpoints ?? [];

  if (providers.includes("*")) return true;
  if (providers.includes(roleEndpoint.provider)) return true;

  if (roleEndpoint.baseUrl) {
    for (const pattern of endpoints) {
      if (roleEndpoint.baseUrl.startsWith(pattern)) return true;
    }
  }
  return false;
}

/**
 * Resolve the required execution target (environment id) for a role's model
 * endpoint. Reads cfg.runners and returns the first target that both declares an
 * environment and can reach the endpoint, preferring the role's own runner when
 * it qualifies so single-environment configs keep routing to themselves.
 *
 * Throws a fail-closed error when no configured runner target can reach the
 * endpoint, naming the role, the endpoint, and that no reachable target exists.
 *
 * @param {object} role - A resolved role descriptor (from resolveRole).
 * @param {object} cfg - The parsed config.
 * @returns {{ target: string, environment: string, endpoint: object, runner: string }}
 */
export function resolveExecutionTarget(role, cfg) {
  const endpoint = classifyEndpoint(role);
  const runners = cfg.runners ?? {};

  const order = [];
  if (role.runner && runners[role.runner]) order.push(role.runner);
  for (const name of Object.keys(runners)) {
    if (!order.includes(name)) order.push(name);
  }

  // Backward compatibility: a config where no runner declares any reachability
  // is a single-environment setup. Route the role to its own runner so existing
  // configs (which never opted into routing) see no behavior change.
  const declaresReach = order.some((name) => {
    const t = runners[name];
    return t && (t.reachable_providers !== undefined || t.reachable_endpoints !== undefined);
  });
  if (!declaresReach) {
    const name = role.runner && runners[role.runner] ? role.runner : (order[0] ?? "container");
    const target = runners[name] ?? {};
    const environment = target.environment ?? name;
    return { target: environment, environment, endpoint, runner: name };
  }

  for (const name of order) {
    const target = runners[name];
    if (!target) continue;
    if (canReach(target, endpoint)) {
      const environment = target.environment ?? name;
      return { target: environment, environment, endpoint, runner: name };
    }
  }

  const where = endpoint.baseUrl ? `${endpoint.provider} at ${endpoint.baseUrl}` : endpoint.provider;
  throw new Error(
    `route-action: role "${role.model ? role.model : "unknown"}" needs endpoint ${where} ` +
      `(${endpoint.kind}), but no configured runner target declares it can reach it. ` +
      `Add reachable_providers or reachable_endpoints to a runner in .modonome/config.yaml.`,
  );
}
