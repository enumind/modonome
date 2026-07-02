import { test } from "node:test";
import assert from "node:assert/strict";
import { createGitHubClient, resolveRepo, resolveToken } from "../scripts/lib/github-api.mjs";
import { startMockGitHubServer } from "./helpers/mock-github-server.mjs";

test("resolveRepo prefers GITHUB_REPOSITORY, then falls back to the origin url", () => {
  assert.deepEqual(resolveRepo({ GITHUB_REPOSITORY: "enumind/modonome" }), { owner: "enumind", repo: "modonome" });
  assert.deepEqual(resolveRepo({}, "https://github.com/enumind/modonome.git"), { owner: "enumind", repo: "modonome" });
  assert.deepEqual(resolveRepo({}, "git@github.com:enumind/modonome.git"), { owner: "enumind", repo: "modonome" });
  assert.throws(() => resolveRepo({}, "not-a-github-url"), /could not resolve owner\/repo/);
});

test("resolveToken reads GITHUB_TOKEN then GH_TOKEN", () => {
  assert.equal(resolveToken({ GITHUB_TOKEN: "a" }), "a");
  assert.equal(resolveToken({ GH_TOKEN: "b" }), "b");
  assert.equal(resolveToken({}), "");
});

test("fetchPr returns the title and body from the pulls endpoint", async () => {
  const server = await startMockGitHubServer({ pr: { title: "My PR", body: "Body line one\nBody line two" } });
  try {
    const client = createGitHubClient({ baseUrl: server.url, repo: { owner: "o", repo: "r" }, token: "t" });
    const pr = await client.fetchPr(42);
    assert.deepEqual(pr, { title: "My PR", body: "Body line one\nBody line two" });
    // The Authorization header is sent when a token is present.
    assert.match(server.requests[0].headers.authorization, /^Bearer t$/);
    assert.match(server.requests[0].path, /\/repos\/o\/r\/pulls\/42$/);
  } finally {
    await server.close();
  }
});

test("fetchIssueComments returns an array of { id, body }", async () => {
  const server = await startMockGitHubServer({
    comments: [{ id: 1, body: "first" }, { id: 2, body: "second" }],
  });
  try {
    const client = createGitHubClient({ baseUrl: server.url, repo: { owner: "o", repo: "r" } });
    const comments = await client.fetchIssueComments(7);
    assert.deepEqual(comments, [{ id: 1, body: "first" }, { id: 2, body: "second" }]);
  } finally {
    await server.close();
  }
});

test("a retryable 429 is retried with backoff, then succeeds", async () => {
  const server = await startMockGitHubServer({ mode: "retry-then-success", failCount: 1, pr: { title: "ok", body: "ok" } });
  try {
    const client = createGitHubClient({ baseUrl: server.url, repo: { owner: "o", repo: "r" }, retryBaseMs: 1 });
    const pr = await client.fetchPr(1);
    assert.equal(pr.title, "ok");
    assert.equal(server.requests.length, 2, "should have retried once");
  } finally {
    await server.close();
  }
});

test("a non-retryable error surfaces a clear message", async () => {
  const server = await startMockGitHubServer({ mode: "error", errorStatus: 404 });
  try {
    const client = createGitHubClient({ baseUrl: server.url, repo: { owner: "o", repo: "r" } });
    await assert.rejects(() => client.fetchPr(999), /failed with status 404/);
  } finally {
    await server.close();
  }
});
