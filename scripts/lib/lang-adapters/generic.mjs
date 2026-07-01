// Fallback extractor for languages without a dedicated adapter. It captures common
// top level declarations across many languages with a light heuristic, and treats
// Markdown headings as symbols so documents contribute structure too. It never
// throws, so an unknown or malformed file degrades to an empty result rather than a
// crash.
const DECL_RE = /^(?:export\s+|public\s+|pub\s+|default\s+)*(function|func|def|fn|class|struct|interface|type|enum|module|trait|impl)\s+([A-Za-z_][A-Za-z0-9_]*)/;
const IMPORT_RES = [
  /^import\s+["']?([^"';\s]+)["']?/,
  /^from\s+(\S+)\s+import\b/,
  /^\s*use\s+([^;\s]+)/,
  /^\s*#include\s+[<"]([^>"]+)[>"]/,
  /require\(\s*['"]([^'"]+)['"]\s*\)/,
];

function cleanSignature(line) {
  return line.replace(/\s*\{\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 200);
}

export const adapter = {
  id: "generic",
  extensions: [],
  extract(source, relPath) {
    const symbols = [];
    const imports = [];
    const lines = String(source).split(/\r?\n/);
    const isMarkdown = /\.(md|markdown)$/i.test(relPath || "");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed === "") continue;

      if (isMarkdown) {
        const h = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (h) symbols.push({ kind: "heading", name: h[2].slice(0, 120), signature: `${h[1]} ${h[2]}`.slice(0, 200), line: i + 1 });
        continue;
      }

      for (const re of IMPORT_RES) {
        const m = trimmed.match(re);
        if (m) { imports.push({ module: m[1], line: i + 1 }); break; }
      }
      if (/^\s/.test(line)) continue;
      const d = trimmed.match(DECL_RE);
      if (d) symbols.push({ kind: d[1], name: d[2], signature: cleanSignature(trimmed), line: i + 1 });
    }
    const seen = new Map();
    for (const imp of imports) if (!seen.has(imp.module)) seen.set(imp.module, imp);
    return { symbols, imports: [...seen.values()].sort((a, b) => (a.module < b.module ? -1 : 1)) };
  },
};
