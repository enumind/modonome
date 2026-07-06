import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { parseFlatYaml } from "../../scripts/lib/yaml-lite.mjs";
import { patchConfig } from "./server/modonomeWriter.mjs";
import { validateConfig } from "../../scripts/lib/config-validate.mjs";
import { resolveRole } from "../../scripts/agent/resolve-role.mjs";
import { planCycle } from "../../scripts/agent/run-cycle.mjs";

// This repo's root package has zero dependencies by design, so tests parse with the
// same hand-rolled parser scripts/validate-config.mjs itself uses (js-yaml is a
// dependency of apps/control-panel only, not of the root package these tests run in).
const yaml = { load: parseFlatYaml };

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const realConfigPath = join(root, ".modonome", "config.yaml");
// The host-mode example scaffold: a fresh install with no roles/models/runners/
// providers block at all. Host mode is a first-class mode, not the demo-only path, so
// the writer's "block absent from the file" path needs its own coverage against this
// exact fixture rather than only ever exercising the rich, pre-populated product config.
const hostConfigPath = join(root, "examples", "demo-app", ".modonome", "config.yaml");

// Every test operates on a scratch copy of a real config.yaml, never the file itself,
// so a bug here can never corrupt real state.
function scratchModonomeDir(sourcePath = realConfigPath) {
  const dir = mkdtempSync(join(tmpdir(), "modonome-writer-test-"));
  writeFileSync(join(dir, "config.yaml"), readFileSync(sourcePath, "utf8"));
  return dir;
}

// Lines present in the original file that are untouched by a given patch: every line
// outside the blocks the patch's keys live in. Used to assert a patch changes only
// what it says it changes.
function otherLines(originalText, touchedTopKeys) {
  const lines = originalText.split("\n");
  const out = [];
  let skipping = false;
  for (const line of lines) {
    const m = /^([A-Za-z0-9_]+):\s*$/.exec(line);
    if (m && touchedTopKeys.includes(m[1])) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (line.trim() === "" || /^\s/.test(line)) continue;
      skipping = false;
    }
    out.push(line);
  }
  return out;
}

test("adding a model preserves every comment attached to an untouched entry", () => {
  const dir = scratchModonomeDir();
  const before = readFileSync(join(dir, "config.yaml"), "utf8");
  const oldModels = yaml.load(before).models;

  patchConfig(dir, {
    models: {
      ...oldModels,
      "lmstudio-maker": { provider: "local", base_url: "http://192.168.1.20:1234/v1" },
    },
  });

  const after = readFileSync(join(dir, "config.yaml"), "utf8");
  assert.match(after, /lmstudio-maker:\n\s+provider: local\n\s+base_url: http:\/\/192\.168\.1\.20:1234\/v1/);

  // The commented-out example entries under models: are inert text, never matched as
  // real entries, so they must survive completely untouched.
  assert.match(after, /# Off-by-default example: a free-tier gateway model\./);
  assert.match(after, /#\s+gh-gpt-4o-mini:/);
  assert.match(after, /#\s+provider: github-models/);
  assert.match(after, /# Off-by-default example: a paid frontier model from another vendor/);
  assert.match(after, /#\s+frontier-gpt:/);

  // Everything outside the models: block is byte-for-byte identical.
  assert.deepStrictEqual(otherLines(after, ["models"]), otherLines(before, ["models"]));

  rmSync(dir, { recursive: true, force: true });
});

test("editing a role's model leaves sibling roles and the header comment untouched", () => {
  const dir = scratchModonomeDir();
  const before = readFileSync(join(dir, "config.yaml"), "utf8");
  const oldConfig = yaml.load(before);

  patchConfig(dir, {
    roles: {
      ...oldConfig.roles,
      maker: { ...oldConfig.roles.maker, model: "local-default" },
    },
  });

  const after = readFileSync(join(dir, "config.yaml"), "utf8");
  assert.match(after, /maker:\n\s+runner: container\n\s+model: local-default/);
  assert.match(after, /checker:\n\s+runner: container\n\s+model: claude-opus-4-8/);
  assert.match(after, /self-govern:\n\s+runner: container\n\s+model: claude-haiku-4-5-20251001/);
  assert.match(after, /# Runner and model assignment for cost-bearing agent roles \(WS-H\)\./);
  assert.deepStrictEqual(otherLines(after, ["roles"]), otherLines(before, ["roles"]));

  rmSync(dir, { recursive: true, force: true });
});

test("removing a model drops only that entry", () => {
  const dir = scratchModonomeDir();
  const oldModels = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8")).models;
  const { "local-default": _dropped, ...remaining } = oldModels;

  patchConfig(dir, { models: remaining });

  const after = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));
  assert.ok(!("local-default" in after.models));
  assert.deepStrictEqual(Object.keys(after.models).sort(), Object.keys(remaining).sort());

  rmSync(dir, { recursive: true, force: true });
});

test("rejects a patch that would put maker and checker on the same model, and writes nothing", () => {
  const dir = scratchModonomeDir();
  const before = readFileSync(join(dir, "config.yaml"), "utf8");
  const oldConfig = yaml.load(before);

  assert.throws(() =>
    patchConfig(dir, {
      roles: { ...oldConfig.roles, checker: { ...oldConfig.roles.checker, model: oldConfig.roles.maker.model } },
    }),
  );

  const after = readFileSync(join(dir, "config.yaml"), "utf8");
  assert.strictEqual(after, before, "a rejected patch must never touch the file on disk");

  rmSync(dir, { recursive: true, force: true });
});

test("rejects an unknown top-level config key", () => {
  const dir = scratchModonomeDir();
  assert.throws(() => patchConfig(dir, { not_a_real_key: true }), /not editable from the panel/);
  rmSync(dir, { recursive: true, force: true });
});

test("adding an entry to the last block in the file keeps the file's trailing newline", () => {
  const dir = scratchModonomeDir();
  const before = readFileSync(join(dir, "config.yaml"), "utf8");
  assert.ok(before.endsWith("\n"), "fixture assumption: the real config.yaml ends with a newline");
  const oldProviders = yaml.load(before).providers;

  patchConfig(dir, { providers: { ...oldProviders, "test-gateway": { transport: "openai-http", costClass: "free" } } });

  const after = readFileSync(join(dir, "config.yaml"), "utf8");
  assert.ok(after.endsWith("\n"), "the file must still end with a newline after appending the last block's new entry");
  assert.match(after, /test-gateway:\n\s+transport: openai-http\n\s+costClass: free\n$/);

  rmSync(dir, { recursive: true, force: true });
});

test("an LM-Studio-shaped model wired to a role validates cleanly end to end", () => {
  const dir = scratchModonomeDir();
  const oldConfig = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));

  patchConfig(dir, {
    models: {
      ...oldConfig.models,
      "lmstudio-checker": { provider: "local", base_url: "http://mac-mini.local:1234/v1" },
    },
    roles: { ...oldConfig.roles, checker: { ...oldConfig.roles.checker, model: "lmstudio-checker" } },
  });

  const finalConfig = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));
  assert.deepStrictEqual(validateConfig(finalConfig), []);
  assert.notStrictEqual(finalConfig.roles.maker.model, finalConfig.roles.checker.model);

  rmSync(dir, { recursive: true, force: true });
});

// --- Host mode: a fresh scaffold with no roles/models/runners/providers yet --------
// examples/demo-app/.modonome/config.yaml is a real, live-readable host-mode fixture
// (server/api.mjs's DEFAULT_DIRS.host points at it) with none of the four nested maps
// present at all. Wiring a first role/model pair into it exercises the writer's
// "block absent from the file" append path, which the product-config tests above never
// touch since that file already has every block populated.
test("host mode: wiring the first-ever roles/models block into a bare scaffold", () => {
  const before = readFileSync(hostConfigPath, "utf8");
  assert.ok(!/^models:/m.test(before), "fixture assumption: the host scaffold has no models: block yet");
  assert.ok(!/^roles:/m.test(before), "fixture assumption: the host scaffold has no roles: block yet");

  const dir = scratchModonomeDir(hostConfigPath);
  patchConfig(dir, {
    models: { "lmstudio-maker": { provider: "local", base_url: "http://192.168.1.20:1234/v1" } },
    roles: { maker: { runner: "local", model: "lmstudio-maker" }, checker: { runner: "container", model: "claude-opus-4-8" } },
  });

  const after = readFileSync(join(dir, "config.yaml"), "utf8");
  const finalConfig = yaml.load(after);
  assert.deepStrictEqual(finalConfig.models, { "lmstudio-maker": { provider: "local", base_url: "http://192.168.1.20:1234/v1" } });
  assert.deepStrictEqual(finalConfig.roles.maker, { runner: "local", model: "lmstudio-maker" });
  assert.deepStrictEqual(validateConfig(finalConfig), []);
  assert.strictEqual(resolveRole(finalConfig, "maker").transport, "openai-http");

  // Every pre-existing scalar/array line (the arming levers, caps, trusted authors,
  // protected paths) is untouched and in the same order; only new content was
  // appended. Blank lines are excluded from this comparison: appending two brand-new
  // top-level blocks (models, then roles) each add their own separating blank line by
  // design, so the blank-line *count* legitimately grows; content does not.
  const nonBlank = (lines) => lines.filter((l) => l.trim() !== "");
  assert.deepStrictEqual(nonBlank(otherLines(after, ["models", "roles"])), nonBlank(before.split("\n")));

  rmSync(dir, { recursive: true, force: true });
});

// --- Outcome tests: prove the written config actually drives correct routing, not
// just that the YAML round-trips. A patch that "looks right" but doesn't resolve to
// the intended transport/route would be a silent no-op in production.
test("a role wired to a local model resolves to openai-http transport, not the Anthropic CLI path", () => {
  const dir = scratchModonomeDir();
  const oldConfig = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));

  patchConfig(dir, {
    models: { ...oldConfig.models, "lmstudio-maker": { provider: "local", base_url: "http://192.168.1.20:1234/v1" } },
    roles: { ...oldConfig.roles, maker: { ...oldConfig.roles.maker, runner: "local", model: "lmstudio-maker" } },
  });

  const finalConfig = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));
  const maker = resolveRole(finalConfig, "maker");
  assert.strictEqual(maker.transport, "openai-http", "a local-provider model must never resolve to the anthropic-cli transport");
  assert.strictEqual(maker.modelBaseUrl, "http://192.168.1.20:1234/v1");
  assert.strictEqual(maker.costClass, "local");

  // planCycle is the actual pre-flight the agent runner executes before invoking
  // anything; it must accept this plan without throwing (distinct models, both
  // models pinned in the registry, and, since neither runner in this config
  // declares reachable_providers/reachable_endpoints, the backward-compatible
  // single-environment fallback in resolveExecutionTarget, not a reachability error).
  const plan = planCycle({ target: "examples/demo-app" }, finalConfig, "test-run");
  assert.strictEqual(plan.maker.transport, "openai-http");
  assert.strictEqual(plan.maker.route.runner, "local");

  rmSync(dir, { recursive: true, force: true });
});

test("planCycle fails closed when a runner declares reachability but none can reach the wired endpoint", () => {
  const dir = scratchModonomeDir();
  const oldConfig = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));

  // Once any runner in the file opts into declaring what it can reach, an endpoint
  // no declared runner covers must fail closed rather than silently falling back.
  // This is the exact gotcha behind the Phase B "ubuntu-latest can't reach a LAN-only
  // LM Studio box" caveat: it only self-corrects once a runner is honest about its
  // real reach, which is precisely what a self-hosted runner registration should add.
  patchConfig(dir, {
    models: { ...oldConfig.models, "lmstudio-maker": { provider: "local", base_url: "http://192.168.1.20:1234/v1" } },
    roles: { ...oldConfig.roles, maker: { ...oldConfig.roles.maker, runner: "container", model: "lmstudio-maker" } },
    runners: { ...oldConfig.runners, container: { ...oldConfig.runners.container, reachable_providers: ["anthropic"] } },
  });

  const finalConfig = yaml.load(readFileSync(join(dir, "config.yaml"), "utf8"));
  assert.throws(
    () => planCycle({ target: "examples/demo-app" }, finalConfig, "test-run"),
    /no configured runner target declares it can reach it/,
  );

  rmSync(dir, { recursive: true, force: true });
});
