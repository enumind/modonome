// ADR-045 (5.4): the CLI-transport maker/checker invocation must never fall back to
// --dangerously-skip-permissions. This locks in the argv shape empirically verified
// against a live Claude Code CLI session: --permission-mode manual denies anything
// outside --allowedTools with a clean, non-hanging response in non-interactive (-p)
// mode, unlike --permission-mode acceptEdits, which was observed to let an unlisted
// `rm` deletion through despite an --allowedTools list that did not include it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoleCliArgs } from "../scripts/agent/run-cycle.mjs";

test("buildRoleCliArgs never includes --dangerously-skip-permissions", () => {
  const args = buildRoleCliArgs({ model: "claude-sonnet-4-6" }, { maxTurns: 10 }, "do the thing");
  assert.ok(
    !args.includes("--dangerously-skip-permissions"),
    "the CLI-transport role invocation must not bypass all permission checks"
  );
});

test("buildRoleCliArgs uses --permission-mode manual, the mode verified to deny outside the allowlist", () => {
  const args = buildRoleCliArgs({ model: "claude-sonnet-4-6" }, { maxTurns: 10 }, "do the thing");
  const i = args.indexOf("--permission-mode");
  assert.ok(i >= 0, "--permission-mode must be present");
  assert.equal(args[i + 1], "manual");
});

test("buildRoleCliArgs scopes --allowedTools to file edits plus git/gh/gate-runner Bash patterns", () => {
  const args = buildRoleCliArgs({ model: "claude-sonnet-4-6" }, { maxTurns: 10 }, "do the thing");
  const i = args.indexOf("--allowedTools");
  assert.ok(i >= 0, "--allowedTools must be present");
  const modelIdx = args.indexOf("--model");
  const tools = args.slice(i + 1, modelIdx);
  for (const required of ["Read", "Edit", "Write", "Bash(git *)", "Bash(gh *)"]) {
    assert.ok(tools.includes(required), `--allowedTools must include ${required}`);
  }
  // No bare, unscoped "Bash" entry: every Bash grant must be pattern-scoped.
  assert.ok(!tools.includes("Bash"), "must not grant unscoped Bash access");
});

test("buildRoleCliArgs still passes the model, max-turns, and prompt through unchanged", () => {
  const args = buildRoleCliArgs({ model: "claude-opus-4-8" }, { maxTurns: 42 }, "the rendered prompt");
  assert.deepEqual(args.slice(-6), [
    "--model", "claude-opus-4-8",
    "--max-turns", "42",
    "-p", "the rendered prompt",
  ]);
});
