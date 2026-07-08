// Envisioner role (ADR-039/ADR-040, Milestone 5): scoped innovation proposals from an
// owner-approved direction, gated the same way as the researcher (an independent check
// at review-proposals.mjs before anything reaches the backlog). Fully offline: no model
// call, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planCycle } from "../scripts/agent/run-cycle.mjs";
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
      envisioner: { runner: "container", models: ["claude-opus-4-8", "local-default"] },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
      "local-default": { provider: "local", base_url: "http://mac-mini.local:11434" },
    },
    ...extra,
  };
}

test("prompts/roles/envisioner.txt exists and renders with the substitutions buildRolePrompt supplies", () => {
  const text = renderPrompt("envisioner", {
    ENVISIONER_ID: "envisioner:demo:run1:claude-opus-4-8",
    ENVISIONER_MODEL: "claude-opus-4-8",
    PROMOTED_LEARNINGS: "(none yet)",
  });
  assert.match(text, /ENVISIONER/);
  assert.match(text, /review-proposals\.mjs --proposal/);
  assert.match(text, /validate-work-item\.mjs/);
  assert.match(text, /Never claim, make, or check the item yourself/);
});

test("the envisioner prompt is a real file under source control, not generated", () => {
  const path = join(root, "prompts", "roles", "envisioner.txt");
  assert.doesNotThrow(() => readFileSync(path, "utf8"));
});

test("planCycle with --roles envisioner runs only the envisioner, off the default maker/checker sequence", () => {
  const cfg = baseCfg();
  const plan = planCycle({ target: "examples/demo-app", roles: ["envisioner"] }, cfg, "envision-only");
  assert.deepEqual(plan.roleSequence, ["envisioner"]);
  assert.equal(plan.envisioner.model, "claude-opus-4-8");
  assert.ok(plan.envisioner.route, "the envisioner still gets a resolved execution route");
});

test("a plain run-cycle with no override still runs only maker then checker", () => {
  const cfg = baseCfg();
  const plan = planCycle({ target: "examples/demo-app" }, cfg, "default-sequence");
  assert.deepEqual(plan.roleSequence, ["maker", "checker"]);
});
