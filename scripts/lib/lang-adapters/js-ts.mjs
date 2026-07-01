// Dependency-free signature extractor for JavaScript and TypeScript. It scans top
// level lines for exported and top level declarations, capturing the signature line
// (never the body) and any leading docstring, plus import and require edges. The
// approach is heuristic by design so it never fails on a syntax error the way a real
// parser would. A tree-sitter adapter can replace it later through the registry.

const SYMBOL_RULES = [
  { kind: "function", exported: true, re: /^export\s+default\s+(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/ },
  { kind: "function", exported: true, re: /^export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/ },
  { kind: "class", exported: true, re: /^export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/ },
  { kind: "interface", exported: true, re: /^export\s+interface\s+([A-Za-z0-9_$]+)/ },
  { kind: "type", exported: true, re: /^export\s+type\s+([A-Za-z0-9_$]+)/ },
  { kind: "enum", exported: true, re: /^export\s+(?:const\s+)?enum\s+([A-Za-z0-9_$]+)/ },
  { kind: "function", exported: true, re: /^export\s+const\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?\(/ },
  { kind: "function", exported: true, re: /^export\s+const\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s+)?function\b/ },
  { kind: "const", exported: true, re: /^export\s+const\s+([A-Za-z0-9_$]+)/ },
  { kind: "var", exported: true, re: /^export\s+(?:let|var)\s+([A-Za-z0-9_$]+)/ },
  { kind: "function", exported: false, re: /^(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/ },
  { kind: "class", exported: false, re: /^(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/ },
];

function matchSymbol(trimmed) {
  for (const rule of SYMBOL_RULES) {
    const m = trimmed.match(rule.re);
    if (m) return { kind: rule.kind, name: m[1], exported: rule.exported };
  }
  return null;
}

function cleanSignature(trimmed) {
  let sig = trimmed.replace(/\s*=>\s*\{?\s*$/, "");
  sig = sig.replace(/\s*\{\s*$/, "");
  sig = sig.replace(/\s+/g, " ").trim();
  return sig.slice(0, 200);
}

function cleanDoc(text) {
  const out = text
    .replace(/\/\*\*?/g, "")
    .replace(/\*\//g, "")
    .replace(/^\s*\*\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return out.length > 0 ? out.slice(0, 200) : undefined;
}

function docAbove(lines, index) {
  let j = index - 1;
  if (j >= 0 && lines[j].trim().endsWith("*/")) {
    const parts = [];
    while (j >= 0) {
      const t = lines[j].trim();
      parts.unshift(t);
      if (t.startsWith("/*")) break;
      j--;
    }
    return cleanDoc(parts.join(" "));
  }
  const parts = [];
  while (j >= 0 && lines[j].trim().startsWith("//")) {
    parts.unshift(lines[j].trim().replace(/^\/\/\s?/, ""));
    j--;
  }
  return parts.length ? cleanDoc(parts.join(" ")) : undefined;
}

function collectImports(trimmed, lineNo) {
  const found = [];
  let m;
  if ((m = trimmed.match(/^import\s+[^'"]*from\s+['"]([^'"]+)['"]/)) ||
      (m = trimmed.match(/^import\s+['"]([^'"]+)['"]/)) ||
      (m = trimmed.match(/^export\s+[^'"]*from\s+['"]([^'"]+)['"]/))) {
    found.push({ module: m[1], line: lineNo });
  }
  const req = trimmed.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
  if (req) found.push({ module: req[1], line: lineNo });
  return found;
}

export const adapter = {
  id: "js-ts",
  extensions: [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"],
  extract(source, relPath) {
    void relPath;
    const lines = String(source).split(/\r?\n/);
    const symbols = [];
    const imports = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed === "") continue;
      for (const imp of collectImports(trimmed, i + 1)) imports.push(imp);
      // Only top-level declarations (no leading indentation) count as public API,
      // which keeps methods and nested closures out of the signature list.
      if (/^\s/.test(line)) continue;
      const sym = matchSymbol(trimmed);
      if (sym) {
        symbols.push({
          kind: sym.kind,
          name: sym.name,
          exported: sym.exported,
          signature: cleanSignature(trimmed),
          line: i + 1,
          doc: docAbove(lines, i),
        });
      }
    }
    return { symbols, imports: dedupeImports(imports) };
  },
};

function dedupeImports(imports) {
  const seen = new Map();
  for (const imp of imports) {
    if (!seen.has(imp.module)) seen.set(imp.module, imp);
  }
  return [...seen.values()].sort((a, b) => (a.module < b.module ? -1 : a.module > b.module ? 1 : 0));
}
