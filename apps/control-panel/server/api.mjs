// A small Vite dev/preview-server middleware that exposes the real .modonome state
// over HTTP so the browser app (which has no filesystem access) can read and, when
// explicitly enabled, write it. Reads are always on. Writes are gated in two tiers:
// a connected HOST repo is writable with MODONOME_PANEL_WRITE=1, but SELF-GOVERNANCE
// (writing this repo's OWN .modonome, above all its autonomy levers) additionally
// requires the operator to be a code owner. So evolving a host is easy; turning
// autonomy on modonome itself is reserved to a code owner. See ./ownership.mjs.
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readModonomeState } from "./modonomeReader.mjs";
import { patchConfig, releaseLease, pruneLearning, createWorkItem, updateWorkItem, deleteWorkItem } from "./modonomeWriter.mjs";
import { selfGovernanceOwnership } from "./ownership.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const DEFAULT_DIRS = {
  product: join(repoRoot, ".modonome"),
  host: join(repoRoot, "examples", "demo-app", ".modonome"),
};
// The one .modonome that IS this repo's own governance. Keyed off the resolved path,
// not the client's mode label, so a write cannot dodge the owner gate by claiming to
// be "host" while pointing at the product's own dir.
const PRODUCT_DIR = resolve(DEFAULT_DIRS.product);

function isSelfGovernance(dir) {
  return resolve(dir) === PRODUCT_DIR;
}

function resolveModonomeDir(rawMode, dirParam) {
  const mode = rawMode === "host" ? "host" : "product";
  const base = dirParam ? resolve(dirParam) : DEFAULT_DIRS[mode];
  const dir = base.endsWith(".modonome") ? base : join(base, ".modonome");
  if (!existsSync(dir)) {
    throw new Error(`No .modonome directory found at ${dir}.`);
  }
  return { dir, mode };
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!data) return resolveBody({});
      try {
        resolveBody(JSON.parse(data));
      } catch {
        rejectBody(new Error("Invalid JSON body."));
      }
    });
    req.on("error", rejectBody);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
  return true;
}

// The single source of truth for "may a write to this dir proceed", used both to
// decide a 403 and to set source.writable, so the two can never drift. Returns the
// base flag first (off => nothing is writable, any mode), then the owner gate for a
// self-governance target.
function writeGate(baseWritable, dir) {
  if (!baseWritable) {
    return { allowed: false, reason: "Write mode is off. Restart the dev server with MODONOME_PANEL_WRITE=1 to enable edits." };
  }
  if (isSelfGovernance(dir)) {
    const own = selfGovernanceOwnership(repoRoot);
    if (!own.owner) {
      return {
        allowed: false,
        reason: `Self-governance is view-only: only a code owner of this repository can change how modonome governs itself (${own.reason}). Connect a host repo to evolve that instead.`,
      };
    }
  }
  return { allowed: true, reason: "" };
}

function stateWithSource(baseWritable, dir, mode) {
  const gate = writeGate(baseWritable, dir);
  const state = readModonomeState(dir, { mode });
  state.source = { kind: "live", writable: gate.allowed, selfGovernance: isSelfGovernance(dir) };
  if (!gate.allowed && gate.reason) state.source.writeLockReason = gate.reason;
  return state;
}

// Best-effort reachability probe for an OpenAI-compatible endpoint (LM Studio,
// Ollama, a gateway). Read-only and network-only: it never touches config.yaml, so
// it needs no write guard. Always resolves (never throws to the caller) so the panel
// can show an inline pass/fail pill instead of an unhandled error.
function buildModelsUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/models")) return trimmed;
  return `${trimmed}/models`;
}

async function testConnection(baseUrl) {
  let url;
  try {
    url = buildModelsUrl(baseUrl);
    new URL(url);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => null);
    const models = Array.isArray(data?.data) ? data.data.map((m) => m?.id).filter(Boolean) : [];
    return { ok: true, models };
  } catch (err) {
    if (err && err.name === "AbortError") return { ok: false, error: "Timed out after 4s." };
    const code = err?.cause?.code;
    if (code) return { ok: false, error: `${code === "ECONNREFUSED" ? "Connection refused" : code} (${url})` };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

export function modonomeApiPlugin() {
  const baseWritable = process.env.MODONOME_PANEL_WRITE === "1";

  // Every write funnels through here: resolve the target, run the one write gate
  // (base flag + self-governance owner check), 403 with its reason on refusal, else
  // apply `mutate` and return fresh state. One place to enforce, so no route can skip
  // the owner gate.
  async function runWrite(req, res, mutate) {
    const body = await readBody(req);
    const { dir, mode } = resolveModonomeDir(body.mode, body.dir);
    const gate = writeGate(baseWritable, dir);
    if (!gate.allowed) return sendJson(res, 403, { error: gate.reason });
    mutate(dir, body);
    return sendJson(res, 200, stateWithSource(baseWritable, dir, mode));
  }

  async function handle(req, res, url) {
    try {
      if (url.pathname === "/api/modonome/state" && req.method === "GET") {
        const { dir, mode } = resolveModonomeDir(url.searchParams.get("mode"), url.searchParams.get("dir"));
        return sendJson(res, 200, stateWithSource(baseWritable, dir, mode));
      }

      if (url.pathname === "/api/modonome/test-connection" && req.method === "GET") {
        const baseUrl = url.searchParams.get("baseUrl");
        if (!baseUrl) return sendJson(res, 400, { error: "Missing baseUrl." });
        return sendJson(res, 200, await testConnection(baseUrl));
      }

      if (url.pathname === "/api/modonome/config" && req.method === "POST") {
        return runWrite(req, res, (dir, body) => patchConfig(dir, body.patch ?? {}));
      }
      if (url.pathname === "/api/modonome/lease/release" && req.method === "POST") {
        return runWrite(req, res, (dir, body) => releaseLease(dir, body.itemId));
      }
      if (url.pathname === "/api/modonome/learning/prune" && req.method === "POST") {
        return runWrite(req, res, (dir, body) => pruneLearning(dir, body.lesson));
      }
      if (url.pathname === "/api/modonome/work-item" && req.method === "POST") {
        return runWrite(req, res, (dir, body) => createWorkItem(dir, body.item ?? {}));
      }
      if (url.pathname === "/api/modonome/work-item/update" && req.method === "POST") {
        return runWrite(req, res, (dir, body) => updateWorkItem(dir, body.itemId, body.patch ?? {}));
      }
      if (url.pathname === "/api/modonome/work-item/delete" && req.method === "POST") {
        return runWrite(req, res, (dir, body) => deleteWorkItem(dir, body.itemId));
      }

      return false;
    } catch (err) {
      return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  function middleware(req, res, next) {
    if (!req.url || !req.url.startsWith("/api/modonome/")) return next();
    const url = new URL(req.url, "http://localhost");
    handle(req, res, url).then((handled) => {
      if (handled === false) next();
    });
  }

  return {
    name: "modonome-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
