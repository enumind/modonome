// Zero-dependency OpenAI-compatible chat-completions client. Speaks the same
// request/response shape to any endpoint: a direct provider, a GitHub Models
// endpoint, or an optional LiteLLM sidecar. Uses global fetch (Node built-in);
// no network call happens at import time.
//
// Retries HTTP 429 and 5xx with a small fixed number of attempts and a fixed
// (non-random) exponential backoff, since Math.random is banned. Any other
// non-2xx status throws immediately without retrying.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "../lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 10;

/**
 * Join a base URL with the chat-completions path, tolerating a trailing slash
 * or a base URL that already ends in "/chat/completions".
 *
 * @param {string} baseUrl
 * @returns {string}
 */
export function buildChatCompletionsUrl(baseUrl) {
  if (!baseUrl) throw new Error(formatMessage("agent-run.openai-client.missing-base-url", {}, overrides).message);
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

/**
 * Build the request headers, including the Authorization header when a token
 * is supplied. No Authorization header is sent when authToken is falsy, which
 * suits local endpoints that need none.
 *
 * @param {string|undefined} authToken
 * @param {string} [authScheme] - Defaults to "Bearer".
 * @returns {Record<string, string>}
 */
export function buildHeaders(authToken, authScheme = "Bearer") {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `${authScheme} ${authToken}`;
  return headers;
}

/**
 * Build the JSON request body. max_tokens is omitted when maxTokens is
 * undefined, since some endpoints reject an explicit null/undefined field.
 *
 * @param {string} model
 * @param {Array<object>} messages
 * @param {number|undefined} maxTokens
 * @returns {object}
 */
export function buildRequestBody(model, messages, maxTokens) {
  const body = { model, messages };
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  return body;
}

/**
 * Normalize a parsed OpenAI chat-completions response into
 * { text, finishReason, usage }. Throws a clear error on a malformed body
 * (missing choices, missing message).
 *
 * @param {any} data
 * @returns {{ text: string, finishReason: string|null, usage: object|null }}
 */
export function normalizeResponse(data) {
  const choice = data && Array.isArray(data.choices) ? data.choices[0] : undefined;
  if (!choice || !choice.message || typeof choice.message.content !== "string") {
    throw new Error(formatMessage("agent-run.openai-client.malformed-response", {}, overrides).message);
  }
  return {
    text: choice.message.content,
    finishReason: choice.finish_reason ?? null,
    usage: data.usage ?? null,
  };
}

// Retry only on 429 (rate limit) and 5xx (server error). Any other non-2xx
// status is a caller error and must not be retried.
function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST a chat-completions request to an OpenAI-compatible endpoint and return
 * a normalized result.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl - Endpoint base, e.g. "https://api.example.com/v1".
 * @param {string} [opts.authToken] - Bearer (or custom scheme) credential. Omit for no auth.
 * @param {string} [opts.authScheme] - Auth header scheme. Defaults to "Bearer".
 * @param {string} opts.model
 * @param {Array<object>} opts.messages
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.timeoutMs] - Per-attempt timeout. Defaults to 60000.
 * @param {number} [opts.maxRetries] - Retries on 429/5xx. Defaults to 3.
 * @param {number} [opts.retryBaseMs] - Base delay for fixed exponential backoff. Defaults to 10.
 * @param {typeof fetch} [opts.fetchImpl] - Override for testing; defaults to global fetch.
 * @returns {Promise<{ text: string, finishReason: string|null, usage: object|null }>}
 */
export async function chatCompletion({
  baseUrl,
  authToken,
  authScheme = "Bearer",
  model,
  messages,
  maxTokens,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryBaseMs = DEFAULT_RETRY_BASE_MS,
  fetchImpl = fetch,
} = {}) {
  const url = buildChatCompletionsUrl(baseUrl);
  const headers = buildHeaders(authToken, authScheme);
  const body = JSON.stringify(buildRequestBody(model, messages, maxTokens));

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, { method: "POST", headers, body, signal: controller.signal });
    } catch (e) {
      if (e && e.name === "AbortError") {
        throw new Error(formatMessage("agent-run.openai-client.request-timed-out", { timeoutMs }, overrides).message);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      const data = await res.json();
      return normalizeResponse(data);
    }

    if (!isRetryableStatus(res.status) || attempt === maxRetries) {
      const text = await res.text().catch(() => "");
      const statusText = text ? `: ${text}` : "";
      throw new Error(formatMessage("agent-run.openai-client.request-failed", { status: res.status, statusText }, overrides).message);
    }

    lastError = new Error(
      formatMessage("agent-run.openai-client.retryable-status", { status: res.status, attempt: attempt + 1 }, overrides).message,
    );
    await sleep(retryBaseMs * Math.pow(2, attempt));
  }
  // Unreachable in practice: the loop above always returns or throws.
  throw lastError ?? new Error(formatMessage("agent-run.openai-client.exhausted-retries", {}, overrides).message);
}
