// Agentic tool-loop execution mode (adapt-first, ADR-032). For harder Tier-1/
// Tier-2 work than the single-shot-diff path (WI-029) handles, this spawns an
// external, MIT-licensed agentic coding CLI declared in adapters.json as a
// "process" boundary tool, pointed at the resolved OpenAI-compatible endpoint.
// The CLI edits files in the target working directory directly; this module owns
// containment, the turn cap, the wall-clock timeout, and transcript capture, so
// the external tool is a component and the governance stays here.
//
// Zero runtime dependencies: only node:child_process and node:path. The spawn is
// injected via deps.spawnImpl so tests never launch a real binary.
import { spawn } from "node:child_process";
import { resolve, relative, isAbsolute } from "node:path";

const DEFAULT_TIMEOUT_MS = 300000;
const DEFAULT_MAX_TURNS = 40;
// Mirrors run-cycle's HARD_TURN_CAP: the adapter never forwards a turn count
// above this to the external tool, whatever the caller requests.
const HARD_TURN_CAP = 80;

/**
 * Resolve the command the external adapter is invoked as. Precedence: an explicit
 * adapterEntry.command, then adapterEntry.name, then a bare fallback. The value is
 * a bare command name resolved against PATH by the spawn implementation.
 *
 * @param {{ name?: string, command?: string }} adapterEntry
 * @returns {string}
 */
export function resolveAdapterCommand(adapterEntry) {
  const cmd = adapterEntry?.command ?? adapterEntry?.name;
  if (!cmd || typeof cmd !== "string" || !cmd.trim()) {
    throw new Error("tool-loop-adapter: adapter entry has no usable command/name.");
  }
  return cmd.trim();
}

/**
 * Enforce ADR-009 path containment. The adapter's working directory must resolve
 * to exactly the target directory (resolve(root, plan.target)); a cwd outside the
 * target, reached via ".." or an absolute path elsewhere, is refused before spawn.
 * Returns the pinned, absolute, contained cwd.
 *
 * @param {string} root - Repo root.
 * @param {string} target - plan.target (relative to root or absolute).
 * @returns {string}
 */
export function containedCwd(root, target) {
  const rootAbs = resolve(root);
  const targetAbs = resolve(rootAbs, target ?? ".");
  const rel = relative(rootAbs, targetAbs);
  if (rel !== "" && (rel === ".." || rel.startsWith(`..${sep()}`) || isAbsolute(rel))) {
    throw new Error(`tool-loop-adapter: target "${target}" escapes the repo root; refused (ADR-009).`);
  }
  return targetAbs;
}

function sep() {
  return process.platform === "win32" ? "\\" : "/";
}

/**
 * Build the argument vector for the external CLI. Points it at the resolved
 * endpoint (base URL and model), forwards a bounded max-turns flag, and reads the
 * prompt from stdin (so no prompt text lands in the process argv or logs). The
 * flag names follow the common opencode/aider convention; an adapter with a
 * different flag surface overrides them via adapterEntry.args if needed.
 *
 * @param {{ baseUrl?: string, model?: string }} endpoint
 * @param {number} maxTurns
 * @param {{ args?: string[] }} adapterEntry
 * @returns {string[]}
 */
export function buildAdapterArgs(endpoint, maxTurns, adapterEntry) {
  if (Array.isArray(adapterEntry?.args)) return [...adapterEntry.args];
  const args = ["--prompt-stdin", "--max-turns", String(maxTurns)];
  if (endpoint?.baseUrl) args.push("--base-url", endpoint.baseUrl);
  if (endpoint?.model) args.push("--model", endpoint.model);
  return args;
}

/**
 * Run the external agentic CLI for one role. Never throws on a bounded/expected
 * failure (spawn error, non-zero exit, timeout, cap hit): returns a clean status
 * object mirroring the single-shot path's no-op semantics, so run-cycle records it
 * through the same writeTranscriptAndMetric helper and the cycle continues.
 *
 * @param {object} params
 * @param {string} params.prompt - Rendered role prompt, passed on the child's stdin.
 * @param {{ baseUrl?: string, authToken?: string, model?: string }} params.endpoint
 * @param {string} params.root - Repo root.
 * @param {string} params.target - plan.target; the child's cwd is pinned inside it.
 * @param {object} params.adapterEntry - The adapters.json entry for this tool.
 * @param {number} [params.maxTurns] - Forwarded (clamped to the hard cap) to the CLI.
 * @param {number} [params.timeoutMs] - Wall-clock kill deadline for the child.
 * @param {object} [params.env] - Environment for the child.
 * @param {{ spawnImpl?: typeof spawn }} [params.deps]
 * @returns {Promise<{ status: number, transcript: string, reason: string }>}
 */
export async function runToolLoopAdapter({
  prompt,
  endpoint = {},
  root,
  target,
  adapterEntry,
  maxTurns = DEFAULT_MAX_TURNS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  env,
  deps = {},
}) {
  const spawnImpl = deps.spawnImpl ?? spawn;

  // Resolve and validate before spawning. A containment or command-resolution
  // failure is a bounded error, not a crash.
  let command;
  let cwd;
  try {
    command = resolveAdapterCommand(adapterEntry);
    cwd = containedCwd(root, target);
  } catch (e) {
    return { status: 1, transcript: `[tool-loop refused] ${e.message}\n`, reason: e.message };
  }

  const cappedTurns = Math.min(Number.isInteger(maxTurns) && maxTurns > 0 ? maxTurns : DEFAULT_MAX_TURNS, HARD_TURN_CAP);
  const args = buildAdapterArgs(endpoint, cappedTurns, adapterEntry);

  // The endpoint credential is passed only through the child environment, never
  // in argv (ADR-009 rule 4: no credential in the prompt/argv surface).
  const childEnv = { ...(env ?? {}) };
  if (endpoint.baseUrl) childEnv.OPENAI_BASE_URL = endpoint.baseUrl;
  if (endpoint.model) childEnv.OPENAI_MODEL = endpoint.model;
  if (endpoint.authToken) childEnv.OPENAI_API_KEY = endpoint.authToken;

  return new Promise((resolvePromise) => {
    let child;
    try {
      child = spawnImpl(command, args, { cwd, env: childEnv });
    } catch (e) {
      resolvePromise({ status: 1, transcript: `[tool-loop spawn failed] ${e.message}\n`, reason: `spawn failed: ${e.message}` });
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    // Wall-clock timeout: a hung or runaway adapter is killed so it cannot block
    // the cycle forever. This is enforced here regardless of whether the external
    // CLI honors --max-turns. The promise settles from here directly, so a child
    // that ignores the kill still cannot leave the cycle hanging.
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // Killing a process that already exited is harmless.
      }
      finish(124, `adapter timed out after ${timeoutMs}ms and was killed.`);
    }, timeoutMs);

    child.stdout?.on("data", (d) => { stdout += String(d); });
    child.stderr?.on("data", (d) => { stderr += String(d); });

    const finish = (status, reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const transcript = `${stdout}${stderr}\n[tool-loop status: ${status}] ${reason}\n`;
      resolvePromise({ status, transcript, reason });
    };

    child.on("error", (e) => {
      finish(1, `adapter process error: ${e.message}`);
    });

    child.on("close", (code, signal) => {
      if (timedOut) {
        finish(124, `adapter timed out after ${timeoutMs}ms and was killed.`);
        return;
      }
      const status = typeof code === "number" ? code : 1;
      const reason = status === 0
        ? "adapter completed."
        : `adapter exited with status ${status}${signal ? ` (signal ${signal})` : ""}.`;
      finish(status, reason);
    });

    // Pass the prompt on stdin, then close it so the child sees end-of-input.
    try {
      if (child.stdin) {
        child.stdin.write(prompt ?? "");
        child.stdin.end();
      }
    } catch {
      // A child that closed stdin early is not fatal; the close handler settles.
    }
  });
}
