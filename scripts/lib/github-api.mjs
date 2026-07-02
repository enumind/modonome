/**
 * github-api.mjs
 *
 * Minimal, read-only GitHub REST client for hygiene scanning. It fetches the two
 * surfaces the strict attribution detector needs to cover but that no tracked-file
 * gate can see: a pull request's title and body, and its conversation comments. It
 * mirrors scripts/agent/openai-client.mjs's house style: global fetch, an injectable
 * fetchImpl for tests, no network call at import time, and a fixed (non-random,
 * since Math.random is banned) exponential backoff that retries only 429 and 5xx.
 *
 * Scope is deliberately narrow. It reads; it never writes. PR review (inline) comments
 * live on a separate endpoint (/pulls/{n}/comments) and are out of v1 scope; this
 * client covers the issue/conversation comments endpoint (/issues/{n}/comments) where
 * the auto-appended session-URL footer and hand-written comments appear.
 */

import { spawnSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 100;

/** Resolve the owner/repo, preferring the GITHUB_REPOSITORY env, then git origin. */
export function resolveRepo(env = process.env, originUrl = null) {
  const fromEnv = (env.GITHUB_REPOSITORY || "").trim();
  if (fromEnv.includes("/")) {
    const [owner, repo] = fromEnv.split("/");
    if (owner && repo) return { owner, repo };
  }
  const url = originUrl ?? readOriginUrl();
  const m = url && url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/i);
  if (m) return { owner: m[1], repo: m[2] };
  throw new Error("github-api: could not resolve owner/repo from GITHUB_REPOSITORY or git remote origin.");
}

function readOriginUrl() {
  const r = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
  return (r.status ?? 1) === 0 ? (r.stdout || "").trim() : "";
}

/** The credential, from GITHUB_TOKEN or GH_TOKEN. Empty string means unauthenticated. */
export function resolveToken(env = process.env) {
  return env.GITHUB_TOKEN || env.GH_TOKEN || "";
}

function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a read-only client bound to one repository. All inputs are injectable so
 * tests drive it against a local mock server with no real network call.
 */
export function createGitHubClient({
  baseUrl = DEFAULT_BASE_URL,
  token = resolveToken(),
  repo = null,
  env = process.env,
  originUrl = null,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryBaseMs = DEFAULT_RETRY_BASE_MS,
} = {}) {
  const { owner, repo: name } = repo || resolveRepo(env, originUrl);

  async function apiGet(path) {
    const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "modonome-hygiene" };
    if (token) headers.Authorization = `Bearer ${token}`;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(url, { method: "GET", headers, signal: controller.signal });
      } catch (e) {
        if (e && e.name === "AbortError") throw new Error(`github-api: request to ${path} timed out after ${timeoutMs}ms.`);
        throw e;
      } finally {
        clearTimeout(timer);
      }

      if (res.ok) return res.json();

      if (!isRetryableStatus(res.status) || attempt === maxRetries) {
        const text = await res.text().catch(() => "");
        throw new Error(`github-api: GET ${path} failed with status ${res.status}${text ? `: ${text}` : ""}.`);
      }
      lastError = new Error(`github-api: retryable status ${res.status} on attempt ${attempt + 1}.`);
      await sleep(retryBaseMs * Math.pow(2, attempt));
    }
    throw lastError ?? new Error("github-api: exhausted retries.");
  }

  return {
    owner,
    repo: name,
    // The PR title and body: { title, body }.
    async fetchPr(number) {
      const pr = await apiGet(`/repos/${owner}/${name}/pulls/${number}`);
      return { title: pr.title || "", body: pr.body || "" };
    },
    // Conversation comments as an array of { id, body }.
    async fetchIssueComments(number) {
      const comments = await apiGet(`/repos/${owner}/${name}/issues/${number}/comments`);
      return (Array.isArray(comments) ? comments : []).map((c) => ({ id: c.id, body: c.body || "" }));
    },
  };
}
