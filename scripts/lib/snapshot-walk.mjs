// Deterministic, ignore-aware repository walk for the snapshot utility. It reads
// the tree in sorted order so output is stable, honors .gitignore and an optional
// .modonomeignore with a dependency-free glob subset, and self-excludes the
// snapshot directory so generating a snapshot never feeds on its own output.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Directories and files never worth walking. Patterns follow the same subset the
// ignore compiler below understands. A trailing slash marks a directory pattern.
const DEFAULT_IGNORES = [
  ".git/",
  "node_modules/",
  ".modonome/snapshot/",
  ".modonome/runs/",
  "llms.txt",
  "dist/",
  "build/",
  ".astro/",
  "coverage/",
  ".venv/",
  "venv/",
  "__pycache__/",
  "*.min.js",
  "*.map",
  "*.lock",
];

// Compile one gitignore-style pattern into a tester over a posix relative path.
// Supported: comments, negation (!), leading / (anchored), trailing / (directory),
// * (within a segment), ** (across segments), and ? (single non-slash char).
function compilePattern(pattern) {
  let negate = false;
  let p = pattern;
  if (p.startsWith("!")) { negate = true; p = p.slice(1); }
  if (p.endsWith("/")) p = p.slice(0, -1);
  const anchored = p.startsWith("/");
  if (anchored) p = p.slice(1);
  const hasSlash = p.includes("/");

  let body = "";
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "*") {
      if (p[i + 1] === "*") { body += ".*"; i++; } else { body += "[^/]*"; }
    } else if (c === "?") {
      body += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      body += "\\" + c;
    } else {
      body += c;
    }
  }

  const prefix = anchored || hasSlash ? "^" : "(^|.*/)";
  const re = new RegExp(`${prefix}${body}(/.*)?$`);
  return { re, negate };
}

// Build an ignore predicate for a repo root. The predicate takes a posix relative
// path and returns true when the path should be excluded. Later patterns win, so a
// negation can re-include a path a broad rule excluded.
export function loadIgnore(root) {
  const patterns = [...DEFAULT_IGNORES];
  for (const file of [".gitignore", ".modonomeignore"]) {
    try {
      const text = readFileSync(join(root, file), "utf8");
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        patterns.push(line);
      }
    } catch { /* no ignore file at this path */ }
  }
  const compiled = patterns.map(compilePattern);
  return function isIgnored(relPath) {
    let ignored = false;
    for (const c of compiled) {
      if (c.re.test(relPath)) ignored = !c.negate;
    }
    return ignored;
  };
}

// Walk a repository into a sorted list of files. Symlinks are skipped to avoid
// cycles and escapes. Returns [{ relPath, absPath, size }] ordered by relPath.
export function walkRepo(root, { ignore = () => false, maxDepth = 12 } = {}) {
  const out = [];
  function walk(absDir, relDir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = readdirSync(absDir, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      if (e.name === ".git") continue;
      if (e.isSymbolicLink()) continue;
      const rel = relDir ? `${relDir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (ignore(rel) || ignore(`${rel}/`)) continue;
        walk(join(absDir, e.name), rel, depth + 1);
      } else if (e.isFile()) {
        if (ignore(rel)) continue;
        let size = 0;
        try { size = statSync(join(absDir, e.name)).size; } catch { continue; }
        out.push({ relPath: rel, absPath: join(absDir, e.name), size });
      }
    }
  }
  walk(root, "", 0);
  out.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return out;
}
