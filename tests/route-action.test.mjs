import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  resolveExecutionTarget,
  canReach,
  classifyEndpoint,
} from "../scripts/agent/route-action.mjs";

// A config where each runner declares its environment and reach.
function routedConfig() {
  return {
    runners: {
      local: {
        labels: ["self-hosted"],
        environment: "local-host",
        reachable_providers: ["local", "anthropic", "openai-compatible"],
      },
      container: {
        labels: ["ubuntu-latest"],
        environment: "ci",
        reachable_providers: ["github-models", "anthropic", "openai-compatible"],
      },
    },
  };
}

test("classifyEndpoint recognizes local, github, and frontier", () => {
  assert.equal(classifyEndpoint({ modelProvider: "local" }).kind, "local");
  assert.equal(
    classifyEndpoint({ modelProvider: "anthropic", modelBaseUrl: "http://localhost:11434" }).kind,
    "local",
  );
  assert.equal(classifyEndpoint({ modelProvider: "github-models" }).kind, "github");
  assert.equal(classifyEndpoint({ modelProvider: "anthropic" }).kind, "frontier");
  assert.equal(classifyEndpoint({ modelProvider: "openai-compatible" }).kind, "frontier");
});

test("classifyEndpoint treats *.local and RFC1918 hosts as local", () => {
  assert.equal(classifyEndpoint({ modelProvider: "openai-compatible", modelBaseUrl: "http://mac-mini.local:11434" }).kind, "local");
  assert.equal(classifyEndpoint({ modelProvider: "openai-compatible", modelBaseUrl: "http://192.168.1.5:8080" }).kind, "local");
  assert.equal(classifyEndpoint({ modelProvider: "openai-compatible", modelBaseUrl: "http://10.0.0.2:8080" }).kind, "local");
  assert.equal(classifyEndpoint({ modelProvider: "openai-compatible", modelBaseUrl: "http://172.16.0.1:8080" }).kind, "local");
  // A public host stays frontier.
  assert.equal(classifyEndpoint({ modelProvider: "openai-compatible", modelBaseUrl: "https://api.openai.com/v1" }).kind, "frontier");
});

test("canReach honors reachable_providers including wildcard", () => {
  const local = { reachable_providers: ["local"] };
  assert.equal(canReach(local, { provider: "local", kind: "local" }), true);
  assert.equal(canReach(local, { provider: "github-models", kind: "github" }), false);
  assert.equal(canReach({ reachable_providers: ["*"] }, { provider: "anything", kind: "frontier" }), true);
  assert.equal(canReach(undefined, { provider: "local", kind: "local" }), false);
});

test("canReach honors reachable_endpoints prefix patterns", () => {
  const t = { reachable_endpoints: ["http://gpu.internal:"] };
  assert.equal(canReach(t, { provider: "local", kind: "local", baseUrl: "http://gpu.internal:11434" }), true);
  assert.equal(canReach(t, { provider: "local", kind: "local", baseUrl: "http://other:11434" }), false);
});

test("resolveExecutionTarget routes a local model to the local host", () => {
  const cfg = routedConfig();
  const role = { runner: "local", model: "local-default", modelProvider: "local", modelBaseUrl: "http://localhost:11434" };
  const route = resolveExecutionTarget(role, cfg);
  assert.equal(route.target, "local-host");
  assert.equal(route.runner, "local");
  assert.equal(route.endpoint.kind, "local");
});

test("resolveExecutionTarget routes a github-models role to the ci environment", () => {
  const cfg = routedConfig();
  const role = { runner: "container", model: "gh-mini", modelProvider: "github-models" };
  const route = resolveExecutionTarget(role, cfg);
  assert.equal(route.target, "ci");
});

test("resolveExecutionTarget routes a frontier endpoint to the role's own egress runner", () => {
  const cfg = routedConfig();
  const role = { runner: "container", model: "claude-opus-4-8", modelProvider: "anthropic" };
  const route = resolveExecutionTarget(role, cfg);
  // Own runner (container -> ci) qualifies since it declares anthropic egress.
  assert.equal(route.target, "ci");
});

test("resolveExecutionTarget throws fail-closed when no target can reach the endpoint", () => {
  const cfg = {
    runners: {
      container: { environment: "ci", reachable_providers: ["github-models"] },
    },
  };
  const role = { runner: "container", model: "local-default", modelProvider: "local", modelBaseUrl: "http://localhost:11434" };
  assert.throws(
    () => resolveExecutionTarget(role, cfg),
    (e) => {
      assert.match(e.message, /route-action/);
      assert.match(e.message, /local-default/);
      assert.match(e.message, /localhost:11434/);
      assert.match(e.message, /no configured runner target/);
      return true;
    },
  );
});

test("resolveExecutionTarget stays backward compatible when no runner declares reach", () => {
  // A legacy single-environment config: no reachability fields anywhere.
  const cfg = {
    runners: {
      container: { labels: ["ubuntu-latest"], cli_path: "claude" },
      local: { labels: ["self-hosted"], cli_path: "claude" },
    },
  };
  const role = { runner: "container", model: "claude-opus-4-8", modelProvider: "anthropic" };
  const route = resolveExecutionTarget(role, cfg);
  // Falls back to the role's own runner name as the environment; no throw.
  assert.equal(route.target, "container");
  assert.equal(route.runner, "container");
});

test("resolveExecutionTarget uses environment id override when present", () => {
  const cfg = {
    runners: {
      container: { environment: "gh-ci", reachable_providers: ["anthropic"] },
    },
  };
  const role = { runner: "container", model: "m", modelProvider: "anthropic" };
  assert.equal(resolveExecutionTarget(role, cfg).target, "gh-ci");
});
