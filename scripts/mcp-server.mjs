#!/usr/bin/env node
/**
 * Modonome MCP server (MCP 1.0, stdio transport).
 *
 * Exposes governance and compliance tools so any MCP-compatible harness can call
 * them directly without shelling out:
 *
 *   modonome_ratchet        : run the anti-gaming ratchet on a diff string
 *   modonome_validate_config : validate a config file or inline YAML/JSON
 *   modonome_validate_work_item : validate a work item JSON object
 *   modonome_status         : return the current governance posture of a repo
 *   modonome_compliance     : return a read-only OpenSSF, SLSA, and NIST evidence pack
 *   modonome_verify_attestation : verify a signed knowledge packet against the allowlist
 *
 * Tools are read-only or validation-only and inherit the caller's scope (ADR-009);
 * none elevate privileges or arm the engine.
 *
 * Usage:
 *   node scripts/mcp-server.mjs
 *
 * The server reads JSON-RPC 2.0 messages (newline-delimited) from stdin
 * and writes responses to stdout. All log output goes to stderr.
 */
import { createInterface } from "node:readline";
import { writeFileSync, readFileSync, existsSync, rmSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Cache AgentProof results for 5 minutes to avoid re-running the full 16-scenario
// suite on every modonome_status poll (each run takes ~2s and consumes CI quota).
const apCache = new Map(); // key: repoPath -> { result, expiresAt }
const AP_CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "modonome_ratchet",
    description:
      "Run the anti-gaming ratchet on a unified diff. Returns pass/fail and the list of violations if any. The ratchet rejects diffs that make gates pass by weakening them: removing test assertions, adding .skip annotations, injecting broad type escapes, weakening compiler strictness, or removing coverage thresholds.",
    inputSchema: {
      type: "object",
      properties: {
        diff: {
          type: "string",
          description: "A unified diff string (output of git diff or diff -u). Required unless diff_path is provided.",
        },
        diff_path: {
          type: "string",
          description: "Absolute path to a file containing a unified diff. Used instead of diff when the diff is large.",
        },
      },
    },
  },
  {
    name: "modonome_validate_config",
    description:
      "Validate a Modonome config against the JSON Schema and application-level safety rules. Returns a list of errors (empty on success). Catches structural errors (wrong types, missing fields) and unsafe combinations (auto_merge without branch protection, etc.).",
    inputSchema: {
      type: "object",
      required: ["content"],
      properties: {
        content: {
          type: "string",
          description: "Config file content as a YAML or JSON string.",
        },
        format: {
          type: "string",
          enum: ["yaml", "json"],
          description: "Format of the content field. Defaults to yaml.",
        },
      },
    },
  },
  {
    name: "modonome_validate_work_item",
    description:
      "Validate a work item object against the JSON Schema and governance rules. Catches structural errors and cross-field invariants that JSON Schema cannot express: maker_id must not equal checker_id, maker_model must not equal checker_model, protected-path items must be escalated before reaching merge_ready.",
    inputSchema: {
      type: "object",
      required: ["item"],
      properties: {
        item: {
          type: "object",
          description: "The work item object to validate.",
        },
      },
    },
  },
  {
    name: "modonome_status",
    description:
      "Return the current governance posture of a repository: config levers, AgentProof score, and whether the repo is in a safe state to run autonomously. Reads .modonome/config.yaml from the repo root.",
    inputSchema: {
      type: "object",
      properties: {
        repo_path: {
          type: "string",
          description: "Absolute path to the repository root. Defaults to the current working directory.",
        },
      },
    },
  },
  {
    name: "modonome_compliance",
    description:
      "Return a read-only compliance evidence pack for a repository, mapping observed facts (license, security policy, CI, tests, coverage, provenance, dependency monitoring, and more) to OpenSSF Best Practices, SLSA, and NIST AI RMF criteria. Changes nothing.",
    inputSchema: {
      type: "object",
      properties: {
        repo_path: {
          type: "string",
          description: "Absolute path to the repository root. Defaults to the current working directory.",
        },
      },
    },
  },
  {
    name: "modonome_verify_attestation",
    description:
      "Verify a signed knowledge packet against a peer-key allowlist. Returns ok and the signing alias on success, or a reason on failure. Fails closed when the signature is absent, the key is revoked or out of window, the embedded key does not match the allowlist, or the bytes do not verify.",
    inputSchema: {
      type: "object",
      required: ["packet"],
      properties: {
        packet: {
          type: "object",
          description: "The knowledge packet object, including its signature.",
        },
        peer_keys: {
          type: "object",
          description: "The peer-key allowlist object. If omitted, .modonome/peer-keys.json under repo_path is used.",
        },
        repo_path: {
          type: "string",
          description: "Repository root used to locate .modonome/peer-keys.json when peer_keys is omitted.",
        },
      },
    },
  },
  {
    name: "modonome_snapshot",
    description:
      "Return a tiered repository snapshot for LLM context so an agent can understand a repo without reading every file. tier 0 is the small signature (Merkle root, stack, entrypoints, commands, governance posture); tier 1 is the map (modules, public API signatures, import edges, attention ranking). With verify set, it recomputes the Merkle root from disk and reports whether the committed snapshot still matches. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        repo_path: { type: "string", description: "Repository root. Defaults to the current working directory." },
        tier: { type: "integer", description: "Tier to return: 0 (signature) or 1 (map). Defaults to 0." },
        verify: { type: "boolean", description: "When true, recompute the Merkle root from disk and report drift instead of returning a tier." },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function toolRatchet(args) {
  let diffPath;
  let tempDir = null;

  if (args.diff_path) {
    const resolved = resolve(String(args.diff_path));
    let st;
    try { st = statSync(resolved); } catch {
      return { passed: false, violations: ["diff_path does not exist or is not accessible."] };
    }
    if (!st.isFile()) {
      return { passed: false, violations: ["diff_path must be a regular file."] };
    }
    const ext = extname(resolved).toLowerCase();
    if (![".patch", ".diff", ".txt"].includes(ext)) {
      return { passed: false, violations: [`diff_path extension not allowed: ${ext || "(none)"}`] };
    }
    diffPath = resolved;
  } else if (args.diff) {
    tempDir = mkdtempSync(join(tmpdir(), "modonome-ratchet-"));
    const tempFile = join(tempDir, "diff.patch");
    writeFileSync(tempFile, args.diff, "utf8");
    diffPath = tempFile;
  } else {
    return { passed: false, violations: ["Either diff or diff_path is required."] };
  }

  try {
    const result = spawnSync(
      "node",
      [join(here, "guard-ratchet.mjs"), "--diff", diffPath],
      { encoding: "utf8", timeout: 30000 }
    );

    const violations = result.status !== 0
      ? (result.stderr || "").split("\n").filter((l) => l.trim().startsWith("-")).map((l) => l.trim().slice(2))
      : [];

    return {
      passed: result.status === 0,
      violations,
    };
  } finally {
    if (tempDir) try { rmSync(tempDir, { recursive: true }); } catch { /* best-effort */ }
  }
}

async function toolValidateConfig(args) {
  const ext = (args.format || "yaml") === "json" ? ".json" : ".yaml";
  const tempDir = mkdtempSync(join(tmpdir(), "modonome-config-"));
  const tempFile = join(tempDir, `config${ext}`);
  writeFileSync(tempFile, args.content, "utf8");

  try {
    const result = spawnSync(
      "node",
      [join(here, "validate-config.mjs"), tempFile],
      { encoding: "utf8", timeout: 10000 }
    );

    const errors = result.status !== 0
      ? (result.stderr + result.stdout).split("\n")
          .filter((l) => l.trim().startsWith("-"))
          .map((l) => l.trim().slice(2))
      : [];

    return { valid: result.status === 0, errors };
  } finally {
    try { rmSync(tempDir, { recursive: true }); } catch { /* best-effort */ }
  }
}

async function toolValidateWorkItem(args) {
  const tempDir = mkdtempSync(join(tmpdir(), "modonome-item-"));
  const tempFile = join(tempDir, "item.json");
  writeFileSync(tempFile, JSON.stringify(args.item, null, 2), "utf8");

  try {
    const result = spawnSync(
      "node",
      [join(here, "validate-work-item.mjs"), tempFile],
      { encoding: "utf8", timeout: 10000 }
    );

    const errors = result.status !== 0
      ? (result.stderr + result.stdout).split("\n")
          .filter((l) => l.trim().startsWith("-"))
          .map((l) => l.trim().slice(2))
      : [];

    return { valid: result.status === 0, errors };
  } finally {
    try { rmSync(tempDir, { recursive: true }); } catch { /* best-effort */ }
  }
}

async function toolStatus(args) {
  const rawPath = args.repo_path || process.cwd();
  const repoPath = resolve(String(rawPath));
  if (!repoPath.startsWith("/")) {
    return { scaffolded: false, message: "repo_path must resolve to an absolute path." };
  }
  const configPath = join(repoPath, ".modonome", "config.yaml");

  if (!existsSync(configPath)) {
    return {
      scaffolded: false,
      message: "No .modonome/config.yaml found. Run: npx modonome scaffold .",
    };
  }

  const { parseFlatYaml } = await import(join(here, "lib/yaml-lite.mjs"));
  const { validateConfig } = await import(join(here, "validate-config.mjs"));
  const cfg = parseFlatYaml(readFileSync(configPath, "utf8"));
  const errors = validateConfig(cfg);

  const now = Date.now();
  let agentproof = null;
  const cached = apCache.get(repoPath);
  if (cached && cached.expiresAt > now) {
    agentproof = cached.result;
  } else {
    const apResult = spawnSync(
      "node",
      [join(root, "agentproof/runner.mjs"), "--json"],
      { encoding: "utf8", timeout: 60000, cwd: repoPath }
    );
    try {
      agentproof = JSON.parse(apResult.stdout);
    } catch {
      agentproof = { score: "error", error: apResult.stderr };
    }
    apCache.set(repoPath, { result: agentproof, expiresAt: now + AP_CACHE_TTL_MS });
  }

  return {
    scaffolded: true,
    config_valid: errors.length === 0,
    config_errors: errors,
    posture: {
      autonomy_enabled: cfg.autonomy_enabled ?? false,
      dry_run: cfg.dry_run ?? true,
      auto_merge: cfg.auto_merge ?? false,
      max_merges_per_day: cfg.max_merges_per_day ?? 0,
    },
    agentproof,
    safe_to_run: errors.length === 0,
  };
}

async function toolCompliance(args) {
  const repoPath = resolve(String(args.repo_path || process.cwd()));
  if (!existsSync(repoPath)) {
    return { error: "repo_path does not exist." };
  }
  const { buildEvidence } = await import(join(here, "build-compliance-evidence.mjs"));
  return buildEvidence(repoPath, new Date().toISOString());
}

async function toolVerifyAttestation(args) {
  if (!args.packet || typeof args.packet !== "object") {
    return { ok: false, reason: "packet object is required." };
  }
  let peerKeys = args.peer_keys;
  if (!peerKeys) {
    const repoPath = resolve(String(args.repo_path || process.cwd()));
    const keysPath = join(repoPath, ".modonome", "peer-keys.json");
    if (!existsSync(keysPath)) {
      return { ok: false, reason: "no peer_keys provided and no .modonome/peer-keys.json found." };
    }
    peerKeys = JSON.parse(readFileSync(keysPath, "utf8"));
  }
  const { verifyPacket } = await import(join(here, "verify-packet.mjs"));
  return verifyPacket(args.packet, peerKeys);
}

async function toolSnapshot(args) {
  const repoPath = resolve(String(args.repo_path || process.cwd()));
  if (!existsSync(repoPath)) return { error: "repo_path does not exist." };
  const tier = args.tier === 1 ? 1 : 0;

  if (args.verify) {
    const { walkRepo, loadIgnore } = await import(join(here, "lib", "snapshot-walk.mjs"));
    const { hashFileContent, buildMerkleTree } = await import(join(here, "lib", "merkle.mjs"));
    const sigPath = join(repoPath, ".modonome", "snapshot", "signature.json");
    if (!existsSync(sigPath)) return { verified: false, reason: "no committed snapshot found." };
    const committed = JSON.parse(readFileSync(sigPath, "utf8"));
    const files = walkRepo(repoPath, { ignore: loadIgnore(repoPath) });
    const entries = files.map((f) => ({ relPath: f.relPath, hash: hashFileContent(readFileSync(f.absPath)) }));
    const { root } = buildMerkleTree(entries);
    return { verified: root === committed.merkle_root, live_merkle_root: root, committed_merkle_root: committed.merkle_root };
  }

  const file = join(repoPath, ".modonome", "snapshot", tier === 0 ? "signature.json" : "map.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const { buildSnapshot } = await import(join(here, "lib", "snapshot-core.mjs"));
  const built = buildSnapshot(repoPath, {});
  return tier === 0 ? built.signature : built.map;
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 / MCP 1.0 protocol handler
// ---------------------------------------------------------------------------

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function errorResponse(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRequest(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "modonome", version: "0.1.0-alpha" },
      },
    });
    return;
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return;
  }

  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    let result;

    try {
      if (name === "modonome_ratchet") result = await toolRatchet(args);
      else if (name === "modonome_validate_config") result = await toolValidateConfig(args);
      else if (name === "modonome_validate_work_item") result = await toolValidateWorkItem(args);
      else if (name === "modonome_status") result = await toolStatus(args);
      else if (name === "modonome_compliance") result = await toolCompliance(args);
      else if (name === "modonome_verify_attestation") result = await toolVerifyAttestation(args);
      else if (name === "modonome_snapshot") result = await toolSnapshot(args);
      else {
        errorResponse(id, -32601, `Unknown tool: ${name}`);
        return;
      }
    } catch (e) {
      errorResponse(id, -32603, `Tool error: ${e.message}`);
      return;
    }

    send({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      },
    });
    return;
  }

  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }

  errorResponse(id, -32601, `Method not found: ${method}`);
}

// ---------------------------------------------------------------------------
// Stdio transport
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  await handleRequest(req);
});

rl.on("close", () => process.exit(0));

process.stderr.write("Modonome MCP server ready (stdio)\n");
