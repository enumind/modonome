// Dependency-free signature extractor for Python. It captures top-level def and
// class declarations (async included), their leading triple-quoted docstring, and
// import edges. Bodies are never included. exported is true when the name does not
// start with an underscore, matching Python's convention for public API.
function clean(text) {
  const out = String(text).replace(/\s+/g, " ").trim();
  return out.length > 0 ? out.slice(0, 200) : undefined;
}

function signature(line) {
  return line.replace(/:\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 200);
}

// The docstring is the first triple-quoted string on the line(s) after a def/class.
function docBelow(lines, defIndex) {
  for (let j = defIndex + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (t === "") continue;
    const m = t.match(/^(?:[rubRUB]{0,2})("""|''')/);
    if (!m) return undefined; // first real line is not a docstring
    const q = m[1];
    const after = t.slice(t.indexOf(q) + 3);
    if (after.includes(q)) return clean(after.slice(0, after.indexOf(q)));
    const buf = [after];
    for (let k = j + 1; k < lines.length; k++) {
      const idx = lines[k].indexOf(q);
      if (idx !== -1) { buf.push(lines[k].slice(0, idx)); break; }
      buf.push(lines[k]);
    }
    return clean(buf.join(" "));
  }
  return undefined;
}

function collectImports(trimmed, lineNo, out) {
  let m;
  if ((m = trimmed.match(/^from\s+([.\w]+)\s+import\b/))) {
    out.push({ module: m[1], line: lineNo });
  } else if ((m = trimmed.match(/^import\s+(.+)$/))) {
    for (const part of m[1].split(",")) {
      const mod = part.trim().split(/\s+as\s+/)[0].trim();
      if (mod) out.push({ module: mod, line: lineNo });
    }
  }
}

export const adapter = {
  id: "python",
  extensions: [".py"],
  extract(source, relPath) {
    void relPath;
    const lines = String(source).split(/\r?\n/);
    const symbols = [];
    const imports = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed === "") continue;
      if (!/^\s/.test(line)) collectImports(trimmed, i + 1, imports);
      // Only column-zero declarations are treated as public module API.
      if (/^\s/.test(line)) continue;
      let m;
      if ((m = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)/))) {
        symbols.push({ kind: "function", name: m[1], exported: !m[1].startsWith("_"), signature: signature(trimmed), line: i + 1, doc: docBelow(lines, i) });
      } else if ((m = trimmed.match(/^class\s+([A-Za-z_]\w*)/))) {
        symbols.push({ kind: "class", name: m[1], exported: !m[1].startsWith("_"), signature: signature(trimmed), line: i + 1, doc: docBelow(lines, i) });
      }
    }
    const seen = new Map();
    for (const imp of imports) if (!seen.has(imp.module)) seen.set(imp.module, imp);
    return { symbols, imports: [...seen.values()].sort((a, b) => (a.module < b.module ? -1 : a.module > b.module ? 1 : 0)) };
  },
};
