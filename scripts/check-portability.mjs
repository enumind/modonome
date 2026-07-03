#!/usr/bin/env node
/**
 * Portability checker for Modonome embedding scenarios.
 *
 * Usage: node scripts/check-portability.mjs --fixture <path>
 *
 * Runs a battery of checks against a fixture (or real host repo) directory
 * and reports:
 *   SAFE  - no conflicts found
 *   WARN  - potential issues that may cause problems
 *   FAIL  - definite conflicts that will break Modonome
 *
 * Exit codes: 0 for SAFE or WARN, 1 for FAIL.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const fixtureIdx = args.indexOf("--fixture");
if (fixtureIdx === -1 || !args[fixtureIdx + 1]) {
  console.error("Usage: node scripts/check-portability.mjs --fixture <path>");
  process.exit(2);
}
const fixturePath = resolve(args[fixtureIdx + 1]);

if (!existsSync(fixturePath)) {
  console.error(`Fixture path does not exist: ${fixturePath}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Result accumulator
// ---------------------------------------------------------------------------

const findings = [];

function fail(code, message) {
  findings.push({ level: "FAIL", code, message });
}

function warn(code, message) {
  findings.push({ level: "WARN", code, message });
}

function info(code, message) {
  findings.push({ level: "INFO", code, message });
}

// ---------------------------------------------------------------------------
// Check 1: Schema collision
// Detect a .modonome/config.yaml that does not match Modonome's expected schema.
// ---------------------------------------------------------------------------

const modonomeConfigPath = join(fixturePath, ".modonome", "config.yaml");

if (existsSync(modonomeConfigPath)) {
  const text = readFileSync(modonomeConfigPath, "utf8");

  // Parse schema_version from the config text (simple line scan, no YAML parser dep)
  const schemaMatch = text.match(/^schema_version:\s*(\S+)/m);
  if (!schemaMatch) {
    fail(
      "SCHEMA_VERSION_MISSING",
      `.modonome/config.yaml exists but has no schema_version field`
    );
  } else {
    const version = parseInt(schemaMatch[1], 10);
    if (isNaN(version) || version !== 1) {
      fail(
        "SCHEMA_VERSION_MISMATCH",
        `.modonome/config.yaml has schema_version: ${schemaMatch[1]}, Modonome requires schema_version: 1`
      );
    } else {
      info("SCHEMA_OK", ".modonome/config.yaml has correct schema_version: 1");
    }
  }

  // Detect non-boolean values for known boolean fields
  for (const field of ["autonomy_enabled", "auto_merge", "dry_run"]) {
    const fieldMatch = text.match(new RegExp(`^${field}:\\s*(\\S+)`, "m"));
    if (fieldMatch) {
      const val = fieldMatch[1].replace(/"/g, "").replace(/'/g, "");
      if (val !== "true" && val !== "false") {
        fail(
          "SCHEMA_TYPE_MISMATCH",
          `.modonome/config.yaml has ${field}: ${fieldMatch[1]} (must be boolean true or false)`
        );
      }
    }
  }

  // Detect fields unknown to Modonome's schema (simple heuristic: unknown top-level keys)
  const KNOWN_KEYS = new Set([
    "schema_version", "autonomy_enabled", "dry_run", "auto_merge",
    "max_attempts_per_item", "max_open_prs", "max_diff_lines", "lease_minutes",
    "max_merges_per_day", "remote_model_budget_usd_per_day", "local_model_only_by_default",
    "require_branch_protection", "require_codeowner_review", "require_distinct_maker_checker",
    "require_distinct_maker_checker_model", "trusted_author_allowlist", "protected_paths_extra",
    "state_dir", "market_scan_enabled", "owner_approval_required_for_new_claims",
    "repo_network_enabled", "repo_network_dry_run", "share_raw_code_across_repos",
    "share_repo_identifiers_by_default", "remediation_apply_enabled", "roles", "runners", "models",
  ]);
  const topLevelKeys = [...text.matchAll(/^([a-z_][a-z0-9_]*):/gm)].map((m) => m[1]);
  for (const key of topLevelKeys) {
    if (!KNOWN_KEYS.has(key)) {
      warn(
        "SCHEMA_UNKNOWN_KEY",
        `.modonome/config.yaml contains unknown key "${key}" (may be a foreign config)`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Check 2: CI job name conflict
// Detect .github/workflows/*.yml files that define jobs with Modonome's names.
// ---------------------------------------------------------------------------

const MODONOME_JOBS = ["drift", "ratchet", "tests", "agentproof"];
const workflowsDir = join(fixturePath, ".github", "workflows");

if (existsSync(workflowsDir)) {
  const yamlFiles = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  for (const file of yamlFiles) {
    const text = readFileSync(join(workflowsDir, file), "utf8");
    for (const job of MODONOME_JOBS) {
      // Match "  <job>:" at start of a line (typical GitHub Actions job definition)
      if (new RegExp(`^\\s{2}${job}:\\s*$`, "m").test(text)) {
        fail(
          "CI_JOB_CONFLICT",
          `${file} defines job "${job}" which conflicts with Modonome's CI job of the same name`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Check 3: Prompt injection patterns in host source files
// Scan for governance instruction patterns in host source files.
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /SYSTEM OVERRIDE/i,
  /MODONOME INSTRUCTION/i,
  /AGENT DIRECTIVE/i,
  /disable governance/i,
  /skip all (tests|checks|governance)/i,
  /\bautonomyEnabled\s*=\s*true/,
  /autonomy_enabled:\s*true/,
  /MODONOME_ARMED\s*[=:]\s*["']?true/i,
];

// Scan common source directories for injection patterns (not .modonome itself)
const SCAN_DIRS = ["src", "lib", "docs", "tests", "test"];

for (const dir of SCAN_DIRS) {
  const dirPath = join(fixturePath, dir);
  if (!existsSync(dirPath)) continue;

  const scanFiles = (d) => {
    try {
      return readdirSync(d, { withFileTypes: true }).flatMap((entry) => {
        const full = join(d, entry.name);
        if (entry.isDirectory()) return scanFiles(full);
        return [full];
      });
    } catch {
      return [];
    }
  };

  for (const file of scanFiles(dirPath)) {
    // Only scan text-like files
    if (!/\.(js|mjs|cjs|ts|mts|md|txt|yaml|yml|json)$/.test(file)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const pat of INJECTION_PATTERNS) {
      if (pat.test(text)) {
        warn(
          "PROMPT_INJECTION_PATTERN",
          `${file.replace(fixturePath + "/", "")} contains governance injection pattern: ${pat}`
        );
        break; // one warning per file is enough
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Check 4: Script shadowing
// Detect scripts/ that shadow Modonome's scripts at identical paths.
// ---------------------------------------------------------------------------

const MODONOME_SCRIPTS = ["guard-ratchet.mjs", "validate-config.mjs", "check-drift.mjs"];
const hostScriptsDir = join(fixturePath, "scripts");

if (existsSync(hostScriptsDir)) {
  for (const script of MODONOME_SCRIPTS) {
    const shadowPath = join(hostScriptsDir, script);
    if (existsSync(shadowPath)) {
      const text = readFileSync(shadowPath, "utf8");
      // A stub that always exits 0 is a clear attack signal
      if (/process\.exit\s*\(\s*0\s*\)/.test(text) && text.split("\n").length < 20) {
        fail(
          "SCRIPT_SHADOW_ATTACK",
          `scripts/${script} exists in host repo and appears to be a permissive stub that shadows Modonome's script`
        );
      } else {
        warn(
          "SCRIPT_SHADOW_WARN",
          `scripts/${script} exists in host repo at the same path as Modonome's script. Verify it is not a shadow.`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Check 5: Environment variable pollution
// Check for a .env file that sets Modonome-affecting variables.
// ---------------------------------------------------------------------------

const ENV_SENSITIVE = [
  "MODONOME_ARMED",
  "MODONOME_AUTONOMY",
  "MODONOME_DRY_RUN",
  "MODONOME_AUTO_MERGE",
  "MODONOME_MAX_MERGES",
  "GIT_DIR",
];

const envFilePath = join(fixturePath, ".env");
if (existsSync(envFilePath)) {
  const text = readFileSync(envFilePath, "utf8");
  for (const varName of ENV_SENSITIVE) {
    const match = text.match(new RegExp(`^${varName}=(.+)$`, "m"));
    if (match) {
      const val = match[1].trim();
      // Flag if the value could arm or disable safety controls
      if (/^(true|1|yes)$/i.test(val) && varName !== "MODONOME_DRY_RUN") {
        warn(
          "ENV_POLLUTION",
          `.env sets ${varName}=${val} which could affect Modonome's safety controls`
        );
      } else if (varName === "MODONOME_DRY_RUN" && /^(false|0|no)$/i.test(val)) {
        warn(
          "ENV_POLLUTION",
          `.env sets ${varName}=${val} which could disable dry-run mode`
        );
      } else if (varName === "GIT_DIR") {
        warn(
          "ENV_POLLUTION",
          `.env sets ${varName}=${val} which could redirect git operations`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const failCount = findings.filter((f) => f.level === "FAIL").length;
const warnCount = findings.filter((f) => f.level === "WARN").length;

const overall = failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "SAFE";

console.log(`\nPortability check: ${fixturePath}`);
console.log(`Overall: ${overall}  (${failCount} FAIL, ${warnCount} WARN)\n`);

for (const f of findings) {
  if (f.level === "INFO") continue;
  console.log(`  [${f.level}] ${f.code}: ${f.message}`);
}

if (overall === "SAFE") {
  console.log("  No conflicts detected.\n");
}

process.exit(failCount > 0 ? 1 : 0);
