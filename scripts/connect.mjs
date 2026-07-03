#!/usr/bin/env node
// modonome connect: register the Modonome MCP server with your agent harness so any
// MCP-capable agent (Claude Code, Cursor, VS Code/Copilot, and others) can call the
// read-only governance tools in-session (ratchet preflight, status, compliance,
// snapshot). It writes an MCP config file only. It never arms the engine and adds no
// runtime dependency: the server is `npx modonome mcp`, the same zero-dependency package.
//
// Usage:
//   node scripts/connect.mjs [dir] [--claude] [--cursor] [--vscode] [--write]
//
// With no editor flag it targets Claude Code and any harness that reads .mcp.json.
// Without --write it prints a preview and changes nothing.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("-")) || ".";
const write = args.includes("--write");

// The server command every editor points at. `npx -y modonome mcp` resolves the
// published, pinned package, so the gate code the agent consults is not the code in
// the working tree the agent is editing.
const SERVER = { command: "npx", args: ["-y", "modonome", "mcp"] };

// Each editor reads a different config file with a slightly different root key.
const EDITORS = {
  claude: { file: ".mcp.json", root: "mcpServers", label: "Claude Code and generic .mcp.json harnesses" },
  cursor: { file: join(".cursor", "mcp.json"), root: "mcpServers", label: "Cursor" },
  vscode: { file: join(".vscode", "mcp.json"), root: "servers", label: "VS Code and Copilot agent mode" },
};

const selected = Object.keys(EDITORS).filter((k) => args.includes(`--${k}`));
const editors = selected.length ? selected : ["claude"];

function planFile(editor) {
  const { file, root } = EDITORS[editor];
  const dest = join(target, file);
  let config = {};
  let existed = false;
  if (existsSync(dest)) {
    existed = true;
    try {
      config = JSON.parse(readFileSync(dest, "utf8"));
    } catch {
      return { editor, dest, action: "skip", reason: "existing file is not valid JSON; edit it by hand" };
    }
  }
  if (!config[root] || typeof config[root] !== "object") config[root] = {};
  const already = JSON.stringify(config[root].modonome) === JSON.stringify(SERVER);
  config[root].modonome = SERVER;
  return {
    editor,
    dest,
    action: already ? "unchanged" : existed ? "update" : "create",
    content: JSON.stringify(config, null, 2) + "\n",
  };
}

const plans = editors.map(planFile);

for (const p of plans) {
  const { file, label } = EDITORS[p.editor];
  if (p.action === "skip") {
    console.log(`skip   ${p.dest}: ${p.reason}`);
    continue;
  }
  if (p.action === "unchanged") {
    console.log(`ok     ${p.dest} already registers the modonome server (${label}).`);
    continue;
  }
  if (write) {
    mkdirSync(dirname(p.dest), { recursive: true });
    writeFileSync(p.dest, p.content);
    console.log(`${p.action === "create" ? "create" : "update"} ${p.dest} (${label})`);
  } else {
    console.log(`would ${p.action} ${p.dest} (${label})`);
  }
}

if (!write) {
  console.log("\nPreview only. Re-run with --write to apply.");
} else {
  console.log("\nRegistered. The MCP tools are read-only (ADR-009) and cannot arm the engine.");
  console.log("Claude Code users can also run: claude mcp add modonome -- npx -y modonome mcp");
}
