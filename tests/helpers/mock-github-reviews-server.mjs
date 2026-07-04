// Standalone mock GitHub-reviews-API server, run as its own OS process (not
// in-process with the test runner). A test that drives the decisions-authority
// CLI via spawnSync blocks its own event loop for the duration of the child
// process; an in-process HTTP server can't service a request during that
// window, so the mock has to live in a separate process instead.
//
// Usage: node mock-github-reviews-server.mjs <reviewsJson>
// Prints "READY <port>" on stdout once listening.
import { createServer } from "node:http";

const reviews = JSON.parse(process.argv[2] || "[]");

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json", Connection: "close" });
  res.end(JSON.stringify(reviews));
});

server.listen(0, "127.0.0.1", () => {
  console.log(`READY ${server.address().port}`);
});
