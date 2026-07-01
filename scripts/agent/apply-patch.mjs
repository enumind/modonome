// Deterministic patch application for the OpenAI-http single-shot execution
// path. The model returns a unified diff in its response text; this module
// extracts that diff and applies it with the git binary, which is atomic (a
// diff that does not apply cleanly leaves the working tree untouched). No
// runtime dependencies: only node:child_process and the git binary.
import { spawnSync } from "node:child_process";

const FENCE_RE = /```(diff|patch)?\n([\s\S]*?)```/g;

// A body looks like a unified diff when it has a "diff --git" header, or a
// paired "--- "/"+++ " file header, or an "@@ " hunk marker.
function looksLikeDiff(body) {
  if (!body) return false;
  return /^diff --git /m.test(body)
    || (/^--- /m.test(body) && /^\+\+\+ /m.test(body))
    || /^@@ /m.test(body);
}

/**
 * Pull a unified diff out of a model response. Prefers a fenced ```diff or
 * ```patch block; falls back to a bare fenced block whose body looks like a
 * diff; falls back to treating the whole text as a raw diff body. Returns
 * null when no diff-shaped content is found.
 *
 * @param {string} text - Raw model response text.
 * @returns {string|null}
 */
export function extractDiff(text) {
  if (typeof text !== "string" || text.length === 0) return null;

  let bareFenceBody = null;
  FENCE_RE.lastIndex = 0;
  let m;
  while ((m = FENCE_RE.exec(text)) !== null) {
    const [, lang, body] = m;
    const trimmed = body.trim();
    if (!trimmed) continue;
    if (lang === "diff" || lang === "patch") return trimmed;
    if (bareFenceBody === null && looksLikeDiff(trimmed)) bareFenceBody = trimmed;
  }
  if (bareFenceBody !== null) return bareFenceBody;

  const trimmed = text.trim();
  if (looksLikeDiff(trimmed)) return trimmed;

  return null;
}

/**
 * Apply a unified diff to a working directory using the git binary.
 * Validates with `git apply --check` first; git apply is atomic, so a diff
 * that fails validation or application is never partially applied and the
 * working tree is left unchanged. Never writes outside `cwd`.
 *
 * @param {string} diff - Unified diff text.
 * @param {string} cwd - Target working directory (must be inside a git repo).
 * @param {{ spawnSyncImpl?: typeof import("node:child_process").spawnSync }} [deps]
 * @returns {{ applied: boolean, reason: string }}
 */
export function applyPatch(diff, cwd, deps = {}) {
  if (!diff || !diff.trim()) return { applied: false, reason: "no diff content." };

  const spawnSyncImpl = deps.spawnSyncImpl ?? spawnSync;
  // A unified diff's final hunk line must end with a newline (its absence is
  // itself meaningful: "no newline at end of file"). Extraction trims
  // surrounding whitespace, so restore exactly one trailing newline here.
  const patchText = diff.endsWith("\n") ? diff : `${diff}\n`;

  const check = spawnSyncImpl("git", ["apply", "--check", "-"], {
    cwd,
    input: patchText,
    encoding: "utf8",
  });
  if (check.error) return { applied: false, reason: `git apply --check failed to run: ${check.error.message}` };
  if (check.status !== 0) {
    return { applied: false, reason: `patch does not apply cleanly: ${(check.stderr || "").trim() || "unknown error"}` };
  }

  const apply = spawnSyncImpl("git", ["apply", "-"], {
    cwd,
    input: patchText,
    encoding: "utf8",
  });
  if (apply.error) return { applied: false, reason: `git apply failed to run: ${apply.error.message}` };
  if (apply.status !== 0) {
    return { applied: false, reason: `git apply failed: ${(apply.stderr || "").trim() || "unknown error"}` };
  }

  return { applied: true, reason: "patch applied." };
}
