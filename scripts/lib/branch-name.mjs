/**
 * branch-name.mjs
 *
 * Rejects branch names that lead with a model-identifier or bot prefix.
 * Autonomy tooling must keep agent identity out of git history, branch names,
 * and pull requests. The check is deterministic and runs in CI.
 */

const DENYLISTED_PREFIXES = [
  'claude',
  'anthropic',
  'gpt',
  'openai',
  'gemini',
  'copilot',
  'llm',
  'ai',
  'bot',
];

/**
 * True when the first path segment of a branch name equals a denylisted token.
 * Matching is case-insensitive. "feature/ai-adapter" is allowed because the
 * first segment is "feature"; only a leading "ai/" segment is rejected.
 */
export function isModelIdentifierBranch(name) {
  if (!name || typeof name !== 'string') return false;
  const firstSegment = name.split('/')[0].trim().toLowerCase();
  return DENYLISTED_PREFIXES.includes(firstSegment);
}

/**
 * Resolve the branch under review from CI environment variables. Prefers the
 * pull request head ref, then the push ref name. Returns an empty string when
 * neither is set so callers can fall back to a local git lookup.
 */
export function resolveBranchName(env = process.env) {
  const candidate = env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || '';
  return candidate.trim();
}

export { DENYLISTED_PREFIXES };
