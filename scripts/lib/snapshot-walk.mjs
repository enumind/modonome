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
  ".modonome/cache/",
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
//
// Consecutive wildcard tokens (from patterns like "***" or "**" followed directly
// by another "*") are collapsed into a single wildcard emission instead of being
// concatenated. Emitting adjacent unbounded quantifiers (".*.*", "[^/]*[^/]*", or a
// mix) makes matching a non-matching string polynomial or worse in the number of
// stacked wildcards, a real denial-of-service risk since these patterns come from
// .gitignore/.modonomeignore files inside the very repository being scanned, which
// may be untrusted. Collapsing preserves gitignore semantics (repeated stars mean
// the same as one) while keeping the compiled regex free of that shape.
function compilePattern(pattern) {
  let negate = false;
  let p = pattern;
  if (p.startsWith("!")) { negate = true; p = p.slice(1); }
  if (p.endsWith("/")) p = p.slice(0, -1);
  const anchored = p.startsWith("/");
  if (anchored) p = p.slice(1);
  const hasSlash = p.includes("/");

  // Tokenize first so adjacent wildcards can be collapsed regardless of whether
  // they originated from "**" or a run of plain "*"/"?" characters.
  const tokens = [];
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "*") {
      if (p[i + 1] === "*") { tokens.push({ wild: true, cross: true }); i++; } else { tokens.push({ wild: true, cross: false }); }
    } else if (c === "?") {
      tokens.push({ wild: true, cross: false });
    } else if ("\\^$.|+()[]{}".includes(c)) {
      tokens.push({ wild: false, text: "\\" + c });
    } else {
      tokens.push({ wild: false, text: c });
    }
  }

  const collapsed = [];
  for (const t of tokens) {
    const prev = collapsed[collapsed.length - 1];
    if (t.wild && prev && prev.wild) {
      prev.cross = prev.cross || t.cross; // a cross-segment wildcard in the run wins
      continue;
    }
    collapsed.push({ ...t });
  }

  const body = collapsed.map((t) => (t.wild ? (t.cross ? ".*" : "[^/]*") : t.text)).join("");

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
