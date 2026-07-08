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
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, resolve } from "node:path";
import { loadConfig } from "../validate-config.mjs";
import { resolveRole, resolveRoleModelChain } from "./resolve-role.mjs";
import { isBillable, resolveProvider } from "./providers.mjs";
import { renderPrompt, snapshotContext } from "./render-prompt.mjs";
import { readPromotedLearnings } from "../lib/learnings.mjs";
import { resolveExecutionTarget } from "./route-action.mjs";
import { enqueue } from "./action-queue.mjs";
import { chatCompletion } from "./openai-client.mjs";
import { extractDiff, applyPatch } from "./apply-patch.mjs";
import { parseCheckerTelemetry } from "./parse-checker-telemetry.mjs";
import { runToolLoopAdapter } from "./tool-loop-adapter.mjs";
import { deriveTriggerSequence } from "./triggers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const DEFAULT_MAX_TURNS = 40;
const HARD_TURN_CAP = 80;

// The maker/checker pair is the first-class separation-of-duties cycle and always
// runs. Any additional entries in the derived sequence are single-role crew
// invocations that do not participate in the maker/checker distinctness pairing.
const CORE_ROLE_SEQUENCE = ["maker", "checker"];

// Derive the ordered list of roles the cycle executes. An explicit --roles CLI
// override (opts.roles) takes precedence, so a single invocation can run just the
// researcher (or any other subset) without editing config, matching the scheduled
// operating model (ADR-040): research, make, and check can run on independent
// schedules against the same config. Absent that, an explicit cfg.role_sequence (a
// non-empty array of role names) is honored so a crew role added in config runs with
// no code change; otherwise it defaults to the maker/checker pair, preserving current
// behavior exactly. Pure: reads config and opts, returns a fresh array.
export function resolveRoleSequence(cfg, opts = {}) {
  if (Array.isArray(opts.roles) && opts.roles.length > 0) return [...opts.roles];
  const seq = cfg?.role_sequence;
  if (Array.isArray(seq) && seq.length > 0) return [...seq];
  // A role that declares trigger.after chains the sequence (WI-032). deriveTriggerSequence
  // returns null when no role chains, preserving the maker/checker default exactly, and
  // throws fail-closed on a cycle or a dangling role name before any model call.
  const chained = deriveTriggerSequence(cfg);
  if (chained) return chained;
  return [...CORE_ROLE_SEQUENCE];
}

// Resolve a role's execution mode from its model's config entry. The default is
// "patch" (the WI-029 single-shot-diff path) whenever exec_mode is absent, so
// existing configs behave exactly as before. Only "tool-loop" selects the
// agentic adapter path.
export function resolveExecMode(cfg, model) {
  const mode = cfg?.models?.[model]?.exec_mode;
  return mode === "tool-loop" ? "tool-loop" : "patch";
}

// Build a role's ordered runtime fallback chain: the resolved primary first (so a
// --maker-model/--checker-model CLI override always wins as chain[0]), then the rest of
// the role's configured `models` list with the primary's own entry (if repeated there)
// removed to avoid a duplicate attempt. Only registry-known models are usable fallback
// candidates; the primary already passed the pinning check the caller runs beforehand,
// so this only prunes additional entries, never throws. A role with no configured
// fallback list still gets a valid one-entry chain (the primary alone).
export function buildFallbackChain(cfg, role, resolved, known) {
  const primary = {
    model: resolved.model,
    modelProvider: resolved.modelProvider,
    modelBaseUrl: resolved.modelBaseUrl,
    transport: resolved.transport,
    costClass: resolved.costClass,
    authEnv: resolved.authEnv,
  };
  const rest = resolveRoleModelChain(cfg, role).filter((c) => c.model !== primary.model);
  const chain = [primary, ...rest];
  return known.size > 0 ? chain.filter((c) => known.has(c.model)) : chain;
}

// Conservative classifier: only a network-level failure (connection refused/reset, DNS
// failure, a request timeout) counts as "unreachable" and is safe to retry against the
// next model in a role's fallback chain. Anything else, an auth failure, a malformed
// response, a real non-2xx answer, came from a reachable endpoint and must propagate,
// never trigger a silent fallback to a different model.
export function isUnreachableError(err) {
  const msg = String((err && err.message) || err || "");
  return /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|timed out after \d+ms/i.test(msg);
}

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
    else if (a === "--roles") opts.roles = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
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

  // Runtime fallback chain: a role whose primary model turns out unreachable at
  // invocation time falls back to the next entry here rather than failing the whole
  // cycle. See invokeRoleOpenAI and isUnreachableError.
  maker.chain = buildFallbackChain(cfg, "maker", maker, known);
  checker.chain = buildFallbackChain(cfg, "checker", checker, known);

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

  const plan = {
    appName,
    target: opts.target,
    runId,
    maker: { ...maker, id: `maker:${appName}:${runId}:${maker.model}`, route: makerRoute, execMode: resolveExecMode(cfg, maker.model) },
    checker: { ...checker, id: `checker:${appName}:${runId}:${checker.model}`, route: checkerRoute, execMode: resolveExecMode(cfg, checker.model) },
    roleSequence: resolveRoleSequence(cfg, opts),
    maxTurns,
    transcriptDir: join(opts.target, "runs", runId),
    budget,
    usesRemote,
    remoteAllowed,
  };

  // Crew roles: any role in the sequence beyond the built-in maker/checker pair
  // resolves its provider/transport/route through the same machinery and is
  // attached to the plan under its own name. It is a single-role invocation that
  // does not participate in the maker/checker distinctness pairing above. Each
  // crew role's model is still budget-classified and route-resolved (fail-closed).
  for (const role of plan.roleSequence) {
    if (role === "maker" || role === "checker" || plan[role]) continue;
    // Every transport renders prompts/roles/<role>.txt (buildRolePrompt), so a role
    // added to role_sequence with no prompt file is caught here, during planning and
    // dry-run, rather than surfacing as an ENOENT deep inside a real --execute run.
    if (!existsSync(join(root, "prompts", "roles", `${role}.txt`))) {
      throw new Error(`role "${role}" is in role_sequence but has no prompt at prompts/roles/${role}.txt.`);
    }
    const crew = resolveRole(cfg, role);
    if (opts.runner) crew.runner = opts.runner;
    if (known.size > 0 && !known.has(crew.model)) {
      throw new Error(`${role} model "${crew.model}" is not in the models registry; pin it in .modonome/config.yaml.`);
    }
    crew.chain = buildFallbackChain(cfg, role, crew, known);
    const route = resolveExecutionTarget(crew, cfg);
    plan[role] = { ...crew, id: `${role}:${appName}:${runId}:${crew.model}`, route, execMode: resolveExecMode(cfg, crew.model) };
    if (isBillable(crew.costClass)) plan.usesRemote = true;
  }

  return plan;
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
  return snapshotContext() + renderPrompt(role, {
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
  // maker/checker keep their fixed event and id/model field names unchanged. A crew
  // role (any other name) records a generic role_run event with role-scoped fields,
  // so its metric is well-formed without borrowing the checker's schema.
  const event = role === "maker" ? "maker_run" : role === "checker" ? "checker_review" : `${role}_run`;
  const idField = role === "maker" ? "maker_id" : role === "checker" ? "checker_id" : `${role}_id`;
  const modelField = role === "maker" ? "maker_model" : role === "checker" ? "checker_model" : `${role}_model`;
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

// Tool allowlist for the CLI-transport maker/checker roles (ADR-045 5.4). Covers
// what the role prompts actually do: read/edit files within the pinned cwd, and
// drive git/gh for branch, commit, push, and PR operations, plus the gate runners
// the multi-language ratchet supports (JS/TS, Python, Java, .NET). This is
// deliberately broader than a single language, since the gates a work item
// declares are host-repo-specific and the ratchet itself supports all four.
const ROLE_ALLOWED_TOOLS = [
  "Read", "Edit", "Write",
  "Bash(git *)", "Bash(gh *)",
  "Bash(npm *)", "Bash(node *)", "Bash(yarn *)", "Bash(pnpm *)",
  "Bash(pytest *)", "Bash(python *)", "Bash(python3 *)",
  "Bash(mvn *)", "Bash(gradle *)",
  "Bash(dotnet *)",
];

/**
 * Build the argv for the CLI-transport maker/checker invocation. Exported and
 * pure (no spawn) so a test can assert on the exact flags without launching a
 * real binary or spending tokens.
 * @param {{ model: string }} r - Resolved role descriptor.
 * @param {{ maxTurns: number }} plan
 * @param {string} prompt
 * @returns {string[]}
 */
export function buildRoleCliArgs(r, plan, prompt) {
  return [
    "--permission-mode", "manual",
    "--allowedTools", ...ROLE_ALLOWED_TOOLS,
    "--model", r.model,
    "--max-turns", String(plan.maxTurns),
    "-p", prompt,
  ];
}

function invokeRoleClaudeCli(plan, role, env, deps = {}) {
  const spawnImpl = deps.spawnImpl ?? spawnSync;
  const r = plan[role];
  const prompt = buildRolePrompt(plan, role, env);
  // Empirically verified (2026-07-08) rather than assumed from --help text alone:
  // `--permission-mode acceptEdits` does NOT confine execution to --allowedTools
  // as one might expect; a live test allowed an unlisted `rm` deletion through it.
  // `--permission-mode manual` does: it denies anything outside --allowedTools with
  // a clean, non-hanging response even in non-interactive `-p` mode (no TTY means no
  // prompt to answer, so a denial resolves immediately rather than blocking). This
  // is a real narrowing of the blast radius versus --dangerously-skip-permissions
  // (which permits arbitrary shell execution, arbitrary file reads, and network
  // calls), though it is not the only containment layer: the pinned cwd below, the
  // CI-side gate integrity check running from a base-branch copy this session
  // cannot touch, the separate checker review, and the MODONOME_ARMED opt-in all
  // hold independently of what this session does inside its own permission scope.
  const res = spawnImpl(r.cliPath, buildRoleCliArgs(r, plan, prompt), {
    cwd: resolve(root, plan.target), encoding: "utf8", env: buildRunnerEnv(env, r),
  });
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

  const attemptOnce = async (er, extraMetric) => {
    const prompt = buildRolePrompt({ ...plan, [role]: er }, role, env);
    const baseUrl = er.modelBaseUrl ?? deps.defaultBaseUrl ?? resolveProvider(er.modelProvider).defaultBaseUrl;
    const authToken = er.authEnv ? env[er.authEnv] : undefined;

    const result = await chatCompletionImpl({
      baseUrl,
      authToken,
      model: er.model,
      messages: [{ role: "user", content: prompt }],
      maxTokens: deps.maxTokens,
      timeoutMs: deps.timeoutMs,
    });

    const diff = extractDiff(result.text);
    const patch = diff
      ? applyPatchImpl(diff, resolve(root, plan.target))
      : { applied: false, reason: "no diff found in model response." };

    const transcript = `${result.text}\n\n[patch applied: ${patch.applied}] ${patch.reason}\n`;
    writeTranscriptAndMetric(plan, role, er, transcript, {
      patch_applied: patch.applied,
      patch_reason: patch.reason,
      ...extraMetric,
    });
  };

  // No runtime fallback chain (a hand-built plan, or a role with a single-model chain):
  // exactly the original one-shot behavior. Any error propagates uncaught, as before.
  const chain = Array.isArray(r.chain) && r.chain.length > 1 ? r.chain : null;
  if (!chain) {
    await attemptOnce(r, {});
    return 0;
  }

  const attempted = [];
  let lastErr;
  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    // Never silently spend past the budget: skip a paid candidate this run cannot
    // afford exactly as if it were never in the chain, no attempt, no error.
    if (isBillable(candidate.costClass) && !plan.remoteAllowed) continue;

    attempted.push(candidate.model);
    const er = { ...r, ...candidate, id: `${role}:${plan.appName}:${plan.runId}:${candidate.model}` };
    try {
      await attemptOnce(er, attempted.length > 1 ? { model_fallback_from: attempted.slice(0, -1) } : {});
      return 0;
    } catch (err) {
      const isLast = i === chain.length - 1;
      if (!isUnreachableError(err) || isLast) throw err;
      lastErr = err;
    }
  }
  // Every candidate was unaffordable under the current budget; none was attempted.
  throw lastErr ?? new Error(`${role}: no model in the fallback chain is affordable under the current budget.`);
}

// Load the single agentic-CLI adapter entry from adapters.json for the tool-loop
// path. Returns the first declared adapter, or null when the manifest is empty or
// absent (which makes tool-loop degrade to a bounded refusal, never a crash).
function loadAdapterEntry(deps = {}) {
  if (deps.adapterEntry !== undefined) return deps.adapterEntry;
  const path = join(root, "adapters.json");
  if (!existsSync(path)) return null;
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    const adapters = Array.isArray(manifest) ? manifest : manifest.adapters;
    return Array.isArray(adapters) && adapters.length > 0 ? adapters[0] : null;
  } catch {
    return null;
  }
}

// Agentic tool-loop execution: spawn the declared external coding CLI (adapt-first,
// ADR-032) pointed at the resolved OpenAI-compatible endpoint. Containment, the turn
// cap, and the wall-clock timeout are enforced in tool-loop-adapter.mjs. The result
// is written through the same writeTranscriptAndMetric helper as every other
// transport, so telemetry parsing and file naming stay consistent. Returns the
// adapter's status; a bounded failure (timeout, non-zero exit, cap) is a clean
// non-zero status recorded in the transcript, not a throw.
export async function invokeRoleToolLoop(plan, role, env, deps = {}) {
  const runToolLoopImpl = deps.runToolLoopImpl ?? runToolLoopAdapter;
  const r = plan[role];
  const prompt = buildRolePrompt(plan, role, env);
  const baseUrl = r.modelBaseUrl ?? deps.defaultBaseUrl ?? resolveProvider(r.modelProvider).defaultBaseUrl;
  const authToken = r.authEnv ? env[r.authEnv] : undefined;
  const adapterEntry = loadAdapterEntry(deps);

  const result = await runToolLoopImpl({
    prompt,
    endpoint: { baseUrl, authToken, model: r.model },
    root,
    target: plan.target,
    adapterEntry,
    maxTurns: plan.maxTurns,
    timeoutMs: deps.toolLoopTimeoutMs,
    env,
    deps,
  });

  writeTranscriptAndMetric(plan, role, r, result.transcript, {
    exec_mode: "tool-loop",
    adapter: adapterEntry ? adapterEntry.name : null,
    adapter_status: result.status,
    adapter_reason: result.reason,
  });
  // A bounded adapter failure (timeout, non-zero exit, cap hit) is recorded in
  // the metric above and is a clean no-op for the cycle, mirroring the single-shot
  // path: the cycle continues rather than aborting on a bounded outcome.
  return 0;
}

function invokeRole(plan, role, env, deps) {
  const r = plan[role];
  if (r.transport === "openai-http") {
    return r.execMode === "tool-loop"
      ? invokeRoleToolLoop(plan, role, env, deps)
      : invokeRoleOpenAI(plan, role, env, deps);
  }
  return invokeRoleClaudeCli(plan, role, env, deps);
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
  const roles = plan.roleSequence;
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
