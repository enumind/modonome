import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  chatCompletion,
  buildChatCompletionsUrl,
  buildHeaders,
  buildRequestBody,
  normalizeResponse,
} from "../scripts/agent/openai-client.mjs";
import { startMockServer } from "./helpers/mock-openai-server.mjs";

const MESSAGES = [{ role: "user", content: "hello" }];

test("buildChatCompletionsUrl joins a plain base URL", () => {
  assert.equal(buildChatCompletionsUrl("http://localhost:8080"), "http://localhost:8080/chat/completions");
});

test("buildChatCompletionsUrl handles a trailing slash", () => {
  assert.equal(buildChatCompletionsUrl("http://localhost:8080/"), "http://localhost:8080/chat/completions");
});

test("buildChatCompletionsUrl is idempotent when the path is already present", () => {
  assert.equal(
    buildChatCompletionsUrl("http://localhost:8080/chat/completions"),
    "http://localhost:8080/chat/completions"
  );
});

test("buildChatCompletionsUrl throws without a baseUrl", () => {
  assert.throws(() => buildChatCompletionsUrl(), /baseUrl is required/);
});

test("buildHeaders sets Bearer auth by default", () => {
  const headers = buildHeaders("tok123");
  assert.equal(headers.Authorization, "Bearer tok123");
  assert.equal(headers["Content-Type"], "application/json");
});

test("buildHeaders allows an auth scheme override", () => {
  const headers = buildHeaders("tok123", "Token");
  assert.equal(headers.Authorization, "Token tok123");
});

test("buildHeaders omits Authorization when authToken is falsy", () => {
  const headers = buildHeaders(undefined);
  assert.equal("Authorization" in headers, false);
});

test("buildRequestBody omits max_tokens when undefined", () => {
  const body = buildRequestBody("m1", MESSAGES, undefined);
  assert.equal("max_tokens" in body, false);
  assert.equal(body.model, "m1");
  assert.deepEqual(body.messages, MESSAGES);
});

test("buildRequestBody includes max_tokens when set", () => {
  const body = buildRequestBody("m1", MESSAGES, 128);
  assert.equal(body.max_tokens, 128);
});

test("normalizeResponse extracts text, finishReason, and usage", () => {
  const result = normalizeResponse({
    choices: [{ message: { content: "hi" }, finish_reason: "stop" }],
    usage: { total_tokens: 3 },
  });
  assert.deepEqual(result, { text: "hi", finishReason: "stop", usage: { total_tokens: 3 } });
});

test("normalizeResponse defaults usage to null when absent", () => {
  const result = normalizeResponse({ choices: [{ message: { content: "hi" }, finish_reason: "stop" }] });
  assert.equal(result.usage, null);
});

test("normalizeResponse throws on missing choices", () => {
  assert.throws(() => normalizeResponse({}), /malformed response/);
});

test("normalizeResponse throws on missing message content", () => {
  assert.throws(() => normalizeResponse({ choices: [{}] }), /malformed response/);
});

test("chatCompletion happy path returns normalized text/finishReason/usage", async () => {
  const mock = await startMockServer({ mode: "success", completion: { content: "hello there" } });
  try {
    const result = await chatCompletion({
      baseUrl: mock.url,
      authToken: "secret-token",
      model: "gpt-mock",
      messages: MESSAGES,
      maxTokens: 50,
    });
    assert.equal(result.text, "hello there");
    assert.equal(result.finishReason, "stop");
    assert.deepEqual(result.usage, { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });

    assert.equal(mock.requests.length, 1);
    assert.equal(mock.requests[0].method, "POST");
    assert.equal(mock.requests[0].path, "/chat/completions");
    assert.equal(mock.requests[0].body.model, "gpt-mock");
    assert.equal(mock.requests[0].body.max_tokens, 50);
  } finally {
    await mock.close();
  }
});

test("Authorization header is present with Bearer scheme when a token is supplied", async () => {
  const mock = await startMockServer({ mode: "success" });
  try {
    await chatCompletion({ baseUrl: mock.url, authToken: "abc123", model: "m", messages: MESSAGES });
    assert.equal(mock.requests[0].headers.authorization, "Bearer abc123");
  } finally {
    await mock.close();
  }
});

test("Authorization header is absent when no token is supplied", async () => {
  const mock = await startMockServer({ mode: "success" });
  try {
    await chatCompletion({ baseUrl: mock.url, model: "m", messages: MESSAGES });
    assert.equal("authorization" in mock.requests[0].headers, false);
  } finally {
    await mock.close();
  }
});

test("429 then success retries and eventually succeeds", async () => {
  const mock = await startMockServer({ mode: "retry-then-success", failCount: 1 });
  try {
    const result = await chatCompletion({
      baseUrl: mock.url,
      model: "m",
      messages: MESSAGES,
      retryBaseMs: 1,
    });
    assert.equal(result.text, "mock response text");
    assert.equal(mock.requests.length, 2);
  } finally {
    await mock.close();
  }
});

test("exhausting retries on repeated 429s throws", async () => {
  const mock = await startMockServer({ mode: "retry-then-success", failCount: 10 });
  try {
    await assert.rejects(
      () => chatCompletion({ baseUrl: mock.url, model: "m", messages: MESSAGES, retryBaseMs: 1, maxRetries: 2 }),
      /status 429/
    );
    assert.equal(mock.requests.length, 3);
  } finally {
    await mock.close();
  }
});

test("timeout throws a clear error", async () => {
  const mock = await startMockServer({ mode: "delay", delayMs: 100 });
  try {
    await assert.rejects(
      () => chatCompletion({ baseUrl: mock.url, model: "m", messages: MESSAGES, timeoutMs: 10, maxRetries: 0 }),
      /timed out/
    );
  } finally {
    await mock.close();
  }
});

test("malformed response throws", async () => {
  const mock = await startMockServer({ mode: "malformed" });
  try {
    await assert.rejects(
      () => chatCompletion({ baseUrl: mock.url, model: "m", messages: MESSAGES }),
      /malformed response/
    );
  } finally {
    await mock.close();
  }
});

test("a non-429 4xx throws without retrying", async () => {
  const mock = await startMockServer({ mode: "error", errorStatus: 400 });
  try {
    await assert.rejects(
      () => chatCompletion({ baseUrl: mock.url, model: "m", messages: MESSAGES, retryBaseMs: 1 }),
      /status 400/
    );
    assert.equal(mock.requests.length, 1);
  } finally {
    await mock.close();
  }
});

test("a 5xx status is retried and eventually throws if it never recovers", async () => {
  const mock = await startMockServer({ mode: "error", errorStatus: 503 });
  try {
    await assert.rejects(
      () => chatCompletion({ baseUrl: mock.url, model: "m", messages: MESSAGES, retryBaseMs: 1, maxRetries: 1 }),
      /status 503/
    );
    assert.equal(mock.requests.length, 2);
  } finally {
    await mock.close();
  }
});
