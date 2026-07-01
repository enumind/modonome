// Local incremental cache for the snapshot utility. It stores per-file extraction
// results keyed by path so a rebuild can reuse unchanged files without reading or
// re-parsing them, and it asks git which files changed since the cache was built.
// The cache is a pure optimization: it is gitignored, and any doubt (no cache, no
// git, parse error) falls back to a full rebuild that produces identical output.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

export const CACHE_SCHEMA_VERSION = 1;

// A value safe to pass as a git revision argument: a short-to-full hex SHA.
// Rejects anything else, in particular a leading "-", which git would parse as
// an option (some git options can read or write files) rather than a revision.
// This guards changedPaths() against a cache file whose built_at_head has been
// tampered with or shipped maliciously by the repo being scanned.
export function isPlausibleRevision(value) {
  return typeof value === "string" && /^[0-9a-f]{4,40}$/i.test(value);
}

function cachePath(root) {
  // Kept outside the committed .modonome/snapshot/ dir so `git add .modonome/snapshot`
  // never stages this local-only cache.
  return join(root, ".modonome", "cache", "snapshot-index.json");
}

// Load the cache for a repo, or null when absent, unreadable, or a different version.
export function loadCache(root) {
  const p = cachePath(root);
  if (!existsSync(p)) return null;
  try {
    const cache = JSON.parse(readFileSync(p, "utf8"));
    if (cache && cache.schema_version === CACHE_SCHEMA_VERSION && cache.entries) return cache;
    return null;
  } catch {
    return null;
  }
}

// Persist the cache. entries is { relPath: { hash, symbols, imports, purposeRaw } }.
export function saveCache(root, { built_at_head = null, entries = {} }) {
  const p = cachePath(root);
  try {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ schema_version: CACHE_SCHEMA_VERSION, built_at_head, entries }) + "\n");
  } catch { /* cache write is best-effort and never fails the command */ }
}

// The current git HEAD sha for the repo, or null when unavailable.
export function gitHead(root) {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 10000 });
  return r.status === 0 ? r.stdout.trim() : null;
}

// Strip git's optional quoting from a porcelain path.
function unquote(p) {
  const t = p.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

// The set of paths that changed since the cache was built: uncommitted work (git
// status) plus commits since cache.built_at_head. Returns null when git is not
// usable, which forces a full rebuild.
export function changedPaths(root, cache) {
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", timeout: 10000 });
  if (status.status !== 0) return null;
  const changed = new Set();
  for (const line of status.stdout.split("\n")) {
    if (!line.trim()) continue;
    const rest = line.slice(3);
    if (rest.includes(" -> ")) {
      const [from, to] = rest.split(" -> ");
      changed.add(unquote(from));
      changed.add(unquote(to));
    } else {
      changed.add(unquote(rest));
    }
  }
  const base = cache && cache.built_at_head;
  if (base && isPlausibleRevision(base)) {
    const diff = spawnSync("git", ["diff", "--name-only", base, "HEAD"], { cwd: root, encoding: "utf8", timeout: 10000 });
    if (diff.status === 0) {
      for (const line of diff.stdout.split("\n")) {
        const p = line.trim();
        if (p) changed.add(p);
      }
    }
  }
  return changed;
}
