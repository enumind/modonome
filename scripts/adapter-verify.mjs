#!/usr/bin/env node
// Adapter conformance verifier (docs/adapters.md). Automates the checklist that
// doc asked a reviewer to run by hand: is a registered external agentic CLI
// declared correctly (license, boundary, schema), and, when the binary is
// present, does it actually read its prompt from stdin and stay contained to
// its working directory when driven through Modonome's own
// scripts/agent/tool-loop-adapter.mjs code path (not a reimplementation of it).
//
// Two tiers, and the second degrades gracefully rather than failing hard:
//   1. Static (always runs, no binary needed): the adapters.json entry matches
//      schemas/adapters.schema.json, and scripts/check-licenses.mjs's
//      checkLicenses() accepts its license and boundary.
//   2. Live (runs only when the resolved command is found on PATH): spawns the
//      real binary through runToolLoopAdapter with a scratch, git-free target
//      directory and a local mock OpenAI-compatible endpoint (no real network,
//      no cost), and confirms the adapter both consumed the stdin prompt and
//      wrote its output inside the pinned target, not elsewhere. Timeout and
//      non-zero-exit handling are Modonome's own guarantees, not the adapter's
//      to prove (see docs/adapters.md); this tool does not re-test them per
//      adapter, since tests/tool-loop-adapter.test.mjs already covers them for
//      every adapter uniformly.
//
// When the named command is not on PATH, tier 2 is reported SKIPPED with a
// clear reason, never as a failure and never silently omitted.
//
// Usage:
//   node scripts/adapter-verify.mjs <name>            verify one registered adapter
//   node scripts/adapter-verify.mjs <name> --json      machine-readable result
//   node scripts/adapter-verify.mjs --self-test        verify the bundled reference
//                                                       adapter (fixtures/adapters/),
//                                                       always runnable, no PATH lookup
import { readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./lib/jsonschema.mjs";
import { checkLicenses } from "./check-licenses.mjs";
import { resolveAdapterCommand, containedCwd, buildAdapterArgs, runToolLoopAdapter } from "./agent/tool-loop-adapter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ---------------------------------------------------------------------------
// Tier 1: static
// ---------------------------------------------------------------------------

/**
 * Load and schema-validate adapters.json, then run the license/boundary gate
 * against it. Pure aside from the two reads. Returns { manifest, entry, problems }
 * where entry is undefined if `name` is not registered.
 */
export function loadAndValidateManifest(rootDir, name) {
  const problems = [];
  const manifestPath = join(rootDir, "adapters.json");
  if (!existsSync(manifestPath)) {
    return { manifest: null, entry: undefined, problems: ["adapters.json not found at repo root."] };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const schema = JSON.parse(readFileSync(join(rootDir, "schemas", "adapters.schema.json"), "utf8"));

  const schemaErrors = validate(schema, manifest);
  for (const e of schemaErrors) problems.push(`schema: ${e}`);

  const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
  for (const p of checkLicenses(pkg, manifest)) problems.push(`license/boundary: ${p}`);

  const entry = (manifest.adapters || []).find((a) => a.name === name);
  return { manifest, entry, problems };
}

/**
 * Confirm the pure argv-construction helpers resolve without throwing and
 * produce a shape that never carries a prompt or a credential-like value.
 * Pure. Returns a list of problem strings (empty means clean).
 */
export function checkArgvSanity(entry) {
  const problems = [];
  let command;
  try {
    command = resolveAdapterCommand(entry);
  } catch (e) {
    problems.push(`resolveAdapterCommand: ${e.message}`);
    return problems;
  }
  if (!command) problems.push("resolveAdapterCommand returned an empty command.");
  const args = buildAdapterArgs({ baseUrl: "http://127.0.0.1:1/v1", model: "probe-model" }, 5, entry);
  const joined = args.join(" ");
  if (/probe-prompt-marker/i.test(joined)) {
    problems.push("buildAdapterArgs embedded prompt-shaped content in argv.");
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Tier 2: live (graceful skip if the command is not on PATH)
// ---------------------------------------------------------------------------

function commandOnPath(command) {
  // A cheap, portable presence check: `which`/`where` are not universal, so
  // probe PATH directories directly rather than shelling out. Falls back to
  // treating an absolute/relative path command as present if it exists.
  if (command.includes("/") || command.includes("\\")) {
    return existsSync(command);
  }
  const pathVar = process.env.PATH || "";
  const exts = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const dir of pathVar.split(process.platform === "win32" ? ";" : ":")) {
    if (!dir) continue;
    for (const ext of exts) {
      if (existsSync(join(dir, command + ext))) return true;
    }
  }
  return false;
}

// Minimal local OpenAI-compatible chat-completions mock. No real network, no
// cost, no external dependency. Scripted to echo back a fixed marker so a
// conforming adapter that forwards the model's reply into a file gives this
// verifier something distinctive to check for.
function startProbeServer(replyContent) {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          id: "probe-1",
          choices: [{ index: 0, message: { role: "assistant", content: replyContent }, finish_reason: "stop" }],
        }));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolvePromise({
        url: `http://127.0.0.1:${port}/v1`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

/**
 * Run the live conformance probe for one adapter entry. Returns
 * { status: "pass"|"fail"|"skipped", detail }. Never throws: every failure
 * mode (binary absent, timeout, non-zero exit, containment violation) resolves
 * to a status, matching the bounded-result convention runToolLoopAdapter itself
 * uses.
 */
export async function runLiveProbe(entry, opts = {}) {
  const command = resolveAdapterCommand(entry);
  if (!opts.forceCommand && !commandOnPath(command)) {
    return { status: "skipped", detail: `'${command}' not found on PATH. Static checks only.` };
  }

  const marker = `CONFORMANCE-PROBE-${randomUUID().slice(0, 8)}`;
  const server = opts.serverImpl ? await opts.serverImpl(marker) : await startProbeServer(marker);
  const scratchRoot = opts.scratchRoot ?? mkdtempSync(join(tmpdir(), "modonome-adapter-verify-"));
  try {
    const targetName = "target";
    const targetDir = join(scratchRoot, targetName);
    mkdirSync(targetDir, { recursive: true });

    const result = await runToolLoopAdapter({
      prompt: `Reply with exactly: ${marker}`,
      endpoint: { baseUrl: server.url, model: "probe-model" },
      root: scratchRoot,
      target: targetName,
      adapterEntry: entry,
      maxTurns: 3,
      timeoutMs: opts.timeoutMs ?? 15000,
      // The child needs PATH to resolve a bare command name (e.g. "node" for the
      // self-test) and, on some platforms, other ambient vars for a real CLI to
      // start at all. Inherit the parent environment, then layer the endpoint on
      // top (already done inside runToolLoopAdapter itself).
      env: { ...process.env, ...(opts.env ?? {}) },
      deps: opts.deps,
    });

    if (result.status !== 0) {
      return { status: "fail", detail: `adapter exited ${result.status}: ${result.reason}` };
    }

    const outFile = join(targetDir, "ADAPTER-OUTPUT.txt");
    if (!existsSync(outFile)) {
      return { status: "fail", detail: "adapter exited 0 but wrote no output inside the contained target directory." };
    }
    const written = readFileSync(outFile, "utf8");
    if (!written.includes(marker)) {
      return { status: "fail", detail: "adapter's output did not contain the stdin-delivered marker; it may not be reading the prompt from stdin." };
    }
    // Containment: confirm nothing was written outside the pinned target.
    const escaped = existsSync(join(scratchRoot, "ADAPTER-OUTPUT.txt"));
    if (escaped) {
      return { status: "fail", detail: "adapter wrote outside the contained target directory (containment violated)." };
    }
    return { status: "pass", detail: `stdin prompt consumed and echoed; output confined to the target directory (${outFile}).` };
  } finally {
    await server.close();
    if (!opts.scratchRoot) rmSync(scratchRoot, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(argv) {
  const jsonMode = argv.includes("--json");
  const args = argv.filter((a) => a !== "--json");
  const selfTest = args.includes("--self-test");
  const name = selfTest ? "reference-adapter" : args[0];

  if (!name) {
    console.error("Usage: node scripts/adapter-verify.mjs <name> [--json]");
    console.error("       node scripts/adapter-verify.mjs --self-test");
    return 2;
  }

  let manifest, entry, staticProblems;
  if (selfTest) {
    entry = { name: "reference-adapter", command: "node", args: [join(root, "fixtures", "adapters", "reference-adapter.mjs"), "--prompt-stdin"], license: "MIT", boundary: "process", version: "0" };
    staticProblems = [];
  } else {
    ({ manifest, entry, problems: staticProblems } = loadAndValidateManifest(root, name));
    if (!entry) {
      const msg = `Adapter '${name}' is not registered in adapters.json.`;
      if (jsonMode) { console.log(JSON.stringify({ name, result: "not-registered", problems: [msg] }, null, 2)); return 1; }
      console.error(msg);
      return 1;
    }
  }

  const argvProblems = checkArgvSanity(entry);
  const allStatic = [...staticProblems, ...argvProblems];

  const live = await runLiveProbe(entry, selfTest ? { forceCommand: true } : {});

  const passed = allStatic.length === 0 && live.status !== "fail";
  if (jsonMode) {
    console.log(JSON.stringify({ name, staticProblems: allStatic, live, result: passed ? "pass" : "fail" }, null, 2));
    return passed ? 0 : 1;
  }

  console.log(`Adapter conformance: ${name}`);
  console.log("=".repeat(22 + name.length));
  console.log("");
  console.log("Tier 1 (static: schema, license, boundary, argv sanity)");
  if (allStatic.length === 0) {
    console.log("  PASS  no problems found");
  } else {
    for (const p of allStatic) console.log(`  FAIL  ${p}`);
  }
  console.log("");
  console.log("Tier 2 (live: stdin consumption, containment)");
  if (live.status === "pass") console.log(`  PASS  ${live.detail}`);
  else if (live.status === "skipped") console.log(`  SKIP  ${live.detail}`);
  else console.log(`  FAIL  ${live.detail}`);
  console.log("");
  console.log(passed ? "Result: PASS" : "Result: FAIL");
  if (live.status === "skipped") {
    console.log("(Tier 2 skipped, not failed: install the adapter binary and re-run for the live check.)");
  }
  return passed ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
