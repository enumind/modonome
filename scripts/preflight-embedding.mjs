#!/usr/bin/env node
/**
 * Pre-flight embedding safety check for Modonome.
 *
 * Runs a battery of NON-DESTRUCTIVE, read-only checks against a target host
 * repository before Modonome is embedded into it. The goal is to detect
 * conflicts and collisions that would either break Modonome or silently
 * weaken its safety guarantees.
 *
 * Usage:
 *   node scripts/preflight-embedding.mjs --target-dir <path> [--json]
 *
 * Output:
 *   Human-readable report by default; machine-readable JSON with --json.
 *
 * Exit codes:
 *   0  all clear (no ERROR or WARN findings)
 *   1  fatal conflicts found (one or more ERROR findings)
 *   2  warnings only (one or more WARN findings, no ERROR findings)
 *
 * Guarantees:
 *   - This script NEVER writes to, mutates, or executes anything in the
 *     target directory. Every check is a pure read.
 *   - Each check is a self-contained function returning an array of findings,
 *     so checks can be unit-tested in isolation.
 *
 * Finding shape: { id, severity, title, description, path? }
 *   severity ∈ { "ERROR", "WARN", "INFO" }
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const SEVERITY = { ERROR: "ERROR", WARN: "WARN", INFO: "INFO" };

// Modonome's own CI job names. A host CI that defines jobs with these names
// will collide once Modonome's workflow is embedded.
const MODONOME_CI_JOBS = new Set([
  "verify",
  "ratchet",
  "drift",
  "tests",
  "agentproof",
  "maker",
  "checker",
]);

// Modonome ships these scripts. A host scripts/ directory containing files with
// identical basenames will shadow Modonome's scripts.
const MODONOME_SCRIPTS = new Set([
  "guard-ratchet.mjs",
  "validate-config.mjs",
  "check-drift.mjs",
  "check-style.mjs",
  "check-portability.mjs",
  "check-repo-hygiene.mjs",
  "check-self-application.mjs",
  "build-prompt.mjs",
  "tick.mjs",
  "scaffold.mjs",
  "report.mjs",
  "migrate-config.mjs",
  "validate-config.mjs",
  "dry-run-sweep.mjs",
]);

// Modonome reads these arming/safety levers. If a host has exported them in a
// way that overrides safe defaults, the embedded engine could be silently
// armed or have its safety limits relaxed.
const MODONOME_SAFETY_ENV = [
  { name: "MODONOME_AUTONOMY", safe: ["", "false", "0"] },
  { name: "MODONOME_ARMED", safe: ["", "false", "0"] },
  { name: "MODONOME_DRY_RUN", safe: ["", "true", "1"] },
  { name: "MODONOME_AUTO_MERGE", safe: ["", "false", "0"] },
  { name: "MODONOME_MAX_MERGES", safe: ["", "0"] },
];

// The minimum Node version Modonome supports.
const MODONOME_MIN_NODE = 18;

// Patterns that look like attempts to override governance / arming from inside
// content files. Only applied to trusted-looking locations (.modonome/, schemas/,
// CI dirs), never to arbitrary source files.
const INJECTION_PATTERNS = [
  /system\s*override/i,
  /modonome\s*(instruction|directive)/i,
  /agent\s*directive/i,
  /governance\s*:\s*bypass/i,
  /ignore\s+previous\s+instructions/i,
  /disable\s+(governance|ratchet|safety)/i,
  /skip\s+all\s+safety\s+checks/i,
  /set\s+autonomy_enabled\s+to\s+true/i,
];

// ---------------------------------------------------------------------------
// Filesystem helpers (read-only)
// ---------------------------------------------------------------------------

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readTextSafe(p) {
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function listFilesRecursive(dir, { maxDepth = 5 } = {}) {
  const out = [];
  async function walk(current, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        await walk(full, depth + 1);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(dir, 0);
  return out;
}

// Minimal, dependency-free scan for top-level YAML job names under `jobs:`.
function parseCiJobNames(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const jobs = [];
  let inJobs = false;
  let jobsIndent = -1;
  for (const raw of lines) {
    if (/^\s*#/.test(raw) || raw.trim() === "") continue;
    const indent = raw.length - raw.replace(/^\s*/, "").length;
    const m = raw.match(/^(\s*)([A-Za-z0-9_-]+):\s*$/);
    if (!inJobs) {
      if (/^jobs:\s*$/.test(raw)) {
        inJobs = true;
        jobsIndent = indent;
      }
      continue;
    }
    // We're inside `jobs:`. A job key is the first indentation level beneath it.
    if (indent <= jobsIndent && raw.trim() !== "") {
      // Left the jobs block.
      inJobs = false;
      continue;
    }
    if (m) {
      const keyIndent = m[1].length;
      // Only direct children of jobs: (the shallowest indent inside the block).
      if (keyIndent === jobsIndent + 2) {
        jobs.push(m[2]);
      }
    }
  }
  return jobs;
}

// Extremely small YAML-ish key:value reader for flat config files. Good enough
// to inspect schema_version and the boolean arming levers without a YAML dep.
function parseFlatYaml(yamlText) {
  const obj = {};
  for (const raw of yamlText.split(/\r?\n/)) {
    if (/^\s*#/.test(raw) || raw.trim() === "") continue;
    const m = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.replace(/\s+#.*$/, "").trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val === "") continue; // nested block; skip
    obj[key] = val;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Checks: each returns Promise<Finding[]>
// ---------------------------------------------------------------------------

// (a) Schema collision: target has .modonome/ with incompatible config.
export async function checkSchemaCollision(targetDir) {
  const findings = [];
  const configPath = path.join(targetDir, ".modonome", "config.yaml");
  if (!(await exists(configPath))) return findings;

  const text = await readTextSafe(configPath);
  if (text == null) return findings;
  const cfg = parseFlatYaml(text);

  const reasons = [];
  if (cfg.schema_version !== undefined) {
    const v = Number(cfg.schema_version);
    if (!Number.isInteger(v) || v < 1 || v > 1) {
      reasons.push(`schema_version is "${cfg.schema_version}" (Modonome expects 1)`);
    }
  } else {
    reasons.push("schema_version is missing");
  }
  // Booleans that Modonome requires to be real booleans.
  for (const k of ["autonomy_enabled", "auto_merge", "dry_run"]) {
    if (cfg[k] !== undefined && !["true", "false"].includes(String(cfg[k]))) {
      reasons.push(`${k} is "${cfg[k]}" (expected boolean true/false)`);
    }
  }
  // Unknown keys that Modonome's schema would reject (additionalProperties:false).
  const knownKeys = new Set([
    "schema_version", "autonomy_enabled", "dry_run", "auto_merge",
    "max_attempts_per_item", "max_open_prs", "max_diff_lines", "lease_minutes",
    "max_merges_per_day", "remote_model_budget_usd_per_day", "local_model_only_by_default",
    "require_branch_protection", "require_codeowner_review", "require_distinct_maker_checker",
    "require_distinct_maker_checker_model", "trusted_author_allowlist", "protected_paths_extra",
    "state_dir", "market_scan_enabled", "owner_approval_required_for_new_claims",
    "repo_network_enabled", "repo_network_dry_run", "share_raw_code_across_repos",
    "share_repo_identifiers_by_default", "roles", "runners", "models", "hooks",
  ]);
  const unknown = Object.keys(cfg).filter((k) => !knownKeys.has(k));
  if (unknown.length) {
    reasons.push(`unknown config keys not in Modonome schema: ${unknown.join(", ")}`);
  }

  if (reasons.length) {
    findings.push({
      id: "schema-collision",
      severity: SEVERITY.ERROR,
      title: "Schema collision in existing .modonome/config.yaml",
      description:
        "The target already contains a .modonome/config.yaml that is incompatible " +
        "with Modonome's schema. Embedding would clobber or be rejected by it. " +
        "Reasons: " + reasons.join("; ") + ".",
      path: configPath,
    });
  }
  return findings;
}

// (b) CI job name conflict: target's CI files use Modonome job names.
export async function checkCiJobConflict(targetDir) {
  const findings = [];
  const wfDir = path.join(targetDir, ".github", "workflows");
  if (!(await exists(wfDir))) return findings;

  let files = [];
  try {
    files = (await readdir(wfDir)).filter((f) => /\.(ya?ml)$/.test(f));
  } catch {
    return findings;
  }
  for (const f of files) {
    const full = path.join(wfDir, f);
    const text = await readTextSafe(full);
    if (text == null) continue;
    const jobNames = parseCiJobNames(text);
    const collisions = jobNames.filter((j) => MODONOME_CI_JOBS.has(j));
    if (collisions.length) {
      findings.push({
        id: "ci-job-conflict",
        severity: SEVERITY.ERROR,
        title: "CI job name conflict with Modonome",
        description:
          `Workflow defines job name(s) that collide with Modonome's CI jobs: ` +
          `${collisions.join(", ")}. Embedding Modonome's workflow would create ` +
          `ambiguous or overwritten jobs.`,
        path: full,
      });
    }
  }
  return findings;
}

// (c) Script shadowing: target has scripts/ that shadow Modonome scripts.
export async function checkScriptShadowing(targetDir) {
  const findings = [];
  const scriptsDir = path.join(targetDir, "scripts");
  if (!(await exists(scriptsDir))) return findings;

  let entries = [];
  try {
    entries = await readdir(scriptsDir, { withFileTypes: true });
  } catch {
    return findings;
  }
  const shadowed = entries
    .filter((e) => e.isFile() && MODONOME_SCRIPTS.has(e.name))
    .map((e) => e.name);

  if (shadowed.length) {
    findings.push({
      id: "script-shadowing",
      severity: SEVERITY.ERROR,
      title: "Script shadowing of Modonome scripts",
      description:
        `The target's scripts/ directory contains file(s) with identical names ` +
        `to Modonome scripts: ${shadowed.join(", ")}. Embedding would either ` +
        `overwrite host scripts or be overwritten, breaking both.`,
      path: scriptsDir,
    });
  }
  return findings;
}

// (d) Env var pollution: MODONOME_* env vars set that override safe defaults.
// Reads from the current process environment (the shell preparing to embed) AND
// statically inspects, read-only, the target's `.env` / shell setup files for
// MODONOME_* assignments that would relax safe defaults. Files are parsed, never
// sourced or executed.
export async function checkEnvPollution(targetDir, env = process.env) {
  const findings = [];

  function evaluate(name, val) {
    const lever = MODONOME_SAFETY_ENV.find((l) => l.name === name);
    if (!lever) return null;
    if (lever.safe.includes(String(val).toLowerCase())) return null;
    return `${name}=${val}`;
  }

  // 1) Current process environment.
  const polluted = new Set();
  for (const lever of MODONOME_SAFETY_ENV) {
    const val = env[lever.name];
    if (val === undefined) continue;
    const bad = evaluate(lever.name, val);
    if (bad) polluted.add(bad);
  }

  // 2) Static scan of common env-bearing files in the target.
  if (targetDir) {
    const candidates = [".env", ".env.local", "setup.sh", ".envrc"];
    for (const name of candidates) {
      const p = path.join(targetDir, name);
      if (!(await exists(p))) continue;
      const text = await readTextSafe(p);
      if (text == null) continue;
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/^\s*export\s+/, "").trim();
        const m = line.match(/^(MODONOME_[A-Z0-9_]+)=["']?([^"'#]*)["']?/);
        if (!m) continue;
        const bad = evaluate(m[1], m[2].trim());
        if (bad) polluted.add(bad);
      }
    }
  }

  if (polluted.size) {
    findings.push({
      id: "env-pollution",
      severity: SEVERITY.WARN,
      title: "MODONOME_* environment variables override safe defaults",
      description:
        `Environment exports MODONOME_* variables that would relax Modonome's ` +
        `safe defaults: ${[...polluted].join(", ")}. These are advisory: Modonome ` +
        `ignores unvalidated env arming, but operators should unset them to avoid ` +
        `confusion.`,
    });
  }
  return findings;
}

// (e) Dependency conflict: target has deps that conflict with Modonome requirements.
export async function checkDependencyConflict(targetDir) {
  const findings = [];
  const pkgPath = path.join(targetDir, "package.json");
  if (!(await exists(pkgPath))) return findings;
  const text = await readTextSafe(pkgPath);
  if (text == null) return findings;
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    findings.push({
      id: "dependency-conflict",
      severity: SEVERITY.WARN,
      title: "Unparseable package.json",
      description: "The target's package.json is not valid JSON; dependency checks were skipped.",
      path: pkgPath,
    });
    return findings;
  }

  // Modonome is ESM-only ("type":"module"). A host pinned to commonjs at the
  // root conflicts with Modonome's .mjs-free expectations for shared files.
  if (pkg.type && pkg.type !== "module") {
    findings.push({
      id: "dependency-conflict",
      severity: SEVERITY.WARN,
      title: "Module type conflict",
      description:
        `The target declares "type": "${pkg.type}". Modonome is ESM-only ` +
        `("type": "module"); mixed module systems may require .cjs/.mjs care.`,
      path: pkgPath,
    });
  }

  // npm script name collisions with Modonome's scripts.
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const conflictingScriptNames = ["verify", "scaffold", "agentproof", "dry-run"];
  const hostScripts = pkg.scripts || {};
  const scriptCollisions = conflictingScriptNames.filter((n) => n in hostScripts);
  if (scriptCollisions.length) {
    findings.push({
      id: "dependency-conflict",
      severity: SEVERITY.WARN,
      title: "npm script name collision",
      description:
        `The target defines npm script(s) Modonome also ships: ` +
        `${scriptCollisions.join(", ")}. Embedding may overwrite them.`,
      path: pkgPath,
    });
  }
  // Note: allDeps reserved for future explicit version-conflict rules.
  void allDeps;
  return findings;
}

// (f) Prompt injection risk: governance-override patterns in the target.
// Trusted locations (.modonome/, schemas/, CI dirs) are scanned exhaustively;
// for the rest of the repo we scan source-bearing files for the same patterns
// so that governance-looking content embedded anywhere is surfaced. Every hit is
// WARN (advisory): Modonome treats config data, not prose, as authoritative, so
// host source comments can never block embedding.
export async function checkPromptInjection(targetDir) {
  const findings = [];
  const allFiles = await listFilesRecursive(targetDir, { maxDepth: 5 });
  const trustedPrefixes = [
    path.join(targetDir, ".modonome") + path.sep,
    path.join(targetDir, "schemas") + path.sep,
    path.join(targetDir, ".github") + path.sep,
  ];
  const scannableExt = new Set([
    ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".md", ".yaml", ".yml", ".json", ".sh", ".txt",
  ]);

  for (const file of allFiles) {
    const inTrusted = trustedPrefixes.some((pre) => file.startsWith(pre));
    if (!inTrusted && !scannableExt.has(path.extname(file))) continue;
    const text = await readTextSafe(file);
    if (text == null) continue;
    const hits = INJECTION_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
    if (!hits.length) continue;
    findings.push({
      id: "prompt-injection",
      severity: SEVERITY.WARN,
      title: inTrusted
        ? "Governance-override patterns in a trusted location"
        : "Governance-override patterns in host content",
      description:
        `File contains content resembling governance/arming overrides ` +
        `(${hits.length} pattern(s)). It should be reviewed before embedding. ` +
        `This is advisory: Modonome treats config data, not prose, as ` +
        `authoritative, so host content can never block embedding.`,
      path: file,
    });
  }
  return findings;
}

// (g) Node version incompatibility: target requires Node < 18.
export async function checkNodeVersion(targetDir) {
  const findings = [];
  const pkgPath = path.join(targetDir, "package.json");
  if (!(await exists(pkgPath))) return findings;
  const text = await readTextSafe(pkgPath);
  if (text == null) return findings;
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    return findings;
  }
  const engineNode = pkg.engines && pkg.engines.node;
  if (!engineNode) return findings;

  // Extract the minimum major version implied by the range. Handles common
  // forms: ">=16", "16.x", "^14", ">=14 <18", "14".
  const nums = String(engineNode).match(/\d+/g);
  if (!nums) return findings;
  const minMajor = Math.min(...nums.map(Number).filter((n) => n >= 1 && n < 100));
  if (Number.isFinite(minMajor) && minMajor < MODONOME_MIN_NODE) {
    findings.push({
      id: "node-version-incompat",
      severity: SEVERITY.ERROR,
      title: "Node version incompatibility",
      description:
        `The target's package.json engines.node is "${engineNode}", which permits ` +
        `Node ${minMajor} (< ${MODONOME_MIN_NODE}). Modonome requires Node ` +
        `>= ${MODONOME_MIN_NODE}.`,
      path: pkgPath,
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export const CHECKS = [
  { name: "schema-collision", fn: (t) => checkSchemaCollision(t) },
  { name: "ci-job-conflict", fn: (t) => checkCiJobConflict(t) },
  { name: "script-shadowing", fn: (t) => checkScriptShadowing(t) },
  { name: "env-pollution", fn: (t) => checkEnvPollution(t) },
  { name: "dependency-conflict", fn: (t) => checkDependencyConflict(t) },
  { name: "prompt-injection", fn: (t) => checkPromptInjection(t) },
  { name: "node-version-incompat", fn: (t) => checkNodeVersion(t) },
];

export async function runPreflight(targetDir) {
  const resolved = path.resolve(targetDir);
  const findings = [];
  for (const check of CHECKS) {
    const results = await check.fn(resolved);
    for (const r of results) findings.push(r);
  }
  const errors = findings.filter((f) => f.severity === SEVERITY.ERROR);
  const warnings = findings.filter((f) => f.severity === SEVERITY.WARN);
  const exitCode = errors.length ? 1 : warnings.length ? 2 : 0;
  return { targetDir: resolved, findings, errors, warnings, exitCode };
}

function renderHuman(report) {
  const lines = [];
  lines.push(`Modonome embedding pre-flight`);
  lines.push(`Target: ${report.targetDir}`);
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("All clear. No conflicts or collisions detected.");
  } else {
    for (const f of report.findings) {
      const loc = f.path ? `\n      at: ${f.path}` : "";
      lines.push(`[${f.severity}] ${f.id}: ${f.title}`);
      lines.push(`      ${f.description}${loc}`);
      lines.push("");
    }
    lines.push(
      `Summary: ${report.errors.length} error(s), ${report.warnings.length} warning(s).`
    );
    if (report.exitCode === 1) lines.push("Result: FATAL conflicts found. Do not embed.");
    else if (report.exitCode === 2) lines.push("Result: warnings only. Review before embedding.");
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const idx = args.indexOf("--target-dir");
  if (idx === -1 || !args[idx + 1]) {
    console.error("Usage: node scripts/preflight-embedding.mjs --target-dir <path> [--json]");
    process.exit(2);
  }
  const targetDir = args[idx + 1];
  if (!(await exists(targetDir))) {
    console.error(`Target directory does not exist: ${targetDir}`);
    process.exit(2);
  }

  const report = await runPreflight(targetDir);
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderHuman(report));
  }
  process.exit(report.exitCode);
}

// Only run main when invoked directly, not when imported by tests.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]).endsWith("preflight-embedding.mjs");
if (invokedDirectly) {
  main();
}
