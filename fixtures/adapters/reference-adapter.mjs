#!/usr/bin/env node
// Reference adapter: the minimal implementation of the contract in
// docs/adapters.md. Not a real coding agent; it does one thing, so the contract
// is visible rather than buried in a real tool's feature surface. Read this
// alongside docs/adapters.md, or point adapter-verify at it as a self-test.
//
// What it does: reads a prompt from stdin (never argv), reads its model endpoint
// from OPENAI_BASE_URL / OPENAI_MODEL / OPENAI_API_KEY (never argv), sends one
// chat-completion request, and writes the response content to a file inside its
// own working directory (never outside it, and it never assumes where that
// directory is). It exits 0 on success, non-zero on any failure, and never
// throws uncaught.
//
// Flags accepted (the common opencode/aider convention docs/adapters.md
// documents; buildAdapterArgs in scripts/agent/tool-loop-adapter.mjs emits
// exactly this shape by default):
//   --prompt-stdin           read the prompt from stdin (the only mode this
//                             reference adapter supports; the flag is accepted
//                             for shape-compatibility and otherwise ignored)
//   --max-turns <n>          accepted, unused (this adapter makes one call)
//   --base-url <url>         overrides OPENAI_BASE_URL
//   --model <name>           overrides OPENAI_MODEL
import { writeFileSync } from "node:fs";
import { request } from "node:http";
import { request as requestHttps } from "node:https";

function flagValue(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : undefined;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    // If stdin is not piped (a TTY), resolve immediately with nothing rather
    // than hanging: a conforming adapter must never block on a caller that
    // closed stdin, which is exactly what a non-interactive invocation does.
    if (process.stdin.isTTY) resolve("");
  });
}

function postJson(url, body, apiKey) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const transport = u.protocol === "https:" ? requestHttps : request;
    const payload = JSON.stringify(body);
    const req = transport(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname.endsWith("/chat/completions") ? u.pathname : `${u.pathname.replace(/\/$/, "")}/chat/completions`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => { raw += c; });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            reject(new Error(`malformed response body: ${e.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main(argv) {
  const prompt = await readStdin();
  const baseUrl = flagValue(argv, "--base-url") ?? process.env.OPENAI_BASE_URL;
  const model = flagValue(argv, "--model") ?? process.env.OPENAI_MODEL ?? "reference-model";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!baseUrl) {
    console.error("reference-adapter: no endpoint (OPENAI_BASE_URL or --base-url); refusing.");
    return 1;
  }
  if (!prompt.trim()) {
    console.error("reference-adapter: empty stdin; refusing (this adapter reads its prompt from stdin, never argv).");
    return 1;
  }

  let result;
  try {
    result = await postJson(baseUrl, {
      model,
      messages: [{ role: "user", content: prompt }],
    }, apiKey);
  } catch (e) {
    console.error(`reference-adapter: request failed: ${e.message}`);
    return 1;
  }

  const content = result?.body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.error("reference-adapter: response had no usable completion content.");
    return 1;
  }

  // Write inside the current working directory only. The caller (Modonome)
  // pins cwd to the contained target before spawning this process; this
  // adapter does not itself resolve or trust any other path.
  writeFileSync("ADAPTER-OUTPUT.txt", content, "utf8");
  console.log("reference-adapter: wrote ADAPTER-OUTPUT.txt");
  return 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`reference-adapter: uncaught error: ${e.message}`);
    process.exit(1);
  });
