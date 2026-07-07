#!/usr/bin/env node
/**
 * check-regex-safety.mjs
 *
 * A ReDoS / regex-safety lint for the attribution detectors and the near-miss
 * widener. A promotion adds a pattern to a denylist; a catastrophically-backtracking
 * pattern (a nested quantifier like (x+)+) would turn an advisory scan into a
 * denial-of-service on attacker-controlled input (a branch name, a commit body).
 * This gate rejects that class of pattern before it can reach the live detector.
 *
 * It gathers patterns three ways, since a JS project with no parser dependency
 * cannot fully evaluate dynamically-built regexes statically:
 *   1. Runtime: the actual .source of every exported RegExp (and RegExps inside an
 *      exported array), which resolves AI_SIGNATURE_RE and DENYLISTED_NAME_PATTERNS.
 *   2. Static: the string/template-literal argument of every new RegExp("...") call.
 *   3. Static: regex literals /.../ in the source.
 * Each pattern source is scanned for the nested-quantifier shape safe-regex targets.
 * Local regexes built from literal token lists (an alternation of fixed strings) are
 * safe by construction and need no special handling.
 *
 * It reads modules from disk, so on a PR it must run BEFORE ci.yml's base-branch
 * checkout, to judge THIS branch's proposed patterns rather than the base copy.
 *
 * Usage: node scripts/check-regex-safety.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const overrides = loadMessageOverrides(resolve(root, ".modonome"));

const TARGET_FILES = [
  "scripts/lib/branch-name.mjs",
  "scripts/lib/commit-identity.mjs",
  "scripts/lib/detect-attribution.mjs",
  "scripts/lib/near-miss.mjs",
];

// Remove character classes [...] so a literal + or * inside a class ("[a+]") is not
// read as a quantifier. Escaped chars are skipped.
function stripCharClasses(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\") { i += 1; continue; }
    if (ch === "[") {
      i += 1;
      while (i < src.length && src[i] !== "]") {
        if (src[i] === "\\") i += 1;
        i += 1;
      }
      continue;
    }
    out += ch;
  }
  return out;
}

// True when a group body contains a top-level unbounded quantifier.
function bodyHasUnbounded(body) {
  const s = stripCharClasses(body);
  return /[+*]/.test(s) || /\{\d+,\}/.test(s);
}

// Detect nested quantifiers: a group (...) that is itself quantified by an
// unbounded quantifier (+, *, or {n,}) AND whose body contains an unbounded
// quantifier. This is the catastrophic-backtracking class ((x+)+, (x*)+, (x+)*).
export function redosFindings(source) {
  const findings = [];
  const stack = [];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\") { i += 1; continue; }
    if (ch === "[") {
      i += 1;
      while (i < source.length && source[i] !== "]") {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      continue;
    }
    if (ch === "(") { stack.push(i); continue; }
    if (ch === ")") {
      const open = stack.pop();
      if (open === undefined) continue;
      const body = source.slice(open + 1, i);
      const after = source.slice(i + 1);
      const outer = after.match(/^(?:[+*]|\{\d+,\})/);
      if (outer && bodyHasUnbounded(body)) {
        findings.push(`(${body})${outer[0]}`);
      }
    }
  }
  return findings;
}

// 1. Runtime: exported RegExp sources (including RegExps inside an exported array).
async function exportedRegexSources(absFile) {
  const out = [];
  const mod = await import(pathToFileURL(absFile).href);
  const visit = (value, label) => {
    if (value instanceof RegExp) out.push({ label, source: value.source });
    else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${label}[${i}]`));
  };
  for (const [name, value] of Object.entries(mod)) visit(value, name);
  return out;
}

// 2/3. Static: new RegExp("..."|`...`) string args (no interpolation) and /.../ literals.
function staticPatternSources(src) {
  const out = [];
  // Every body alternation below is kept deterministic: "\\." starts with a
  // backslash and each companion character class excludes the backslash (and the
  // relevant delimiter), so the alternatives never overlap and matching is
  // linear-time. An earlier char-class-aware variant overlapped and caused the very
  // ReDoS this gate exists to catch, which its own nested-quantifier heuristic could
  // not self-detect (that heuristic covers nested quantifiers, not overlapping
  // alternation). A double-quoted and a single-quoted matcher replace one
  // backreference matcher, since a backreference cannot go inside a character class.
  for (const m of src.matchAll(/new\s+RegExp\(\s*"((?:\\.|[^"\\])*)"/g)) {
    if (!m[1].includes("${")) out.push({ label: "new RegExp(string)", source: m[1] });
  }
  for (const m of src.matchAll(/new\s+RegExp\(\s*'((?:\\.|[^'\\])*)'/g)) {
    if (!m[1].includes("${")) out.push({ label: "new RegExp(string)", source: m[1] });
  }
  for (const m of src.matchAll(/new\s+RegExp\(\s*`([^`]*)`/g)) {
    if (!m[1].includes("${")) out.push({ label: "new RegExp(template)", source: m[1] });
  }
  // Regex literals in a plausible regex position (assignment, call arg, array,
  // return). A literal with a "/" inside a character class is only partially
  // captured, which yields a safe non-finding rather than a false positive; a
  // dangerous shape such as /(a+)+/ has no such slash and is still captured.
  const litRe = /(?:[=(,:[!&|?{}]|=>|return|\s)\s*\/((?:\\.|[^/\\\n])+)\/[gimsuy]*/g;
  for (const m of src.matchAll(litRe)) out.push({ label: "regex literal", source: m[1] });
  return out;
}

// Collect every regex-safety problem across the target files. Exported (not run at
// import time) so the gate can be exercised without triggering process.exit.
export async function regexSafetyProblems(rootDir = root) {
  const problems = [];
  for (const rel of TARGET_FILES) {
    const absFile = resolve(rootDir, rel);
    let src;
    try {
      src = readFileSync(absFile, "utf8");
    } catch {
      continue; // a target that does not exist yet (bootstrap) is not a failure
    }
    const sources = [...staticPatternSources(src)];
    try {
      sources.push(...(await exportedRegexSources(absFile)));
    } catch (e) {
      problems.push(formatMessage("gate.regex-safety.import-failed", { file: rel, reason: e.message }, overrides).message);
    }
    for (const { label, source } of sources) {
      for (const hit of redosFindings(source)) {
        problems.push(formatMessage("gate.regex-safety.catastrophic-backtracking", { file: rel, label, hit }, overrides).message);
      }
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = await regexSafetyProblems();
  console.log("Regex safety (ReDoS) lint");
  console.log("=========================");
  if (problems.length === 0) {
    console.log(`PASS: no nested-quantifier patterns in ${TARGET_FILES.length} detector module(s).`);
    process.exit(0);
  }
  console.error(formatMessage("gate.regex-safety.fail-summary", { count: problems.length }, overrides).message);
  for (const p of problems) console.error("  - " + p);
  console.error(formatMessage("gate.regex-safety.fail-footer", {}, overrides).message);
  process.exit(1);
}
