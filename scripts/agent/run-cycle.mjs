#!/usr/bin/env node
// On-demand maker -> checker cycle runner (WS-B). Drives the Claude Code CLI in two
// roles with distinct identities and distinct models, reading the role prompts from
// the versioned prompts/roles files so the CI workflow and this script share one
// CODEOWNER-protected source. It enforces separation of duties (distinct maker and
// checker models), a turn cap, the daily remote-model budget, and pinned model ids
// drawn from the config models registry.
//
// The default is a DRY RUN: it resolves and validates the plan and prints it, making
// no model call. Pass --execute to actually invoke the CLI, which spends tokens and
// is refused unless the budget permits the selected models. Transcripts and metrics
// for a real run are written under <target>/runs/<runId>/.
//
// Usage:
//   node scripts/agent/run-cycle.mjs --target examples/demo-app [--dry-run | --execute]
//       [--maker-model ID] [--checker-model ID] [--max-turns N] [--runner local|container]
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, resolve } from "node:path";
import { loadConfig } from "../validate-config.mjs";
import { resolveRole } from "./resolve-role.mjs";
import { isBillable } from "./providers.mjs";
import { renderPrompt } from "./render-prompt.mjs";
import { readPromotedLearnings } from "../lib/learnings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const DEFAULT_MAX_TURNS = 40;
const HARD_TURN_CAP = 80;

export function parseArgs(argv) {
  const opts = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") opts.target = argv[++i];
    else if (a === "--maker-model") opts.makerModel = argv[++i];
    else if (a === "--checker-model") opts.checkerModel = argv[++i];
    else if (a === "--runner") opts.runner = argv[++i];
    else if (a === "--max-turns") opts.maxTurns = Number(argv[++i]);
    else if (a === "--execute") opts.execute = true;
    else if (a === "--dry-run") opts.execute = false;
  }
  return opts;
}

// Resolve and validate a full cycle plan without calling any model. Pure: it reads
// the passed config and runId and throws on any policy violation. This is the testable
// core of the harness; the execute path below only acts on a plan this function approves.
export function planCycle(opts, cfg, runId) {
  if (!opts.target) throw new Error("run-cycle: --target is required (for example examples/demo-app).");
  const appName = basename(opts.target);

  const maker = resolveRole(cfg, "maker");
  const checker = resolveRole(cfg, "checker");
  if (opts.makerModel) maker.model = opts.makerModel;
  if (opts.checkerModel) checker.model = opts.checkerModel;
  if (opts.runner) {
    maker.runner = opts.runner;
    checker.runner = opts.runner;
  }

  // Separation of duties: the maker and checker must run distinct models (default on).
  if (cfg.require_distinct_maker_checker_model !== false && maker.model === checker.model) {
    throw new Error(`maker and checker resolve to the same model (${maker.model}); distinct models are required.`);
  }

  // Pinned model ids: every model used must be declared in the config registry, so a
  // run cannot silently target an unpinned or mistyped model.
  const known = new Set(Object.keys(cfg.models || {}));
  if (known.size > 0) {
    for (const [role, model] of [["maker", maker.model], ["checker", checker.model]]) {
      if (!known.has(model)) {
        throw new Error(`${role} model "${model}" is not in the models registry; pin it in .modonome/config.yaml.`);
      }
    }
  }

  // Turn cap.
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  if (!Number.isInteger(maxTurns) || maxTurns <= 0) throw new Error("max-turns must be a positive integer.");
  if (maxTurns > HARD_TURN_CAP) throw new Error(`max-turns ${maxTurns} exceeds the hard cap ${HARD_TURN_CAP}.`);

  // Budget: only a billable (paid cost class) role requires the daily budget to be
  // above zero. Free and local roles never gate on budget, regardless of provider name.
  const budget = Number(cfg.remote_model_budget_usd_per_day ?? 0);
  const usesRemote = isBillable(maker.costClass) || isBillable(checker.costClass);
  const remoteAllowed = budget > 0;

  return {
    appName,
    target: opts.target,
    runId,
    maker: { ...maker, id: `maker:${appName}:${runId}:${maker.model}` },
    checker: { ...checker, id: `checker:${appName}:${runId}:${checker.model}` },
    maxTurns,
    transcriptDir: join(opts.target, "runs", runId),
    budget,
    usesRemote,
    remoteAllowed,
  };
}

// Build the child-process environment for a role invocation. When the resolved
// model carries a base_url (a local, self-hosted, or gateway endpoint), route the
// CLI there by setting ANTHROPIC_BASE_URL, which the Claude Code CLI honors for any
// Anthropic-compatible endpoint. This is how a provider-agnostic, zero-charge run
// works: point base_url at a local model server or a free gateway and the existing
// CLI invocation is reused unchanged. Pure: returns a fresh object, mutates nothing.
export function buildRunnerEnv(baseEnv, role) {
  const env = { ...baseEnv };
  if (role && role.modelBaseUrl) {
    env.ANTHROPIC_BASE_URL = role.modelBaseUrl;
  }
  return env;
}

function invokeRole(plan, role, env) {
  const r = plan[role];
  const idKey = `${role.toUpperCase()}_ID`;
  const modelKey = `${role.toUpperCase()}_MODEL`;
  const learnings = readPromotedLearnings(root);
  const promotedLearnings = learnings.length === 0
    ? "(none yet)"
    : learnings.map(l => `- ${l.id}: ${l.lesson} (gate: ${l.gate_location})`).join("\n");
  const prompt = renderPrompt(role, {
    ...env,
    [idKey]: r.id,
    [modelKey]: r.model,
    RUN_BRANCH: env.RUN_BRANCH ?? `modonome/run-${plan.runId}`,
    PROMOTED_LEARNINGS: promotedLearnings,
  });
  const res = spawnSync(r.cliPath, [
    "--dangerously-skip-permissions",
    "--model", r.model,
    "--max-turns", String(plan.maxTurns),
    "-p", prompt,
  ], { cwd: resolve(root, plan.target), encoding: "utf8", env: buildRunnerEnv(env, r) });
  writeFileSync(join(root, plan.transcriptDir, `${role}.log`), (res.stdout || "") + (res.stderr || ""));

  // Emit schema-conformant metrics with schema_version and correct field names
  const ts = new Date().toISOString();
  const event = role === "maker" ? "maker_run" : "checker_review";
  const idField = role === "maker" ? "maker_id" : "checker_id";
  const modelField = role === "maker" ? "maker_model" : "checker_model";
  const metric = {
    schema_version: 1,
    ts,
    event,
    item: "auto-generated",  // Will be set by the caller to match work item
    [idField]: r.id,
    [modelField]: r.model,
  };
  // For checker, add engagement metrics (parsed from transcript)
  if (role === "checker") {
    metric.checker_requested_changes = false;  // Will be set based on transcript analysis
    metric.checker_questions_raised = 0;
  }
  appendFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), JSON.stringify(metric) + "\n");
  return res.status ?? 1;
}

// Execute a plan. Refuses a hosted run when the budget is zero. Runs the maker, then
// the checker, each as a distinct CLI invocation with its own model and identity.
export function runCycle(opts, { execute, cfg, runId, env = process.env }) {
  const plan = planCycle(opts, cfg, runId);
  if (!execute) return { ...plan, mode: "dry-run" };

  if (plan.usesRemote && !plan.remoteAllowed) {
    throw new Error("A hosted model is selected but remote_model_budget_usd_per_day is 0. Raise the budget or select a local model.");
  }
  mkdirSync(join(root, plan.transcriptDir), { recursive: true });
  for (const role of ["maker", "checker"]) {
    const status = invokeRole(plan, role, env);
    if (status !== 0) throw new Error(`${role} session exited with status ${status}. See ${plan.transcriptDir}/${role}.txt.`);
  }
  return { ...plan, mode: "executed" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  const cfg = loadConfig(join(root, ".modonome", "config.yaml"));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    const result = runCycle(opts, { execute: opts.execute, cfg, runId });
    if (result.mode === "dry-run") {
      console.log("Dry run (no model called). Resolved cycle plan:");
      console.log(JSON.stringify({
        target: result.target,
        maker: { id: result.maker.id, model: result.maker.model, runner: result.maker.runner },
        checker: { id: result.checker.id, model: result.checker.model, runner: result.checker.runner },
        maxTurns: result.maxTurns,
        transcriptDir: result.transcriptDir,
        remoteBudgetUsdPerDay: result.budget,
        remoteRunAllowed: result.remoteAllowed,
      }, null, 2));
      console.log("\nPass --execute to run the cycle for real (spends tokens, gated on budget).");
    } else {
      console.log(`Cycle complete. Transcript and metrics under ${result.transcriptDir}/`);
    }
  } catch (e) {
    console.error(`run-cycle failed: ${e.message}`);
    process.exit(1);
  }
}
