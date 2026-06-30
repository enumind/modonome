/**
 * commit-identity.mjs
 *
 * Rejects commit author and committer identities that belong to a coding agent
 * or model vendor. Agent identity must not appear in the git history. This
 * complements the branch-name guard and is deterministic so it runs in CI.
 */

const DENYLISTED_EMAIL_DOMAINS = [
  'anthropic.com',
];

const DENYLISTED_NAME_PATTERNS = [
  /\bclaude\b/i,
  /\banthropic\b/i,
  /\bcopilot\b/i,
  /\bopenai\b/i,
  /\bchatgpt\b/i,
];

/**
 * True when a name or email belongs to a denylisted agent or vendor identity.
 * Real automation such as dependabot is allowed; only coding-agent and model
 * vendor identities are rejected.
 */
export function isForbiddenIdentity(name, email) {
  const e = (email || '').trim().toLowerCase();
  if (e) {
    const domain = e.includes('@') ? e.slice(e.lastIndexOf('@') + 1) : '';
    if (DENYLISTED_EMAIL_DOMAINS.includes(domain)) return true;
  }
  const n = (name || '').trim();
  if (n && DENYLISTED_NAME_PATTERNS.some((re) => re.test(n))) return true;
  return false;
}

/**
 * Parse `git log` output where each commit is one line of
 * "authorName<TAB>authorEmail<TAB>committerName<TAB>committerEmail<TAB>shortSha".
 * Returns the commits whose author or committer is a forbidden identity.
 */
export function findForbiddenCommits(logOutput) {
  const offenders = [];
  for (const line of (logOutput || '').split('\n')) {
    if (!line.trim()) continue;
    const [an, ae, cn, ce, sha] = line.split('\t');
    if (isForbiddenIdentity(an, ae) || isForbiddenIdentity(cn, ce)) {
      offenders.push({ sha: sha || '', author: `${an} <${ae}>`, committer: `${cn} <${ce}>` });
    }
  }
  return offenders;
}

export { DENYLISTED_EMAIL_DOMAINS, DENYLISTED_NAME_PATTERNS };
