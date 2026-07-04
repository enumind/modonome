// A small Vite dev/preview-server middleware that exposes the real .modonome state
// over HTTP so the browser app (which has no filesystem access) can read and, when
// explicitly enabled, write it. Reads are always on. Writes require the operator to
// start the server with MODONOME_PANEL_WRITE=1, an explicit opt-in for a tool that
// edits real repo files.
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readModonomeState } from "./modonomeReader.mjs";
import { patchConfig, releaseLease, pruneLearning, patchMessages } from "./modonomeWriter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const DEFAULT_DIRS = {
  product: join(repoRoot, ".modonome"),
  host: join(repoRoot, "examples", "demo-app", ".modonome"),
};

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

function stateWithSource(dir, mode, writable) {
  const state = readModonomeState(dir, { mode });
  state.source = { kind: "live", writable };
  return state;
}

export function modonomeApiPlugin() {
  const writable = process.env.MODONOME_PANEL_WRITE === "1";
  const writeGuard = (res) =>
    sendJson(res, 403, {
      error: "Write mode is off. Restart the dev server with MODONOME_PANEL_WRITE=1 to enable edits.",
    });

  async function handle(req, res, url) {
    try {
      if (url.pathname === "/api/modonome/state" && req.method === "GET") {
        const { dir, mode } = resolveModonomeDir(url.searchParams.get("mode"), url.searchParams.get("dir"));
        return sendJson(res, 200, stateWithSource(dir, mode, writable));
      }

      if (url.pathname === "/api/modonome/config" && req.method === "POST") {
        if (!writable) return writeGuard(res);
        const body = await readBody(req);
        const { dir, mode } = resolveModonomeDir(body.mode, body.dir);
        patchConfig(dir, body.patch ?? {});
        return sendJson(res, 200, stateWithSource(dir, mode, writable));
      }

      if (url.pathname === "/api/modonome/messages" && req.method === "POST") {
        if (!writable) return writeGuard(res);
        const body = await readBody(req);
        const { dir, mode } = resolveModonomeDir(body.mode, body.dir);
        patchMessages(dir, body.patch ?? {});
        return sendJson(res, 200, stateWithSource(dir, mode, writable));
      }

      if (url.pathname === "/api/modonome/lease/release" && req.method === "POST") {
        if (!writable) return writeGuard(res);
        const body = await readBody(req);
        const { dir, mode } = resolveModonomeDir(body.mode, body.dir);
        releaseLease(dir, body.itemId);
        return sendJson(res, 200, stateWithSource(dir, mode, writable));
      }

      if (url.pathname === "/api/modonome/learning/prune" && req.method === "POST") {
        if (!writable) return writeGuard(res);
        const body = await readBody(req);
        const { dir, mode } = resolveModonomeDir(body.mode, body.dir);
        pruneLearning(dir, body.lesson);
        return sendJson(res, 200, stateWithSource(dir, mode, writable));
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
