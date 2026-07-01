// Dependency-free signature extractor for Java. It captures type declarations
// (class, interface, enum, record) and public or protected method signatures, their
// preceding Javadoc, and import edges. Bodies are never included. exported is true
// for public declarations. Control-flow keywords are excluded from method matching.
const CONTROL = new Set(["if", "for", "while", "switch", "catch", "return", "new", "synchronized"]);

function clean(text) {
  const out = String(text).replace(/\/\*\*?/g, "").replace(/\*\//g, "").replace(/^\s*\*\s?/gm, "").replace(/\s+/g, " ").trim();
  return out.length > 0 ? out.slice(0, 200) : undefined;
}

function signature(line) {
  const cut = line.split("{")[0].split("=")[0];
  return cut.replace(/[;{]\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 200);
}

function docAbove(lines, index) {
  let j = index - 1;
  while (j >= 0 && lines[j].trim() === "") j--;
  if (j >= 0 && lines[j].trim().endsWith("*/")) {
    const parts = [];
    while (j >= 0) {
      const t = lines[j].trim();
      parts.unshift(t);
      if (t.startsWith("/*")) break;
      j--;
    }
    return clean(parts.join(" "));
  }
  return undefined;
}

export const adapter = {
  id: "java",
  extensions: [".java"],
  extract(source, relPath) {
    void relPath;
    const lines = String(source).split(/\r?\n/);
    const symbols = [];
    const imports = [];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === "") continue;

      const imp = trimmed.match(/^import\s+(?:static\s+)?([\w.]+)\s*;/);
      if (imp) { imports.push({ module: imp[1], line: i + 1 }); continue; }

      let m;
      if ((m = trimmed.match(/^(?:public\s+|protected\s+|private\s+)?(?:abstract\s+|final\s+|sealed\s+|static\s+)*(class|interface|enum|record)\s+([A-Za-z_]\w*)/))) {
        symbols.push({ kind: m[1], name: m[2], exported: /\bpublic\b/.test(trimmed), signature: signature(trimmed), line: i + 1, doc: docAbove(lines, i) });
        continue;
      }
      // Public or protected methods: a visibility modifier, then a name before "(".
      // Guarded against field initializers (=) and statements (;) before the paren.
      const method = trimmed.match(/^(?:public|protected)\b[^=;]*\b([A-Za-z_]\w*)\s*\(/);
      if (method && !CONTROL.has(method[1])) {
        symbols.push({ kind: "method", name: method[1], exported: /^\s*public\b/.test(trimmed), signature: signature(trimmed), line: i + 1, doc: docAbove(lines, i) });
      }
    }
    const seen = new Map();
    for (const im of imports) if (!seen.has(im.module)) seen.set(im.module, im);
    return { symbols, imports: [...seen.values()].sort((a, b) => (a.module < b.module ? -1 : a.module > b.module ? 1 : 0)) };
  },
};
