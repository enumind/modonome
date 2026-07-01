// Dependency-free signature extractor for Go. It captures top-level func (including
// methods with a receiver), type, const, and var declarations, their preceding line
// comments, and import edges (single and block form). Bodies are never included.
// exported is true when the identifier is capitalized, matching Go's export rule.
function clean(text) {
  const out = String(text).replace(/\s+/g, " ").trim();
  return out.length > 0 ? out.slice(0, 200) : undefined;
}

function signature(line) {
  return line.replace(/\s*\{\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 200);
}

function docAbove(lines, index) {
  const parts = [];
  let j = index - 1;
  while (j >= 0 && lines[j].trim().startsWith("//")) {
    parts.unshift(lines[j].trim().replace(/^\/\/\s?/, ""));
    j--;
  }
  return parts.length ? clean(parts.join(" ")) : undefined;
}

export const adapter = {
  id: "go",
  extensions: [".go"],
  extract(source, relPath) {
    void relPath;
    const lines = String(source).split(/\r?\n/);
    const symbols = [];
    const imports = [];
    let inImportBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed === "") continue;

      // Imports: single line or a parenthesized block of quoted paths.
      if (inImportBlock) {
        if (trimmed.startsWith(")")) { inImportBlock = false; continue; }
        const bm = trimmed.match(/"([^"]+)"/);
        if (bm) imports.push({ module: bm[1], line: i + 1 });
        continue;
      }
      if (/^import\s*\(/.test(trimmed)) { inImportBlock = true; continue; }
      const single = trimmed.match(/^import\s+(?:[\w.]+\s+)?"([^"]+)"/);
      if (single) { imports.push({ module: single[1], line: i + 1 }); continue; }

      // Only column-zero declarations are treated as package API.
      if (/^\s/.test(line)) continue;
      let m;
      if ((m = trimmed.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/))) {
        symbols.push({ kind: "function", name: m[1], exported: /^[A-Z]/.test(m[1]), signature: signature(trimmed), line: i + 1, doc: docAbove(lines, i) });
      } else if ((m = trimmed.match(/^type\s+([A-Za-z_]\w*)/))) {
        symbols.push({ kind: "type", name: m[1], exported: /^[A-Z]/.test(m[1]), signature: signature(trimmed), line: i + 1, doc: docAbove(lines, i) });
      } else if ((m = trimmed.match(/^const\s+([A-Za-z_]\w*)/))) {
        symbols.push({ kind: "const", name: m[1], exported: /^[A-Z]/.test(m[1]), signature: signature(trimmed), line: i + 1, doc: docAbove(lines, i) });
      } else if ((m = trimmed.match(/^var\s+([A-Za-z_]\w*)/))) {
        symbols.push({ kind: "var", name: m[1], exported: /^[A-Z]/.test(m[1]), signature: signature(trimmed), line: i + 1, doc: docAbove(lines, i) });
      }
    }
    const seen = new Map();
    for (const imp of imports) if (!seen.has(imp.module)) seen.set(imp.module, imp);
    return { symbols, imports: [...seen.values()].sort((a, b) => (a.module < b.module ? -1 : a.module > b.module ? 1 : 0)) };
  },
};
