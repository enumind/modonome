// Reusable local mock server that speaks the OpenAI chat-completions shape.
// Used by tests to exercise the openai-client transport (happy path, retry,
// timeout, malformed body) without any real network egress. Binds to
// 127.0.0.1 on an ephemeral port. No external deps.
import { createServer } from "node:http";

/**
 * Start a mock OpenAI chat-completions server.
 *
 * @param {object} [options]
 * @param {"success"|"retry-then-success"|"delay"|"malformed"|"error"} [options.mode]
 *   - "success": always returns a normal completion.
 *   - "retry-then-success": returns 429 on the first N requests, then a normal completion.
 *   - "delay": waits options.delayMs before responding (to exercise client timeout).
 *   - "malformed": returns 200 with a body missing choices.
 *   - "error": returns options.errorStatus (default 400) with a plain error body.
 * @param {number} [options.failCount] - Number of 429s to return before succeeding, for "retry-then-success". Defaults to 1.
 * @param {number} [options.delayMs] - Delay before responding, for "delay". Defaults to 200.
 * @param {number} [options.errorStatus] - Status code to return, for "error". Defaults to 400.
 * @param {object} [options.completion] - Override the successful completion body's choice fields.
 * @returns {Promise<{ url: string, close: () => Promise<void>, requests: Array<{method: string, path: string, headers: object, body: object}> }>}
 */
export function startMockServer(options = {}) {
  const {
    mode = "success",
    failCount = 1,
    delayMs = 200,
    errorStatus = 400,
    completion = {},
  } = options;

  const requests = [];
  let seenFailures = 0;

  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let parsedBody = null;
      try {
        parsedBody = raw ? JSON.parse(raw) : null;
      } catch {
        parsedBody = raw;
      }
      requests.push({
        method: req.method,
        path: req.url,
        headers: { ...req.headers },
        body: parsedBody,
      });

      if (mode === "delay") {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        writeJson(res, 200, successBody(completion));
        return;
      }

      if (mode === "malformed") {
        writeJson(res, 200, { id: "mock-malformed", object: "chat.completion" });
        return;
      }

      if (mode === "error") {
        writeJson(res, errorStatus, { error: { message: "mock error", type: "invalid_request_error" } });
        return;
      }

      if (mode === "retry-then-success") {
        if (seenFailures < failCount) {
          seenFailures++;
          writeJson(res, 429, { error: { message: "rate limited", type: "rate_limit_error" } });
          return;
        }
        writeJson(res, 200, successBody(completion));
        return;
      }

      // mode === "success"
      writeJson(res, 200, successBody(completion));
    });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const url = `http://127.0.0.1:${address.port}`;
      resolve({
        url,
        requests,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

function successBody(overrides) {
  return {
    id: "mock-completion",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: overrides.content ?? "mock response text" },
        finish_reason: overrides.finishReason ?? "stop",
      },
    ],
    usage: overrides.usage ?? { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text) });
  res.end(text);
}
