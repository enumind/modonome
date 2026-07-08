#!/usr/bin/env node
// CheckerProof: a seeded-defect benchmark for checker efficacy, sibling to
// agentproof/. AgentProof proves the deterministic ratchet catches known
// STRUCTURAL gaming patterns; this measures whether the independent checker
// (a model, not a pattern-match) catches the SEMANTIC weaknesses the ratchet
// admits it cannot see (README: "What it catches, and what it cannot"), and
// the same categories the hardened checker rubric names (prompts/roles/checker.txt
// point 1a): expected-value drift, cross-file assertion migration,
// vacuous-in-spirit assertions, and scope creep. Plus one negative control
// (checkerproof/scenarios/cp-05-*), because a checker that rejects everything
// scores perfectly on the other four while being useless.
//
// This is explicitly advisory, never a gate (ADR-046). Three properties that
// follow from that, all load-bearing:
//   1. It requires live model access. Unlike the ratchet, there is no
//      deterministic fallback: the whole point is measuring a model's
//      judgment. When no model is reachable (no API key, network unreachable,
//      binary absent), every applicable scenario is reported SKIPPED, never a
//      fabricated 0/N. A 0/N score is a real, damning result; a SKIPPED run
//      must never be confused with one.
//   2. It always exits 0. A low catch rate is evidence to act on (tighten the
//      checker rubric, escalate to a stronger model), not a merge-blocking
//      gate: the score is inherently noisy (one model call per scenario, no
//      retries, no majority vote) in a way AgentProof's deterministic checks
//      are not.
//   3. Every run's evidence is committed with the model id and timestamp that
//      produced it, so a score is never presented without knowing what
//      produced it or when.
//
// Usage:
//   node checkerproof/runner.mjs                  human-readable scorecard
//   node checkerproof/runner.mjs --json            machine-readable result
//   node checkerproof/runner.mjs --write-evidence  also write checkerproof/evidence/<ts>.json
import { readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildReviewPrompt, parseVerdict } from "../scripts/agent/review-diff.mjs";
import { resolveRole } from "../scripts/agent/resolve-role.mjs";
import { loadConfig } from "../scripts/validate-config.mjs";
import { chatCompletion } from "../scripts/agent/openai-client.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/**
 * Load every scenario module under checkerproof/scenarios/. Pure I/O, sorted
 * for stable output.
 */
export async function loadScenarios(dir = join(here, "scenarios")) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort();
  const scenarios = [];
  for (const f of files) {
    const mod = await import(join(dir, f));
    scenarios.push(mod.scenario);
  }
  return scenarios;
}

function commandOnPath(command) {
  if (command.includes("/") || command.includes("\\")) return existsSync(command);
  const pathVar = process.env.PATH || "";
  for (const dir of pathVar.split(process.platform === "win32" ? ";" : ":")) {
    if (dir && existsSync(join(dir, command))) return true;
  }
  return false;
}

/**
 * Run one scenario against the resolved checker role. Never throws: every
 * failure to reach a model (binary absent, spawn error, non-zero exit, no
 * base_url for an openai-http checker) resolves to a "skipped" result, never
 * a score.
 */
export async function runScenario(scenario, checker, deps = {}) {
  const prompt = buildReviewPrompt(scenario.diff, checker.model, "a maker agent");
  const fullPrompt = `${prompt}\n\nThe maker's stated rationale for this change: "${scenario.rationale}"`;

  let text;
  if (deps.reviewImpl) {
    text = await deps.reviewImpl(fullPrompt, checker);
  } else if (checker.transport === "anthropic-cli") {
    if (!commandOnPath(checker.cliPath || "claude")) {
      return { scenario, status: "skipped", detail: `'${checker.cliPath || "claude"}' not found on PATH.` };
    }
    const res = (deps.spawnImpl ?? spawnSync)(checker.cliPath || "claude", [
      "--permission-mode", "manual",
      "--model", checker.model,
      "--max-turns", "1",
      "-p", fullPrompt,
    ], { encoding: "utf8", env: process.env, timeout: 60000 });
    if (res.error || res.status !== 0) {
      return { scenario, status: "skipped", detail: `checker CLI unavailable or failed: ${res.error?.message ?? `exit ${res.status}: ${res.stderr}`}` };
    }
    text = res.stdout;
  } else if (checker.transport === "openai-http") {
    const baseUrl = checker.modelBaseUrl;
    if (!baseUrl) return { scenario, status: "skipped", detail: "checker model has no base_url configured." };
    try {
      const authToken = checker.authEnv ? process.env[checker.authEnv] : undefined;
      const chat = deps.chatCompletionImpl ?? chatCompletion;
      const result = await chat({ baseUrl, authToken, model: checker.model, messages: [{ role: "user", content: fullPrompt }] });
      text = result.text;
    } catch (e) {
      return { scenario, status: "skipped", detail: `checker endpoint unreachable: ${e.message}` };
    }
  } else {
    return { scenario, status: "skipped", detail: `unsupported checker transport "${checker.transport}".` };
  }

  const verdict = parseVerdict(text);
  const caught = verdict.requestChanges === scenario.expectRequestChanges;
  return { scenario, status: "scored", caught, verdict, raw: text };
}

async function main(argv) {
  const jsonMode = argv.includes("--json");
  const writeEvidence = argv.includes("--write-evidence");

  const cfg = loadConfig(join(root, ".modonome", "config.yaml"));
  const checker = resolveRole(cfg, "checker");
  const scenarios = await loadScenarios();

  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario, checker));
  }

  const scored = results.filter((r) => r.status === "scored");
  const skipped = results.filter((r) => r.status === "skipped");
  const caught = scored.filter((r) => r.caught).length;

  const report = {
    tool: "checkerproof",
    version: "1",
    checkerModel: checker.model,
    checkerTransport: checker.transport,
    timestamp: new Date().toISOString(),
    scenarios: results.map((r) => ({
      id: r.scenario.id, title: r.scenario.title, category: r.scenario.category,
      status: r.status, caught: r.caught ?? null, requestChanges: r.verdict?.requestChanges ?? null,
      expected: r.scenario.expectRequestChanges, detail: r.detail ?? null,
    })),
    scored: scored.length, skipped: skipped.length, caught, total: scenarios.length,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("CheckerProof: seeded-defect benchmark for checker efficacy");
    console.log("=============================================================");
    console.log(`Checker: ${checker.model} (${checker.transport})`);
    console.log("");
    for (const r of results) {
      if (r.status === "skipped") {
        console.log(`  SKIP  ${r.scenario.id}  ${r.scenario.title}  (${r.detail})`);
      } else {
        console.log(`  ${r.caught ? "PASS" : "MISS"}  ${r.scenario.id}  ${r.scenario.title}  (checker requested changes: ${r.verdict.requestChanges}, expected: ${r.scenario.expectRequestChanges})`);
      }
    }
    console.log("");
    if (scored.length === 0) {
      console.log(`Result: ALL SCENARIOS SKIPPED (no model access). This is not a 0/${scenarios.length} score; it is no score at all.`);
    } else {
      console.log(`Result: ${caught}/${scored.length} scored scenarios caught correctly (${skipped.length} skipped, no model access).`);
      console.log("This is advisory, not a gate: a low score is a signal to strengthen the checker rubric");
      console.log("or model, not a merge block. One model call per scenario, no retries or majority vote,");
      console.log("so treat any single run as a noisy sample, not a certified score.");
    }
  }

  if (writeEvidence) {
    const dir = join(root, "checkerproof", "evidence");
    mkdirSync(dir, { recursive: true });
    const filename = `run-${report.timestamp.replace(/[:.]/g, "-")}.json`;
    writeFileSync(join(dir, filename), JSON.stringify(report, null, 2));
    if (!jsonMode) console.log(`\nEvidence written: checkerproof/evidence/${filename}`);
  }

  return 0; // always advisory; never fails the run.
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
