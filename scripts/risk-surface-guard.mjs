#!/usr/bin/env node
// Risk Surface Guard (ADR-047). Scans a pull request diff for changes that expand
// execution, credential, workflow, dataset/model-loading, container, network, or
// sandbox risk. Deterministic, line-based, and diff-scoped, in the same family as the
// anti-gaming ratchet (scripts/guard-ratchet.mjs) but a fully separate script and rule
// set: a different threat model (blast radius and infrastructure exposure) from the
// ratchet's test-gate integrity focus. This does not detect live infrastructure
// compromise and does not replace SAST, secret scanning, dependency review, cloud
// security posture management, sandboxing, or human review. It flags repository
// changes that expand risk surface and helps a reviewer notice them before merge.
//
// Usage:
//   node scripts/risk-surface-guard.mjs <baseRef> [--mode warn|fail] [--sarif] [--json]
//   node scripts/risk-surface-guard.mjs --diff <file> [--mode warn|fail] [--sarif] [--json]
//   node scripts/risk-surface-guard.mjs --staged [--mode warn|fail] [--sarif] [--json]
//
// Exit codes: 0 no findings, or warn mode regardless of findings; 1 fail mode with a
// high or critical finding; 2 usage or internal error.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";
import { flagValue } from "./lib/cli-args.mjs";
import { RULES, RULES_BY_ID, matchesProtectedPath, stripForScope, redactMatchedText } from "./lib/risk-surface-rules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

// Same allowlist guard-ratchet uses for its base-ref argument: ref names already
// forbid spaces and most shell metacharacters, so this keeps the value to the safe
// subset plus the "..."-range syntax this tool builds from it.
const SAFE_REF = /^[A-Za-z0-9._/-]+$/;

function normalizeLF(s) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// ---------------------------------------------------------------------------
// Flag parsing. --mode, --sarif, --json, --format=json/sarif, and the
// positional base-ref (or --diff <path> / --staged) compose in any order.
// ---------------------------------------------------------------------------

export function stripFlags(argv) {
  const mode = flagValue(argv, "--mode");
  const format = argv.includes("--sarif") || argv.includes("--format=sarif")
    ? "sarif"
    : argv.includes("--json") || argv.includes("--format=json")
      ? "json"
      : "human";
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") {
      i++; // also skip its value
      continue;
    }
    if (/^--(json|sarif|format=(json|sarif))$/.test(a)) continue;
    positional.push(a);
  }
  return { mode, format, positional };
}

// ---------------------------------------------------------------------------
// Diff acquisition (--diff <path> / --staged / <base-ref>), mirroring
// guard-ratchet.mjs's own getDiff() shape and safety properties. Duplicated
// rather than shared: guard-ratchet.mjs is base-pinned and out of this
// feature's edit set, and the logic is small.
// ---------------------------------------------------------------------------

function getDiff(positional) {
  const arg = positional[0];
  if (arg === "--diff") {
    const path = positional[1];
    if (!path) {
      throw new UsageError(formatMessage("gate.risk-surface-guard.usage-error", {}, overrides).message);
    }
    return normalizeLF(readFileSync(path, "utf8"));
  }
  if (arg === "--staged") {
    const result = spawnSync("git", ["diff", "--cached"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(result.stderr || formatMessage("gate.risk-surface-guard.staged-diff-failed", {}, overrides).message);
    }
    return normalizeLF(result.stdout);
  }
  const base = arg || "origin/main";
  if (!SAFE_REF.test(base)) {
    throw new UsageError(formatMessage("gate.risk-surface-guard.unsafe-ref", { ref: base }, overrides).message);
  }
  // Git args are always an array, never a shell string, so the ref can never be
  // interpreted as a command.
  const result = spawnSync("git", ["diff", `${base}...HEAD`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || formatMessage("gate.risk-surface-guard.diff-failed", { base }, overrides).message);
  }
  return normalizeLF(result.stdout);
}

class UsageError extends Error {}

// ---------------------------------------------------------------------------
// Diff parsing. Like guard-ratchet's parser, but additionally tracks a running
// new-file line number from @@ hunk headers, so findings can carry a real line
// instead of a hardcoded one. Added and context lines advance the counter;
// removed lines do not.
// ---------------------------------------------------------------------------

export function parseDiff(diffText) {
  const files = {};
  let current = null;
  let preimage = null;
  let newLineNum = 0;

  for (const line of diffText.split("\n")) {
    const minusMatch = line.match(/^--- a\/(.+)$/);
    if (minusMatch) {
      preimage = minusMatch[1];
      continue;
    }
    const plusMatch = line.match(/^\+\+\+ (.+)$/);
    if (plusMatch) {
      const target = plusMatch[1];
      current = target === "/dev/null" ? preimage : target.startsWith("b/") ? target.slice(2) : target;
      if (current && !files[current]) files[current] = { added: [], removed: [] };
      newLineNum = 0;
      continue;
    }
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNum = parseInt(hunkMatch[1], 10);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("+")) {
      files[current].added.push({ text: line.slice(1), line: newLineNum });
      newLineNum++;
      continue;
    }
    if (line.startsWith("-")) {
      files[current].removed.push(line.slice(1));
      continue;
    }
    if (line.startsWith(" ") || line === "") {
      newLineNum++;
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

function makeFinding(rule, file, line, rawText) {
  return {
    id: rule.id,
    severity: rule.severity,
    category: rule.category,
    file,
    line: line || null,
    matched_text: redactMatchedText(rawText),
    reason: rule.reason,
    reviewer_guidance: rule.reviewer_guidance,
    limitation: rule.limitation,
  };
}

export function scanFile(filePath, addedLines) {
  const findings = [];
  for (const rule of RULES) {
    if (rule.pathOnly) continue;
    if (!rule.scope(filePath)) continue;
    if (rule.fileTest) {
      for (const m of rule.fileTest(addedLines, filePath)) {
        findings.push(makeFinding(rule, filePath, m.line, m.text));
      }
      continue;
    }
    for (const lineRec of addedLines) {
      const candidate = rule.raw ? lineRec.text : stripForScope(filePath, lineRec.text);
      const isMatch = rule.pattern ? rule.pattern.test(candidate) : rule.test(candidate);
      if (isMatch) findings.push(makeFinding(rule, filePath, lineRec.line, lineRec.text));
    }
  }
  return findings;
}

const PATH_ONLY_RULE = RULES.find((r) => r.pathOnly);

export function scanDiff(diffText) {
  const files = parseDiff(diffText);
  const findings = [];
  for (const [filePath, { added }] of Object.entries(files)) {
    findings.push(...scanFile(filePath, added));
  }
  if (PATH_ONLY_RULE) {
    for (const filePath of Object.keys(files)) {
      if (matchesProtectedPath(filePath)) {
        findings.push(makeFinding(PATH_ONLY_RULE, filePath, null, filePath));
      }
    }
  }
  return { findings };
}

// ---------------------------------------------------------------------------
// Exit code / result decision (pure, so scenarios 14-16 have a direct unit
// test in addition to their CLI-spawn version).
// ---------------------------------------------------------------------------

function hasHighOrCritical(findings) {
  return findings.some((f) => f.severity === "high" || f.severity === "critical");
}

export function decideExitCode(mode, findings) {
  if (mode === "fail" && hasHighOrCritical(findings)) return 1;
  return 0;
}

export function decideResult(mode, findings) {
  if (findings.length === 0) return "pass";
  if (mode === "fail" && hasHighOrCritical(findings)) return "fail";
  return "warn";
}

export function severityToSarifLevel(severity) {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function summaryMessage(mode, findings) {
  if (findings.length === 0) return formatMessage("gate.risk-surface-guard.pass-summary", {}, overrides).message;
  if (mode === "fail") {
    if (hasHighOrCritical(findings)) {
      return formatMessage("gate.risk-surface-guard.fail-block-summary", { count: findings.length }, overrides).message;
    }
    return formatMessage("gate.risk-surface-guard.fail-mode-below-threshold-summary", { count: findings.length }, overrides).message;
  }
  return formatMessage("gate.risk-surface-guard.warn-summary", { count: findings.length }, overrides).message;
}

export function formatHuman(findings, { mode }) {
  const lines = ["Risk Surface Guard", "===================", `Mode: ${mode}`, ""];
  for (const f of findings) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.id} ${f.category}`);
    lines.push(`  ${f.file}${f.line ? ":" + f.line : ""}`);
    lines.push(`  ${f.matched_text}`);
    lines.push(`  ${f.reason}`);
    lines.push(`  Reviewer guidance: ${f.reviewer_guidance}`);
    lines.push(`  Limitation: ${f.limitation}`);
    lines.push("");
  }
  lines.push(summaryMessage(mode, findings));
  return lines.join("\n");
}

export function emitJson(findings, { mode }) {
  return JSON.stringify(
    { tool: "modonome-risk-surface-guard", version: "1", result: decideResult(mode, findings), mode, findings },
    null,
    2,
  );
}

export function emitSarif(findings) {
  const usedIds = [...new Set(findings.map((f) => f.id))];
  const rules = usedIds.map((id) => {
    const rule = RULES_BY_ID.get(id);
    return {
      id,
      name: rule ? rule.category : id,
      shortDescription: { text: rule ? rule.reason : id },
      helpUri: `https://modonome.com/codes/${id}`,
    };
  });
  const results = findings.map((f) => ({
    ruleId: f.id,
    level: severityToSarifLevel(f.severity),
    message: { text: f.reason },
    partialFingerprints: { modonomeRiskSurfaceGuardV1: `${f.id}:${f.file}:${f.line || 0}` },
    locations: f.file
      ? [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: f.line || 1 } } }]
      : [],
  }));
  return JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: { driver: { name: "Modonome Risk Surface Guard", informationUri: "https://modonome.com", rules } },
          results,
        },
      ],
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function runCli() {
  const { mode: rawMode, format, positional } = stripFlags(process.argv.slice(2));
  const mode = rawMode || "warn";
  if (mode !== "warn" && mode !== "fail") {
    process.stderr.write(formatMessage("gate.risk-surface-guard.invalid-mode", { value: rawMode }, overrides).message + "\n");
    process.exit(2);
  }

  let diffText;
  try {
    diffText = getDiff(positional);
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(e.message + "\n");
      process.exit(2);
    }
    process.stderr.write(formatMessage("gate.risk-surface-guard.internal-error", { message: e.message }, overrides).message + "\n");
    process.exit(2);
  }

  let findings;
  try {
    findings = scanDiff(diffText).findings;
  } catch (e) {
    process.stderr.write(formatMessage("gate.risk-surface-guard.internal-error", { message: e.message }, overrides).message + "\n");
    process.exit(2);
  }

  if (format === "sarif") {
    process.stdout.write(emitSarif(findings) + "\n");
  } else if (format === "json") {
    process.stdout.write(emitJson(findings, { mode }) + "\n");
  } else {
    process.stdout.write(formatHuman(findings, { mode }) + "\n");
  }

  process.exit(decideExitCode(mode, findings));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
