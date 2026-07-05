#!/usr/bin/env node
// Tripwires: a local, best-effort editor hook kernel. It gives a coding agent
// (Claude Code, Cursor) an early, advisory warning before it writes a gate-weakening
// edit, by shelling out to this repo's own, unmodified scripts/guard-ratchet.mjs.
//
// This is NOT the real gate. The CI ratchet, run from a base-branch copy the PR
// cannot edit, is the actual enforcement boundary (see ARCHITECTURE.md, "Trust
// boundaries and security invariants"). Tripwires only try to catch an obvious
// mistake before an agent opens a pull request, so it does not have to round-trip
// through CI to find out. Every denial says so.
//
// Usage: some JSON hook payload | node scripts/tripwire-check.mjs --format=claude
//        some JSON hook payload | node scripts/tripwire-check.mjs --format=cursor
//
// Input shapes (confirmed against each vendor's docs; see the commit that added this
// file for citations):
//   Claude Code PreToolUse hook: { tool_name, tool_input, cwd, ... } on stdin.
//     tool_name "Bash"      -> tool_input.command (a shell command string)
//     tool_name "Edit"      -> tool_input.file_path, .old_string, .new_string
//     tool_name "MultiEdit" -> tool_input.file_path, .edits: [{old_string,new_string}]
//     tool_name "Write"     -> tool_input.file_path, .content (or .file_text)
//   Cursor beforeShellExecution hook: { command, cwd, ... } on stdin (no tool_name
//     wrapper). Cursor has no hook that fires before a file edit/write is applied to
//     disk and can still deny it: afterFileEdit exists but is a post-hoc notification
//     hook that cannot block, so it is not registered by templates/.cursor/hooks.json.
//     beforeShellExecution is therefore the only viable interception point for Cursor,
//     which means Cursor coverage here is shell-command-only by construction, not by
//     an oversight.
//
// Known limitation (documented, not hidden): a bare shell-command string carries no
// diff. This kernel best-effort-extracts a synthetic before/after pair from common
// gate-weakening shell idioms (a `sed` substitution, a shell redirect target) and
// otherwise falls back to treating the whole command as a single addition. That
// catches literal-pattern categories (skip/focus injection, vacuous assertions, type
// escapes, coverage-keyword mentions) when the offending text appears verbatim in the
// command, but it cannot see removal-based categories (assertion-count deltas,
// coverage-threshold lowering that needs both an old and a new numeric value) unless
// a `sed` substitution supplies both sides. The Claude Code Edit/MultiEdit/Write
// paths do not have this limitation: they carry a real old/new pair (or, for Write,
// this script reads the file's current on-disk content as the "old" side), so a
// precise synthetic diff is built and the full detector runs as designed.
//
// Known reliability caveat (documented, not hidden): both vendors have had reported
// issues, as of mid-2026, where a hook's deny decision was not always honored by the
// harness (see the commit message and final report for citations: e.g. Claude Code
// PreToolUse `permissionDecision: "deny"` ignored for the Edit tool in some versions;
// Cursor's `userMessage`/`agentMessage` fields and the "ask" permission regressing in
// some releases, though Cursor's own "deny" itself was reported reliable). This is one
// more reason Tripwires are advisory only: even the deny signal itself is not
// guaranteed to be honored by every harness version. The CI ratchet has no such
// dependency; it is a plain process exit code a required check reads.
//
// This script never forks guard-ratchet.mjs's detection logic: every one of the nine
// gate-weakening categories is still decided by that file, unmodified, via its
// existing --diff/--json CLI contract. Everything here is extraction (turning a hook
// payload into a synthetic diff) and formatting (turning guard-ratchet's JSON findings
// into the tool-specific allow/deny shape), never re-implementation of a category.
import { readFileSync, writeFileSync, rmSync, mkdtempSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const GUARD_RATCHET = join(here, "guard-ratchet.mjs");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ARGS = process.argv.slice(2);
const formatArg = ARGS.find((a) => a.startsWith("--format="));
const FORMAT = formatArg ? formatArg.slice("--format=".length) : null;

// ---------------------------------------------------------------------------
// Response shaping. See the module header for where these shapes come from.
// ---------------------------------------------------------------------------

function emit(format, decision, reason) {
  if (format === "claude") {
    const out = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision === "deny" ? "deny" : "allow",
      },
    };
    if (decision === "deny") out.hookSpecificOutput.permissionDecisionReason = reason;
    process.stdout.write(JSON.stringify(out) + "\n");
  } else if (format === "cursor") {
    const out = { permission: decision === "deny" ? "deny" : "allow" };
    if (decision === "deny") {
      out.userMessage = reason;
      out.agentMessage = reason;
    }
    process.stdout.write(JSON.stringify(out) + "\n");
  }
  // format === null: nothing we can print in a shape either tool understands.
  // Exiting 0 with no stdout is itself a safe "no objection" for both protocols.
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Extraction: turn a hook payload into { kind, ... } describing the proposed change.
// ---------------------------------------------------------------------------

function extractFromClaudeToolInput(toolName, input, cwd) {
  if (toolName === "Bash") {
    return { kind: "command", text: String(input.command ?? ""), cwd };
  }
  if (toolName === "Edit") {
    return {
      kind: "edit",
      filePath: input.file_path || "",
      oldText: input.old_string ?? "",
      newText: input.new_string ?? "",
    };
  }
  if (toolName === "MultiEdit" && Array.isArray(input.edits)) {
    return { kind: "multiedit", filePath: input.file_path || "", edits: input.edits };
  }
  if (toolName === "Write") {
    return {
      kind: "write",
      filePath: input.file_path || "",
      content: input.content ?? input.file_text ?? "",
      cwd,
    };
  }
  return { kind: "none" };
}

// Format-agnostic: driven by which fields the payload actually has, not by --format.
// A Claude PreToolUse payload always carries tool_name/tool_input; a Cursor
// beforeShellExecution payload carries `command` directly with no such wrapper.
function extractChange(payload) {
  if (payload && typeof payload.tool_name === "string" && payload.tool_input && typeof payload.tool_input === "object") {
    return extractFromClaudeToolInput(payload.tool_name, payload.tool_input, payload.cwd);
  }
  if (payload && typeof payload.command === "string") {
    return { kind: "command", text: payload.command, cwd: payload.cwd };
  }
  return { kind: "none" };
}

// ---------------------------------------------------------------------------
// Shell-command heuristics (documented limitation: best-effort, not exhaustive).
// These only decide WHICH file bucket and WHICH before/after text to hand to
// guard-ratchet.mjs. The actual gate-weakening pattern matching stays entirely in
// that file.
// ---------------------------------------------------------------------------

// A handful of common test-file and gate-config-file name shapes, so a shell command
// that names its target file routes to the same file-type classification
// guard-ratchet.mjs already uses internally for a real diff.
const TEST_TOKEN = /[^\s"'`]+\.(?:test|spec)\.(?:c|m)?[jt]sx?\b|[^\s"'`]+_test\.py\b|[^\s"'`]*test_[^\s"'`]*\.py\b|[^\s"'`]+Tests?\.java\b|[^\s"'`]+IT\.java\b|[^\s"'`]+Tests?\.cs\b/;
const CONFIG_TOKEN = /[^\s"'`]*jest\.config\.(?:c|m)?[jt]s\b|[^\s"'`]*vitest\.config\.(?:c|m)?[jt]s\b|[^\s"'`]*pyproject\.toml\b|[^\s"'`]*pom\.xml\b|[^\s"'`]*build\.gradle(?:\.kts)?\b|[^\s"'`]*tsconfig[^\s"'`]*\.json\b|[^\s"'`]*\.csproj\b|[^\s"'`]*\.runsettings\b/;

function guessFileFromCommand(cmd) {
  const t = cmd.match(TEST_TOKEN);
  if (t) return t[0];
  const c = cmd.match(CONFIG_TOKEN);
  if (c) return c[0];
  // No concrete path found, but the command carries a strong language signal
  // (e.g. it names a glob like *.test.js rather than one literal file). Route it
  // to a synthetic bucket file of the matching kind so guard-ratchet's per-language
  // classification still applies.
  if (/\.test\.|\.spec\.|_test\.py\b|test_\w+\.py\b/.test(cmd)) return "tripwire/detected.test.js";
  if (/@Test\b|assertEquals|assertThat/.test(cmd)) return "tripwire/DetectedTests.java";
  if (/coverageThreshold|fail_under|jacocoTestCoverageVerification|violationRules|<minimum>|<Threshold>|--threshold\b/.test(cmd)) {
    return "tripwire/detected.config.js";
  }
  if (/:\s*any\b|\bas\s+any\b/.test(cmd)) return "tripwire/detected.ts";
  return null;
}

// Best-effort parse of a `sed 's/PATTERN/REPLACEMENT/'` (or `#`, `|`, `,`, `@`
// delimited) substitution. This is the one shell idiom common enough, and
// structured enough, to reliably recover a real before/after pair from a bare
// command string: the pattern is what is being removed, the replacement is what
// is being added.
function parseSedReplacement(cmd) {
  if (!/\bsed\b/.test(cmd)) return null;
  for (const delim of ["/", "#", "|", ",", "@", ":"]) {
    const d = delim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`s${d}((?:\\\\.|[^\\\\${d}])*)${d}((?:\\\\.|[^\\\\${d}])*)${d}`);
    const m = cmd.match(re);
    if (m) return { pattern: unescapeSed(m[1]), replacement: unescapeSed(m[2]) };
  }
  return null;
}

function unescapeSed(s) {
  return s.replace(/\\(.)/g, "$1");
}

// Best-effort parse of a shell redirect target (`> file`, `>> file`), which names
// the exact file the command is about to write, stronger than any token guess.
function parseRedirectTarget(cmd) {
  const m = cmd.match(/(?:^|[\s;&|])(>>?)\s*([^\s;&|<>]+)/);
  if (!m) return null;
  const target = m[2].replace(/^["'`]|["'`]$/g, "");
  if (!target || target.startsWith("&") || target === "/dev/null") return null;
  return target;
}

function diffForCommand(cmd) {
  if (!cmd || !cmd.trim()) return null;
  const redirectTarget = parseRedirectTarget(cmd);
  const sed = parseSedReplacement(cmd);
  const fileHint = redirectTarget || guessFileFromCommand(cmd) || "tripwire/unclassified-shell-command.txt";
  const lines = [`--- a/${fileHint}`, `+++ b/${fileHint}`];
  if (sed) {
    lines.push(`-${sed.pattern}`);
    lines.push(`+${sed.replacement}`);
  } else {
    // No structured before/after available. See the module header for exactly
    // which categories this can and cannot see in this shape.
    lines.push(`+${cmd}`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Synthetic diff construction for the precise (Claude Edit/MultiEdit/Write) paths.
// guard-ratchet.mjs's own diff parser only looks for `--- a/`, `+++ `, and leading
// `+`/`-` lines; it does not require valid unified-diff hunk headers, so this is a
// faithful, minimal encoding of the same before/after pair a real `git diff` would
// carry for these tool calls.
// ---------------------------------------------------------------------------

function diffForReplace(filePath, oldText, newText) {
  const file = filePath || "tripwire/unknown-file";
  const lines = [`--- a/${file}`, `+++ b/${file}`];
  for (const l of String(oldText).split("\n")) lines.push(`-${l}`);
  for (const l of String(newText).split("\n")) lines.push(`+${l}`);
  return lines.join("\n") + "\n";
}

function diffForMultiEdit(filePath, edits) {
  const file = filePath || "tripwire/unknown-file";
  const lines = [`--- a/${file}`, `+++ b/${file}`];
  for (const e of edits) {
    for (const l of String(e?.old_string ?? "").split("\n")) lines.push(`-${l}`);
    for (const l of String(e?.new_string ?? "").split("\n")) lines.push(`+${l}`);
  }
  return lines.join("\n") + "\n";
}

function diffForWrite(filePath, content, cwd) {
  const file = filePath || "tripwire/unknown-file";
  let oldLines = null;
  try {
    const abs = isAbsolute(file) ? file : join(cwd || process.cwd(), file);
    if (existsSync(abs)) oldLines = readFileSync(abs, "utf8").split("\n");
  } catch {
    oldLines = null;
  }
  const lines = [oldLines === null ? "--- /dev/null" : `--- a/${file}`, `+++ b/${file}`];
  if (oldLines) for (const l of oldLines) lines.push(`-${l}`);
  for (const l of String(content).split("\n")) lines.push(`+${l}`);
  return lines.join("\n") + "\n";
}

function buildSyntheticDiff(change) {
  switch (change.kind) {
    case "edit":
      return diffForReplace(change.filePath, change.oldText, change.newText);
    case "multiedit":
      return diffForMultiEdit(change.filePath, change.edits);
    case "write":
      return diffForWrite(change.filePath, change.content, change.cwd);
    case "command":
      return diffForCommand(change.text);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Shell out to the existing, unmodified scripts/guard-ratchet.mjs.
// ---------------------------------------------------------------------------

function runGuardRatchet(diffText) {
  let tmpDir;
  try {
    tmpDir = mkdtempSync(join(tmpdir(), "modonome-tripwire-"));
    const tmpFile = join(tmpDir, "change.diff");
    writeFileSync(tmpFile, diffText);
    const res = spawnSync(process.execPath, [GUARD_RATCHET, "--diff", tmpFile, "--json"], {
      encoding: "utf8",
      timeout: 10000,
    });
    if (res.error || typeof res.stdout !== "string" || !res.stdout.trim()) {
      return { ok: false, findings: [] };
    }
    let parsed;
    try {
      parsed = JSON.parse(res.stdout);
    } catch {
      return { ok: false, findings: [] };
    }
    return { ok: true, findings: Array.isArray(parsed.findings) ? parsed.findings : [] };
  } catch {
    return { ok: false, findings: [] };
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup only */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Deny reason. Every message names the exact MR-category, and every message ends
// by saying plainly that this is advisory only, not the CI gate.
// ---------------------------------------------------------------------------

function formatDenyReason(findings) {
  const categories = [...new Set(findings.map((f) => `${f.rule} (${f.code})`))].join(", ");
  const detail = findings.map((f) => f.message).join(" ");
  return (
    `Tripwire (local, best-effort): this looks like ${categories}. ${detail} ` +
    "This is an advisory echo, not the real gate: the base-branch CI copy of " +
    "guard-ratchet.mjs is the judge that actually blocks a merge. Some editor hook " +
    "versions do not always honor a deny decision, so treat this as a nudge and rely " +
    "on CI to actually enforce it."
  );
}

// ---------------------------------------------------------------------------
// Main. Fails open on every error path: a bug in this best-effort script must never
// block an agent's real work. The CI ratchet is unaffected by anything here.
// ---------------------------------------------------------------------------

function main() {
  if (FORMAT !== "claude" && FORMAT !== "cursor") {
    process.stderr.write("tripwire-check: pass --format=claude or --format=cursor\n");
    process.exit(0);
    return;
  }

  let payload;
  try {
    const raw = readFileSync(0, "utf8");
    payload = JSON.parse(raw);
  } catch {
    emit(FORMAT, "allow", null);
    return;
  }

  const change = extractChange(payload);
  if (change.kind === "none") {
    emit(FORMAT, "allow", null);
    return;
  }

  const diffText = buildSyntheticDiff(change);
  if (!diffText) {
    emit(FORMAT, "allow", null);
    return;
  }

  const result = runGuardRatchet(diffText);
  if (!result.ok || result.findings.length === 0) {
    emit(FORMAT, "allow", null);
    return;
  }

  emit(FORMAT, "deny", formatDenyReason(result.findings));
}

try {
  main();
} catch {
  // Last-resort fail-open: never let an unexpected exception here block the agent.
  if (FORMAT === "claude" || FORMAT === "cursor") emit(FORMAT, "allow", null);
  else process.exit(0);
}
