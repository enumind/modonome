// Tests for `modonome connect`, which registers the read-only MCP server with an agent
// harness by writing an .mcp.json style config. It must be preview-by-default, merge
// into an existing config without dropping other servers, and stay idempotent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const connect = join(root, "scripts", "connect.mjs");

function run(...args) {
  return spawnSync("node", [connect, ...args], { encoding: "utf8", timeout: 30000 });
}

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-connect-"));
}

test("preview by default writes nothing", () => {
  const dir = tmp();
  try {
    const r = run(dir);
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dir, ".mcp.json")), "preview must not create the config");
    assert.match(r.stdout, /Preview only/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--write registers the server under mcpServers", () => {
  const dir = tmp();
  try {
    const r = run(dir, "--write");
    assert.equal(r.status, 0);
    const cfg = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8"));
    assert.equal(cfg.mcpServers.modonome.command, "npx");
    assert.deepEqual(cfg.mcpServers.modonome.args, ["-y", "modonome", "mcp"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merges into an existing config without dropping other servers", () => {
  const dir = tmp();
  try {
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { other: { command: "node", args: ["x.js"] } } }, null, 2),
    );
    const r = run(dir, "--write");
    assert.equal(r.status, 0);
    const cfg = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8"));
    assert.ok(cfg.mcpServers.other, "existing server must be preserved");
    assert.ok(cfg.mcpServers.modonome, "modonome server must be added");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("re-running is idempotent and reports no change", () => {
  const dir = tmp();
  try {
    run(dir, "--write");
    const r = run(dir, "--write");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /already registers/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("vscode target uses the servers root key", () => {
  const dir = tmp();
  try {
    const r = run(dir, "--vscode", "--write");
    assert.equal(r.status, 0);
    const cfg = JSON.parse(readFileSync(join(dir, ".vscode", "mcp.json"), "utf8"));
    assert.ok(cfg.servers.modonome, "VS Code config uses the servers key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
