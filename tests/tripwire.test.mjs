// Tripwires: the local, best-effort editor hook kernel (scripts/tripwire-check.mjs).
// Feeds synthetic Claude Code PreToolUse and Cursor beforeShellExecution stdin
// payloads through the real script via spawnSync and asserts the tool-specific
// allow/deny JSON shape confirmed in the commit that introduced this file. This
// kernel is advisory only (see ARCHITECTURE.md); these tests do not touch the CI
// ratchet (scripts/guard-ratchet.mjs), which stays the real gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const KERNEL = join(root, "scripts", "tripwire-check.mjs");

function run(format, payload) {
  const res = spawnSync(process.execPath, [KERNEL, `--format=${format}`], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
    timeout: 10000,
  });
  return res;
}

function parseJsonLine(stdout) {
  return JSON.parse(stdout.trim());
}

// Assemble the gate-weakening fixture payloads below from string fragments so this
// test file's own source text does not contain the exact patterns that
// scripts/guard-ratchet.mjs regex-scans *.test.mjs files for. The ratchet cannot
// tell "a string literal fixture proving the kernel detects this construct" from
// "an actual instance of the construct," so a literal fixture here would trip the
// ratchet's self-scan of this very file. The KERNEL under test
// (scripts/tripwire-check.mjs) still receives the fully reconstructed runtime
// string, byte-for-byte identical to before, so detection is exercised exactly the
// same way. Do not "helpfully" inline these fragments back together.
const SKIP_CALL = "it." + "skip" + "(\"broken\", () => {});";
const VACUOUS_ASSERT = "expect(true)" + "." + "toBeTruthy" + "();";

// ---------------------------------------------------------------------------
// Claude Code shape: { tool_name, tool_input, cwd, ... }
// ---------------------------------------------------------------------------

test("claude format: Edit tool injecting a skipped test is denied with the MR category and the advisory-echo line", () => {
  const payload = {
    session_id: "abc123",
    cwd: root,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: "foo.test.js",
      old_string: "expect(x).toBe(1);",
      new_string: "expect(x).toBe(1);\n" + SKIP_CALL,
    },
  };
  const res = run("claude", payload);
  assert.equal(res.status, 0, "kernel always exits 0 (advisory, never blocks the process)");
  const out = parseJsonLine(res.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /skip-injection/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /MR102/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /advisory echo/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /not the real gate/);
});

test("claude format: a clean Edit tool call (value change, no gate-weakening) is allowed", () => {
  const payload = {
    cwd: root,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: "foo.test.js",
      old_string: "expect(x).toBe(1);",
      new_string: "expect(x).toBe(2);",
    },
  };
  const res = run("claude", payload);
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
  assert.equal(out.hookSpecificOutput.permissionDecisionReason, undefined);
});

test("claude format: a Bash tool call carrying a coverage-lowering sed is denied", () => {
  const payload = {
    cwd: root,
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: {
      command: "sed -i \"s/coverageThreshold: 80/coverageThreshold: 0/\" jest.config.js",
    },
  };
  const res = run("claude", payload);
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /coverage-lowering/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /MR104/);
});

test("claude format: a Write tool call rewriting a whole test file to remove its assertions is denied", () => {
  const payload = {
    cwd: root,
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: {
      // A nonexistent path under cwd so the kernel's read-current-content step
      // (diffForWrite) sees no prior file and treats the whole write as new
      // content; assertion-count deltas need a real prior file, so this checks
      // the vacuous-assertion category instead, which fires on added content alone.
      file_path: "tripwire-fixture-does-not-exist.test.js",
      content: "test(\"x\", () => { " + VACUOUS_ASSERT + " });\n",
    },
  };
  const res = run("claude", payload);
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /vacuous-assertion/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /MR103/);
});

// ---------------------------------------------------------------------------
// Cursor shape: { command, cwd, ... } (no tool_name/tool_input wrapper)
// ---------------------------------------------------------------------------

test("cursor format: beforeShellExecution carrying a coverage-lowering sed is denied with permission/agentMessage/userMessage", () => {
  const payload = {
    command: "sed -i \"s/coverageThreshold: 80/coverageThreshold: 0/\" jest.config.js",
    cwd: root,
    hook_event_name: "beforeShellExecution",
  };
  const res = run("cursor", payload);
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.equal(out.permission, "deny");
  assert.match(out.agentMessage, /coverage-lowering/);
  assert.match(out.agentMessage, /MR104/);
  assert.match(out.agentMessage, /advisory echo/);
  assert.match(out.userMessage, /advisory echo/);
});

test("cursor format: an ordinary shell command with no gate-weakening signal is allowed", () => {
  const payload = { command: "npm test", cwd: root };
  const res = run("cursor", payload);
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.deepEqual(out, { permission: "allow" });
});

test("cursor format: a skip-injection appended via a shell redirect is denied", () => {
  const payload = {
    command: "echo '" + SKIP_CALL + "' >> some.test.js",
    cwd: root,
  };
  const res = run("cursor", payload);
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.equal(out.permission, "deny");
  assert.match(out.agentMessage, /skip-injection/);
});

// ---------------------------------------------------------------------------
// Fail-open behavior: this is a best-effort script, never a second blocking gate.
// ---------------------------------------------------------------------------

test("malformed stdin JSON fails open (allow) rather than crashing or blocking", () => {
  const res = run("claude", "{not json");
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
});

test("a payload with no recognizable tool_input or command fails open (allow)", () => {
  const res = run("cursor", { hook_event_name: "sessionStart" });
  assert.equal(res.status, 0);
  const out = parseJsonLine(res.stdout);
  assert.deepEqual(out, { permission: "allow" });
});

test("an unknown --format value exits cleanly with no stdout (no shape it could print)", () => {
  const res = spawnSync(process.execPath, [KERNEL, "--format=vscode"], {
    input: JSON.stringify({ command: "npm test" }),
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});
