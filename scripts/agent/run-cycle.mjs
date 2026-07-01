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
import { isBillable, resolveProvider } from "./providers.mjs";
import { renderPrompt } from "./render-prompt.mjs";
import { readPromotedLearnings } from "../lib/learnings.mjs";
import { resolveExecutionTarget } from "./route-action.mjs";
import { enqueue } from "./action-queue.mjs";
import { chatCompletion } from "./openai-client.mjs";
import { extractDiff, applyPatch } from "./apply-patch.mjs";
import { parseCheckerTelemetry } from "./parse-checker-telemetry.mjs";

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
    else if (a === "--enqueue") opts.enqueue = true;
    else if (a === "--worker-env") opts.workerEnv = argv[++i];
  }
  return opts;
}

// The execution environment this process is running in. Routing compares each
// role's required target against this to decide inline vs enqueue. Precedence:
// an explicit --worker-env flag, then MODONOME_WORKER_ENV, then unset (which
// makes every role inline, preserving single-environment behavior).
function localEnv(opts, env) {
  return opts.workerEnv ?? env.MODONOME_WORKER_ENV ?? null;
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

  // Execution-target routing: resolve where each role's model endpoint can run.
  // This throws fail-closed when a role's endpoint has no reachable runner target,
  // so an unreachable combination is caught during planning (including dry-run).
  const makerRoute = resolveExecutionTarget(maker, cfg);
  const checkerRoute = resolveExecutionTarget(checker, cfg);

  return {
    appName,
    target: opts.target,
    runId,
    maker: { ...maker, id: `maker:${appName}:${runId}:${maker.model}`, route: makerRoute },
    checker: { ...checker, id: `checker:${appName}:${runId}:${checker.model}`, route: checkerRoute },
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

// Render the role prompt with the same variables regardless of transport:
// identity/model placeholders, the run branch, and promoted learnings.
function buildRolePrompt(plan, role, env) {
  const r = plan[role];
  const idKey = `${role.toUpperCase()}_ID`;
  const modelKey = `${role.toUpperCase()}_MODEL`;
  const learnings = readPromotedLearnings(root);
  const promotedLearnings = learnings.length === 0
    ? "(none yet)"
    : learnings.map(l => `- ${l.id}: ${l.lesson} (gate: ${l.gate_location})`).join("\n");
  return renderPrompt(role, {
    ...env,
    [idKey]: r.id,
    [modelKey]: r.model,
    RUN_BRANCH: env.RUN_BRANCH ?? `modonome/run-${plan.runId}`,
    PROMOTED_LEARNINGS: promotedLearnings,
  });
}

// Write the transcript log and append the schema-conformant metric shared by
// every transport. `extra` merges additional fields into the metric record
// (for example whether an openai-http patch applied).
function writeTranscriptAndMetric(plan, role, r, transcriptText, extra = {}) {
  writeFileSync(join(root, plan.transcriptDir, `${role}.log`), transcriptText);

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
    ...extra,
  };
  // For checker, add engagement metrics (parsed from transcript)
  if (role === "checker") {
    const telemetry = parseCheckerTelemetry(transcriptText);
    metric.checker_requested_changes = telemetry.checker_requested_changes;
    metric.checker_questions_raised = telemetry.checker_questions_raised;
  }
  appendFileSync(join(root, plan.transcriptDir, "metrics.jsonl"), JSON.stringify(metric) + "\n");
}

function invokeRoleClaudeCli(plan, role, env) {
  const r = plan[role];
  const prompt = buildRolePrompt(plan, role, env);
  const res = spawnSync(r.cliPath, [
    "--dangerously-skip-permissions",
    "--model", r.model,
    "--max-turns", String(plan.maxTurns),
    "-p", prompt,
  ], { cwd: resolve(root, plan.target), encoding: "utf8", env: buildRunnerEnv(env, r) });
  writeTranscriptAndMetric(plan, role, r, (res.stdout || "") + (res.stderr || ""));
  return res.status ?? 1;
}

// Provider-native single-shot execution: render the same prompt, call an
// OpenAI-compatible chat-completions endpoint once, and turn the response
// into file changes deterministically by extracting a unified diff and
// applying it with git. A response with no diff, or a diff that does not
// apply cleanly, is a clean no-op for that role: it is recorded in the
// transcript and metric, and the run continues rather than failing.
//
// `deps.chatCompletionImpl` and `deps.applyPatchImpl` are injection seams for
// tests, so no real network call is ever required to exercise this path.
export async function invokeRoleOpenAI(plan, role, env, deps = {}) {
  const chatCompletionImpl = deps.chatCompletionImpl ?? chatCompletion;
  const applyPatchImpl = deps.applyPatchImpl ?? applyPatch;

  const r = plan[role];
  const prompt = buildRolePrompt(plan, role, env);
  const baseUrl = r.modelBaseUrl ?? deps.defaultBaseUrl ?? resolveProvider(r.modelProvider).defaultBaseUrl;
  const authToken = r.authEnv ? env[r.authEnv] : undefined;

  const result = await chatCompletionImpl({
    baseUrl,
    authToken,
    model: r.model,
    messages: [{ role: "user", content: prompt }],
    maxTokens: deps.maxTokens,
    timeoutMs: deps.timeoutMs,
  });

  const diff = extractDiff(result.text);
  const patch = diff
    ? applyPatchImpl(diff, resolve(root, plan.target))
    : { applied: false, reason: "no diff found in model response." };

  const transcript = `${result.text}\n\n[patch applied: ${patch.applied}] ${patch.reason}\n`;
  writeTranscriptAndMetric(plan, role, r, transcript, {
    patch_applied: patch.applied,
    patch_reason: patch.reason,
  });
  return 0;
}

function invokeRole(plan, role, env, deps) {
  const r = plan[role];
  if (r.transport === "openai-http") return invokeRoleOpenAI(plan, role, env, deps);
  return invokeRoleClaudeCli(plan, role, env);
}

// Execute a plan. Refuses a hosted run when the budget is zero. Runs the maker, then
// the checker, each as a distinct CLI invocation with its own model and identity.
// `deps` (chatCompletionImpl/applyPatchImpl/maxTokens/timeoutMs/defaultBaseUrl) is an
// injection seam for the openai-http transport, used by tests; production callers omit it.
export function runCycle(opts, { execute, cfg, runId, env = process.env, queueDir, deps }) {
  const plan = planCycle(opts, cfg, runId);
  if (!execute) return { ...plan, mode: "dry-run" };

  if (plan.usesRemote && !plan.remoteAllowed) {
    throw new Error("A hosted model is selected but remote_model_budget_usd_per_day is 0. Raise the budget or select a local model.");
  }

  // Routed execution. A role runs inline when the local environment already is
  // its resolved target (the default single-environment case). When a role's
  // target is another environment, or --enqueue is set, the action is written to
  // the durable queue for a worker in that environment to claim, and the cycle
  // returns without a model call. planCycle has already failed closed on any
  // unreachable combination.
  const here = localEnv(opts, env);
  const roles = ["maker", "checker"];
  const needsEnqueue = roles.some((role) => plan[role].route.target !== here);
  if (opts.enqueue || (here !== null && needsEnqueue)) {
    const enqueued = [];
    for (const role of roles) {
      const r = plan[role];
      const record = enqueue({
        id: r.id,
        target: r.route.target,
        role,
        model: r.model,
        transport: r.transport,
        payload: { runId, appName: plan.appName, maxTurns: plan.maxTurns },
      }, queueDir);
      enqueued.push({ id: record.id, target: record.target, role });
    }
    return { ...plan, mode: "enqueued", enqueued };
  }

  mkdirSync(join(root, plan.transcriptDir), { recursive: true });
  return runRoles(plan, roles, env, deps);
}

// Invoke each role in turn and produce the "executed" result. A role's
// transport decides whether invokeRole returns a status number synchronously
// (anthropic-cli) or a Promise (openai-http, which awaits the model call).
// When every role in this plan is synchronous, this returns the plan object
// directly, matching prior behavior exactly. When any role is async, this
// returns a Promise that resolves to the same shape, so callers of the
// openai-http path simply await runCycle's result.
function runRoles(plan, roles, env, deps) {
  const [role, ...rest] = roles;
  if (!role) return { ...plan, mode: "executed" };

  const status = invokeRole(plan, role, env, deps);
  if (status && typeof status.then === "function") {
    return status.then((resolved) => {
      if (resolved !== 0) throw new Error(`${role} session exited with status ${resolved}. See ${plan.transcriptDir}/${role}.txt.`);
      return runRoles(plan, rest, env, deps);
    });
  }
  if (status !== 0) throw new Error(`${role} session exited with status ${status}. See ${plan.transcriptDir}/${role}.txt.`);
  return runRoles(plan, rest, env, deps);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cfg = loadConfig(join(root, ".modonome", "config.yaml"));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    // runCycle returns a plain object for dry-run/enqueue/anthropic-cli execution,
    // or a Promise when the plan includes an openai-http role; await handles both.
    const result = await runCycle(opts, { execute: opts.execute, cfg, runId });
    if (result.mode === "dry-run") {
      console.log("Dry run (no model called). Resolved cycle plan:");
      console.log(JSON.stringify({
        target: result.target,
        maker: { id: result.maker.id, model: result.maker.model, runner: result.maker.runner, route: result.maker.route.target },
        checker: { id: result.checker.id, model: result.checker.model, runner: result.checker.runner, route: result.checker.route.target },
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
