#!/usr/bin/env node
// Self-application conformance (ADR-025). Proves that Modonome holds itself to the
// governance it sells. Every check is repo-local and makes no external call, so it
// runs in CI with no token and no network. The one invariant it cannot verify on
// its own (branch protection requires repo-admin API access) is reported as an
// explicit action item, not a silent pass.
//
// Usage: node scripts/check-self-application.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./lib/jsonschema.mjs";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.MODONOME_ROOT ? process.env.MODONOME_ROOT : join(here, "..");
const problems = [];
const notes = [];

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// 1. The CI workflow must actually run the gates the project sells. A gate the
//    project advertises but does not run in its own CI is the core self-application
//    failure this script exists to prevent.
const ci = existsSync(join(root, ".github/workflows/ci.yml")) ? read(".github/workflows/ci.yml") : "";
// Strip YAML comment lines (including indented ones) so a commented-out step cannot
// satisfy a needle check. This covers both "# node --test" and "  # node --test".
const activeCI = ci.split("\n").filter((l) => !l.trimStart().startsWith("#")).join("\n");
const REQUIRED_GATES = [
  { name: "drift guard", needle: "check-drift.mjs" },
  { name: "style check", needle: "check-style.mjs" },
  { name: "tests", needle: "node --test" },
  { name: "repo hygiene", needle: "check-repo-hygiene.mjs" },
  { name: "anti-gaming ratchet", needle: "guard-ratchet.mjs" },
  { name: "AgentProof", needle: "agentproof/runner.mjs" },
  { name: "learning traceability", needle: "check-learning-traceability.mjs" },
  { name: "capability promotion readiness", needle: "check-promotion-readiness.mjs" },
  { name: "work item validation", needle: "check-work-items.mjs" },
  { name: "checker engagement", needle: "check-checker-engagement.mjs" },
  { name: "license and adapter boundary", needle: "check-licenses.mjs" },
  { name: "prompt behavioral regression", needle: "test-prompt-behavior.mjs" },
  { name: "markdown governance", needle: "check-md-governance.mjs" },
  { name: "architecture drift", needle: "check-architecture-drift.mjs" },
  { name: "decisions authority", needle: "check-decisions-authority.mjs" },
  // This script checking for its own name is not circular: it is a text search over
  // ci.yml, not a re-invocation. It exists because this exact gate went unwired into
  // CI for a period with nothing catching it.
  { name: "self-application conformance", needle: "check-self-application.mjs" },
  // Governed Remediation Phase 1 promotion-safety gates. These run pre-base-checkout
  // (they must judge a promotion PR's own detector changes, not the base copy).
  { name: "attribution false-positive corpus", needle: "check-attribution-fp-corpus.mjs" },
  { name: "regex safety", needle: "check-regex-safety.mjs" },
  { name: "gate DAG and determinism boundary", needle: "check-gate-dag.mjs" },
  { name: "detector-kernel pre-checkout tests", needle: "tests/near-miss.test.mjs" },
  // Advisory, not blocking: this only proves the near-miss widener step is wired into
  // CI at all. It never fails the build; promotion into the denylist stays human-only.
  { name: "near-miss widener (advisory)", needle: "detect-near-miss.mjs" },
  // Scans the PR body and comments for AI-participation signatures (operational-note 6):
  // the one attribution surface no tracked-file gate can see.
  { name: "PR body and comment hygiene", needle: "hygiene check --pr" },
];
for (const g of REQUIRED_GATES) {
  if (!activeCI.includes(g.needle)) problems.push(`ci.yml does not run the ${g.name} gate (${g.needle}).`);
}

// 2. The ratchet, style linter, and the attribution detector kernel must be loaded
//    from the base branch on a PR, so a PR cannot weaken the gate that judges it.
//    This is the trust-isolation claim, and it must cover EVERY deterministic
//    detector the hygiene gate relies on: branch-name and commit-identity (and the
//    consolidated detect-attribution that reuses them) run via check-repo-hygiene.mjs,
//    so all four plus the hygiene gate itself must be base-pinned. A gate that judges
//    branch/commit/attribution hygiene while running from the PR's own copy is not a
//    trust boundary; it is a suggestion the PR can edit away.
const BASE_PINNED = [
  "scripts/guard-ratchet.mjs",
  "scripts/check-style.mjs",
  "scripts/check-repo-hygiene.mjs",
  "scripts/lib/branch-name.mjs",
  "scripts/lib/commit-identity.mjs",
  "scripts/lib/detect-attribution.mjs",
];
for (const rel of BASE_PINNED) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`git checkout "origin/\\$\\{\\{ github\\.base_ref \\}\\}" -- ${escaped}`);
  if (!re.test(activeCI)) {
    problems.push(`ci.yml does not load ${rel} from the base branch before running the gates (trust-isolation kernel).`);
  }
}

// 3. Shipped defaults must be safe (off by default). The template is what new
//    adopters get; it must never ship armed.
const tmpl = parseFlatYaml(read("templates/.modonome/config.yaml"));
const SAFE = {
  autonomy_enabled: false, dry_run: true, auto_merge: false, max_merges_per_day: 0,
  repo_network_enabled: false, share_raw_code_across_repos: false,
};
for (const [lever, want] of Object.entries(SAFE)) {
  if (tmpl[lever] !== want) problems.push(`templates/.modonome/config.yaml: ${lever} should default to ${want}, got ${JSON.stringify(tmpl[lever])}.`);
}

// 4. The two protected-path surfaces must agree. CODEOWNERS is what GitHub
//    enforces; protected_paths_extra is what the engine reads. If they disagree, a
//    path is protected in name only (the bin/ gap that prompted this check).
function dirsFromCodeowners() {
  const set = new Set();
  for (const line of read(".github/CODEOWNERS").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const path = t.split(/\s+/)[0];
    if (path === "*") continue;
    set.add(path.replace(/^\//, "").replace(/\/$/, ""));
  }
  return set;
}
const cfg = parseFlatYaml(read(".modonome/config.yaml"));
const ppx = (cfg.protected_paths_extra || []).map((p) => String(p).replace(/^\//, "").replace(/\/$/, ""));
const owners = dirsFromCodeowners();
const ppxSet = new Set(ppx);
for (const d of owners) {
  if (!ppxSet.has(d)) problems.push(`CODEOWNERS protects "${d}/" but protected_paths_extra does not list it.`);
}
for (const d of ppx) {
  if (!owners.has(d)) problems.push(`protected_paths_extra lists "${d}/" but CODEOWNERS does not protect it.`);
}

// 5. No shipped telemetry may violate its own schema, and the live readout path
//    (.modonome/metrics.jsonl) must not ship as committed demo data. Synthetic
//    numbers presented as real telemetry are the credibility failure this guards.
const metricsSchema = JSON.parse(read("schemas/metrics.schema.json"));
const stateDir = join(root, ".modonome");
if (existsSync(stateDir)) {
  for (const f of readdirSync(stateDir).filter((f) => f.endsWith(".jsonl"))) {
    if (f === "metrics.jsonl") {
      problems.push("A committed .modonome/metrics.jsonl ships activity as if it were real. Use metrics.example.jsonl for samples; let the engine write the live file at runtime.");
    }
    const text = readFileSync(join(stateDir, f), "utf8");
    text.split("\n").filter((l) => l.trim()).forEach((line, i) => {
      let obj;
      try { obj = JSON.parse(line); } catch { problems.push(`.modonome/${f}:${i + 1}: not valid JSON.`); return; }
      const errs = validate(metricsSchema, obj);
      if (errs.length) problems.push(`.modonome/${f}:${i + 1}: ${errs[0]}`);
    });
  }
}

// 7. Badge consistency. The AgentProof score is hand-typed as prose in three files
//    instead of generated from one source. Rather than build a generation step for a
//    handful of badges, this asserts they agree with the runner's own computed output.
//    README.md states only the normative score; agentproof/README.md and SPEC.md also
//    state the extended and total counts, the numbers that have actually changed three
//    times (16, 25, 34, 35 scenarios) while the normative count has not, so checking
//    only `score` would never catch the drift this exists to catch. Skipped entirely
//    for a fixture or host repo with no agentproof/ directory: this invariant is
//    specific to this repository, not a requirement for every adopter.
if (existsSync(join(root, "agentproof/runner.mjs"))) {
  const runnerResult = spawnSync("node", [join(root, "agentproof/runner.mjs"), "--json"], {
    encoding: "utf8",
    timeout: 60000,
  });
  let runnerJson = null;
  try {
    runnerJson = JSON.parse(runnerResult.stdout);
  } catch {
    problems.push("agentproof/runner.mjs --json did not print parseable JSON.");
  }
  if (runnerJson && runnerJson.score) {
    const BADGE_FILES = [
      { rel: "README.md", scores: [runnerJson.score] },
      { rel: "agentproof/README.md", scores: [runnerJson.score, runnerJson.extended_score, runnerJson.total_score] },
      { rel: "agentproof/SPEC.md", scores: [runnerJson.score, runnerJson.extended_score, runnerJson.total_score] },
    ];
    for (const { rel, scores } of BADGE_FILES) {
      if (!existsSync(join(root, rel))) continue; // not every fixture ships every badge file
      const text = read(rel);
      for (const score of scores.filter(Boolean)) {
        if (!text.includes(score)) {
          problems.push(
            `${rel} does not contain the current AgentProof score "${score}" ` +
              `(agentproof/runner.mjs --json is the source of truth).`
          );
        }
      }
    }
  }
}

// Branch protection cannot be verified without repo-admin API access, so it is an
// explicit action item rather than a silent pass. These are the contexts that must
// be required on the default branch for this repo to live its own README.
notes.push("Branch protection on the default branch is NOT verifiable from here (needs repo-admin API).");
notes.push("Required status checks to enable on the default branch: \"verify\" and \"ratchet\" (from ci.yml).");

// 6. Snapshot dogfooding (ADR-033). Modonome must consume its own snapshot: a
//    committed signature must exist, agent instructions must point at the map, and
//    the hook plus CI gate must keep it fresh. This makes the "we use our own
//    feature" claim machine-checked rather than aspirational.
const snapSig = "snapshot/signature.json";
if (!existsSync(join(root, ".modonome", "snapshot", "signature.json"))) {
  problems.push(`.modonome/${snapSig} is missing. Run: node scripts/snapshot.mjs . (modonome must ship its own snapshot).`);
}
const agents = existsSync(join(root, "AGENTS.md")) ? read("AGENTS.md") : "";
if (!agents.includes(".modonome/snapshot/map.md")) {
  problems.push("AGENTS.md does not point agents at .modonome/snapshot/map.md.");
}
const hook = existsSync(join(root, "scripts/install-hooks.mjs")) ? read("scripts/install-hooks.mjs") : "";
if (!hook.includes("snapshot.mjs")) {
  problems.push("scripts/install-hooks.mjs does not regenerate the snapshot in the pre-commit hook.");
}
if (!activeCI.includes("snapshot.mjs . --check")) {
  problems.push("ci.yml does not run the snapshot freshness gate (snapshot.mjs . --check).");
}
const selfCfg = parseFlatYaml(read(".modonome/config.yaml"));
if (!selfCfg.snapshot || selfCfg.snapshot.ci_mode !== "fail") {
  problems.push('.modonome/config.yaml: snapshot.ci_mode should be "fail" so modonome\'s own snapshot cannot go stale.');
}

// Report
console.log("Self-application conformance (ADR-025)");
console.log("=====================================");
if (problems.length === 0) {
  console.log("PASS: every repo-local self-governance invariant holds.");
} else {
  console.error(`FAIL: ${problems.length} self-application problem(s):\n`);
  for (const p of problems) console.error("  - " + p);
}
console.log("\nManual action items (not machine-verifiable here):");
for (const n of notes) console.log("  * " + n);

process.exit(problems.length > 0 ? 1 : 0);
