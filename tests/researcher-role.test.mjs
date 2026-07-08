// WI-042 (ADR-039/ADR-040 follow-up): the researcher actually running in the loop.
// planCycle already resolved a generic crew role (WI-040); the two gaps this closes
// are (1) a role in role_sequence with no prompt file failed only deep inside a real
// --execute run (ENOENT), not during planning/dry-run, and (2) there was no way to
// run a single role (the researcher alone) for a schedule independent of maker/checker
// without editing config. Fully offline: no model call, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planCycle, parseArgs, resolveRoleSequence } from "../scripts/agent/run-cycle.mjs";
import { renderPrompt } from "../scripts/agent/render-prompt.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function baseCfg(extra = {}) {
  return {
    schema_version: 1,
    remote_model_budget_usd_per_day: 0,
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      researcher: { runner: "container", model: "claude-opus-4-8" },
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
// prompts/roles/researcher.txt exists and renders.
// ---------------------------------------------------------------------------

test("prompts/roles/researcher.txt exists and renders with the substitutions buildRolePrompt supplies", () => {
  const text = renderPrompt("researcher", {
    RESEARCHER_ID: "researcher:demo:run1:claude-opus-4-8",
    RESEARCHER_MODEL: "claude-opus-4-8",
    RUN_BRANCH: "modonome/run-test",
    PROMOTED_LEARNINGS: "(none yet)",
  });
  assert.match(text, /RESEARCHER/);
  assert.match(text, /review-proposals\.mjs --proposal/);
  assert.match(text, /validate-work-item\.mjs/);
  assert.match(text, /Never claim, make, or check the item yourself/);
});

test("the researcher prompt is a real file under source control, not generated", () => {
  const path = join(root, "prompts", "roles", "researcher.txt");
  assert.doesNotThrow(() => readFileSync(path, "utf8"));
});

// ---------------------------------------------------------------------------
// --roles CLI override
// ---------------------------------------------------------------------------

test("parseArgs parses --roles into a trimmed, non-empty array", () => {
  assert.deepEqual(parseArgs(["--target", "x", "--roles", "researcher"]).roles, ["researcher"]);
  assert.deepEqual(parseArgs(["--roles", "maker, checker , researcher"]).roles, ["maker", "checker", "researcher"]);
});

test("resolveRoleSequence: an opts.roles override takes precedence over cfg.role_sequence and the default", () => {
  assert.deepEqual(resolveRoleSequence({ role_sequence: ["maker", "checker"] }, { roles: ["researcher"] }), ["researcher"]);
  assert.deepEqual(resolveRoleSequence({}, { roles: ["researcher"] }), ["researcher"]);
  // No override: falls through to cfg.role_sequence, then the default, exactly as before.
  assert.deepEqual(resolveRoleSequence({ role_sequence: ["maker", "checker", "researcher"] }, {}), ["maker", "checker", "researcher"]);
  assert.deepEqual(resolveRoleSequence({}, {}), ["maker", "checker"]);
  // An empty override array is not an override (matches the empty-role_sequence rule).
  assert.deepEqual(resolveRoleSequence({}, { roles: [] }), ["maker", "checker"]);
});

// ---------------------------------------------------------------------------
// planCycle: a scheduled loop can run the researcher alone.
// ---------------------------------------------------------------------------

test("planCycle with --roles researcher runs only the researcher, on the same config used for maker/checker", () => {
  const cfg = baseCfg();
  const plan = planCycle({ target: "examples/demo-app", roles: ["researcher"] }, cfg, "research-only");
  assert.deepEqual(plan.roleSequence, ["researcher"]);
  assert.equal(plan.researcher.model, "claude-opus-4-8");
  assert.equal(plan.researcher.id, "researcher:demo-app:research-only:claude-opus-4-8");
  assert.ok(plan.researcher.route, "the researcher still gets a resolved execution route");
});

test("planCycle with --roles maker,checker,researcher runs the full extended sequence", () => {
  const cfg = baseCfg();
  const plan = planCycle({ target: "examples/demo-app", roles: ["maker", "checker", "researcher"] }, cfg, "extended");
  assert.deepEqual(plan.roleSequence, ["maker", "checker", "researcher"]);
  assert.equal(plan.maker.model, "claude-sonnet-4-6");
  assert.equal(plan.checker.model, "claude-opus-4-8");
  assert.equal(plan.researcher.model, "claude-opus-4-8");
});

// ---------------------------------------------------------------------------
// Fail closed at planning time when a role has no prompt file, not at --execute.
// ---------------------------------------------------------------------------

test("planCycle throws when a role_sequence entry has no prompt file, caught during dry-run", () => {
  const cfg = baseCfg({
    role_sequence: ["maker", "checker", "no-such-role"],
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      "no-such-role": { runner: "container", model: "claude-opus-4-8" },
    },
  });
  assert.throws(
    () => planCycle({ target: "examples/demo-app" }, cfg, "missing-prompt"),
    /role "no-such-role" is in role_sequence but has no prompt at prompts\/roles\/no-such-role\.txt/,
  );
});

test("a dry-run (no --execute) catches the missing prompt too, planCycle is dry-run's own core", () => {
  const cfg = baseCfg({ role_sequence: ["researcher", "ghostrole"] });
  // "ghostrole" has a built-in resolveRole fallback (WI-040, the generic crew-role
  // default) but no prompt file: it must still fail during planning, since planCycle is
  // dry-run's own core. (This used "envisioner" until WI-053 shipped a real prompt for it.)
  assert.throws(
    () => planCycle({ target: "examples/demo-app" }, cfg, "dry-missing"),
    /ghostrole.*no prompt at prompts\/roles\/ghostrole\.txt/,
  );
});
