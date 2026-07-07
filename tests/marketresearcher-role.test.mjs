// Market-researcher role (ADR-039/ADR-040, Milestone 5): an opt-in ecosystem scan,
// gated by market_scan_enabled (default off) so a scheduled run makes no model call
// until an owner opts in. Findings are sourced and paraphrased only. Named
// "marketresearcher" (no hyphen) because render-prompt.mjs requires role names that
// match ^[a-z]+$. Fully offline: no model call, no network.
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
    market_scan_enabled: false,
    roles: {
      maker: { runner: "container", model: "claude-sonnet-4-6" },
      checker: { runner: "container", model: "claude-opus-4-8" },
      marketresearcher: { runner: "container", models: ["claude-haiku-4-5-20251001", "local-default"] },
    },
    runners: { container: { labels: ["ubuntu-latest"], cli_path: "claude" } },
    models: {
      "claude-sonnet-4-6": { provider: "anthropic" },
      "claude-opus-4-8": { provider: "anthropic" },
      "claude-haiku-4-5-20251001": { provider: "anthropic" },
      "local-default": { provider: "local", base_url: "http://mac-mini.local:11434" },
    },
    ...extra,
  };
}

test("prompts/roles/marketresearcher.txt exists and renders with the substitutions buildRolePrompt supplies", () => {
  const text = renderPrompt("marketresearcher", {
    MARKETRESEARCHER_ID: "marketresearcher:demo:run1:claude-haiku-4-5-20251001",
    MARKETRESEARCHER_MODEL: "claude-haiku-4-5-20251001",
    PROMOTED_LEARNINGS: "(none yet)",
  });
  assert.match(text, /MARKETRESEARCHER/);
  assert.match(text, /market_scan_enabled/);
  assert.match(text, /review-proposals\.mjs --proposal/);
  assert.match(text, /validate-work-item\.mjs/);
  assert.match(text, /paraphrase/);
});

test("the marketresearcher prompt is a real file under source control, not generated", () => {
  const path = join(root, "prompts", "roles", "marketresearcher.txt");
  assert.doesNotThrow(() => readFileSync(path, "utf8"));
});

test("planCycle with --roles marketresearcher runs only that role, off the default maker/checker sequence", () => {
  const cfg = baseCfg();
  const plan = planCycle({ target: "examples/demo-app", roles: ["marketresearcher"] }, cfg, "scan-only");
  assert.deepEqual(plan.roleSequence, ["marketresearcher"]);
  assert.equal(plan.marketresearcher.model, "claude-haiku-4-5-20251001");
  assert.ok(plan.marketresearcher.route, "the role still gets a resolved execution route");
});
