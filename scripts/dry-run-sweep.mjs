#!/usr/bin/env node
// Read a target repo, build an adoption summary, and print the work it would
// propose. This mutates nothing. It is the safe first command.
// Usage: node scripts/dry-run-sweep.mjs <targetDir> [--emit-work-item]
import { existsSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { detectStack, detectProtected, detectInstructions, detectHotFiles } from "./lib/repo-detect.mjs";
import { deriveSignals, scoreProposals } from "./score-proposals.mjs";
import { auditCoverage, auditCoherence } from "./lib/control-panel-audit.mjs";

const args = process.argv.slice(2);
const target = args[0] || ".";
const emitWorkItem = args.includes("--emit-work-item");
const has = (p) => existsSync(join(target, p));
const startMs = Date.now();

function writeRunLog(runsDir, command, payload) {
  try {
    mkdirSync(runsDir, { recursive: true });
    const ts = new Date().toISOString();
    const safe = ts.replace(/[:.]/g, "-");
    writeFileSync(join(runsDir, `${safe}-${command}.json`), JSON.stringify({ ts, command, ...payload }, null, 2));
    const all = readdirSync(runsDir).filter((f) => f.endsWith(".json")).sort();
    for (const old of all.slice(0, Math.max(0, all.length - 30))) {
      try { unlinkSync(join(runsDir, old)); } catch { /* ignore */ }
    }
  } catch { /* log writes must never crash the command */ }
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

function proposeWork(stack, hotFiles) {
  const top = hotFiles && hotFiles.length > 0 ? hotFiles[0] : null;
  const topLabel = top ? `${top.file} (${top.changes} changes in recent history)` : null;

  const testProposal = topLabel
    ? `Add focused tests around the most-changed file: ${topLabel}.`
    : "Add focused tests around the most-changed module from recent history.";

  const generic = [
    testProposal,
    "Type or guard one high-risk function and remove an unchecked assumption.",
    "Document and gate one manual release or verification step.",
  ];
  if (stack.name.startsWith("Node")) generic.unshift(
    top
      ? `Add tests for the high-churn path in ${top.file}, then remove any dead feature-flag branches after owner approval.`
      : "Add tests around a brittle path, then remove a dead feature-flag branch after owner approval."
  );
  if (stack.name === "Python") generic.unshift(
    top
      ? `Isolate the flaky external call in ${top.file} behind a local seam with a regression test.`
      : "Isolate a flaky external call behind a local seam with a regression test."
  );
  if (stack.name.startsWith("Java")) generic.unshift("Add a JUnit 5 test for an untested service boundary and wire JaCoCo threshold to 80% line coverage.");
  if (stack.name === "C# (.NET)") generic.unshift("Add an xUnit test for an untested controller action and configure Coverlet threshold at 80% line coverage.");
  return generic.slice(0, 3);
}

// Only fires when the swept repo actually has a control panel at apps/control-panel
// (auditCoverage/auditCoherence report `skipped: true` and this returns nothing
// otherwise), so this stays safe and inert for the vast majority of host repos this
// same sweep runs against. Reuses the exact detection logic the coverage and coherence
// CI gates run, so a proposal here and a gate failure always agree.
function proposeControlPanelWork(targetDir) {
  const coverage = auditCoverage(targetDir);
  const coherence = auditCoherence(targetDir);
  if (coverage.skipped) return { proposals: [], omitted: 0 };

  const candidates = [
    ...coverage.missing.map(
      (field) =>
        `Wire the config lever \`${field}\` into a control-panel screen (apps/control-panel/src/screens/), or document why it stays unexposed in apps/control-panel/exposure.json.`
    ),
    ...coherence.violations.map((v) => `Control panel ${v.file}: ${v.detail}`),
  ];
  return { proposals: candidates.slice(0, 3), omitted: Math.max(0, candidates.length - 3) };
}

// Order proposals by descending deterministic priority score (highest-value,
// lowest-risk first). Signals are derived heuristically from each proposal's
// text and the hot-file churn count for the file it names, if any.
export function orderProposalsByScore(proposals, hotFiles) {
  const topChanges = hotFiles && hotFiles.length > 0 ? hotFiles[0].changes : 0;
  const withSignals = proposals.map((proposal) => ({
    proposal,
    signals: deriveSignals(proposal, { hotFileChanges: topChanges }),
  }));
  return scoreProposals(withSignals);
}

export function proposalToWorkItem(proposal, opts = {}) {
  const id = opts.id || `WI-auto-${slug(proposal)}`;
  const queuedAt = opts.queuedAt || new Date().toISOString();
  const allowedEditSet = opts.allowedEditSet || ["tests/"];
  const gates = opts.gates || [
    "node --test tests/*.test.mjs",
    "node scripts/check-style.mjs .",
  ];

  return {
    schema_version: 1,
    id,
    state: "queued",
    attempts: 0,
    max_attempts: 3,
    touches_protected_path: false,
    allowed_edit_set: allowedEditSet,
    gates,
    queued_at: queuedAt,
  };
}

const stack = detectStack(target);
const protectedPaths = detectProtected(target);
const instructions = detectInstructions(target);
const hotFiles = detectHotFiles(target);
const adopted = has(".autonomy") ? ".autonomy (adopted)" : ".modonome";

const controlPanelWork = proposeControlPanelWork(target);
const proposals = [...proposeWork(stack, hotFiles), ...controlPanelWork.proposals];
const scored = orderProposalsByScore(proposals, hotFiles);

if (emitWorkItem && scored.length > 0) {
  const workItem = proposalToWorkItem(scored[0].proposal);
  console.log(JSON.stringify(workItem, null, 2));
} else {
  const lines = [];
  lines.push("Modonome dry-run sweep");
  lines.push("Mode: dry-run. This run changed nothing.\n");
  lines.push(`Target: ${target}`);
  lines.push(`State directory: ${adopted}`);
  lines.push(`Detected stack: ${stack.name} (${stack.pm})`);
  lines.push(`Repo instructions found: ${instructions.length ? instructions.join(", ") : "none"}`);
  lines.push(`Repo snapshot: ${has(".modonome/snapshot/signature.json") ? "present (read .modonome/snapshot/map.md; verify with modonome snapshot . --verify)" : "none (run modonome snapshot . to generate an LLM-ready map)"}`);
  lines.push("\nGates it would adopt:");
  for (const g of stack.gates) lines.push(`  - ${g}`);
  lines.push("\nProtected paths it would never auto-merge:");
  for (const p of (protectedPaths.length ? protectedPaths : ["none detected, ask the owner to confirm"])) lines.push(`  - ${p}`);
  lines.push("\nProposed bounded work (each becomes a small reviewable pull request, ordered by priority score):");
  scored.forEach((s, i) => lines.push(`  ${i + 1}. [score ${s.score.toFixed(1)}] ${s.proposal}`));
  if (controlPanelWork.omitted > 0) {
    lines.push(`  ...and ${controlPanelWork.omitted} more control-panel finding(s); run npm run check:control-panel for the full list.`);
  }
  lines.push("\nRefused by default: autonomy off, no auto-merge, no protected-path edits, no remote spend, nothing shared across repos.");
  lines.push("Next safe step: review this output, then run `npx modonome scaffold .` to drop disabled, dry-run state files.");

  console.log(lines.join("\n"));
}

// Clean hands: dry-run is the read-only first command, so it writes nothing to a
// repo it was only asked to read. A run log is kept only once the repo is scaffolded
// (a .modonome directory already exists), where an audit trail is expected and the
// "changed nothing" promise no longer implies an untouched filesystem.
if (existsSync(join(target, ".modonome"))) {
  writeRunLog(join(target, ".modonome", "runs"), "dry-run", {
    argv: args,
    target,
    detected_stack: { name: stack.name, pm: stack.pm },
    protected_paths: protectedPaths,
    proposals,
    scored,
    hot_files: hotFiles,
    exit_code: 0,
    duration_ms: Date.now() - startMs,
  });
}
