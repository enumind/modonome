// Reusable local mock server that speaks the small slice of the GitHub REST API the
// hygiene scanner uses: GET /repos/{owner}/{repo}/pulls/{n} and
// GET /repos/{owner}/{repo}/issues/{n}/comments. Used by tests to exercise the
// github-api client and the hygiene --pr path without real network egress. Binds to
// 127.0.0.1 on an ephemeral port. No external deps.
import { createServer } from "node:http";

/**
 * Start a mock GitHub API server.
 *
 * @param {object} [options]
 * @param {object} [options.pr] - The PR object returned by the pulls endpoint (title, body).
 * @param {Array<object>} [options.comments] - The array returned by the comments endpoint.
 * @param {"success"|"retry-then-success"|"error"} [options.mode]
 * @param {number} [options.failCount] - Number of 429s before success, for "retry-then-success".
 * @param {number} [options.errorStatus] - Status to return, for "error". Defaults to 404.
 * @returns {Promise<{ url: string, close: () => Promise<void>, requests: Array<{method,path,headers}> }>}
 */
export function startMockGitHubServer(options = {}) {
  const {
    pr = { title: "A pull request", body: "A clean body" },
    comments = [],
    mode = "success",
    failCount = 1,
    errorStatus = 404,
  } = options;

  const requests = [];
  let seenFailures = 0;

  const server = createServer((req, res) => {
    requests.push({ method: req.method, path: req.url, headers: { ...req.headers } });

    if (mode === "error") {
      writeJson(res, errorStatus, { message: "Not Found" });
      return;
    }
    if (mode === "retry-then-success" && seenFailures < failCount) {
      seenFailures++;
      writeJson(res, 429, { message: "rate limited" });
      return;
    }

    if (/\/pulls\/\d+(?:\?.*)?$/.test(req.url)) {
      writeJson(res, 200, pr);
      return;
    }
    if (/\/issues\/\d+\/comments(?:\?.*)?$/.test(req.url)) {
      writeJson(res, 200, comments);
      return;
    }
    writeJson(res, 404, { message: "Not Found" });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        requests,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text) });
  res.end(text);
}
