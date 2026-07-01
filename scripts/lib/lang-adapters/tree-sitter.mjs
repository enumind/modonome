// Optional tree-sitter backed adapters. tree-sitter is never a hard dependency of
// modonome: registerTreeSitter attempts to load the parser and grammar packages at
// runtime and only registers adapters for grammars that resolve. If nothing resolves
// it returns false and changes nothing, so the heuristic adapters stay in effect.
// This layer is a host opt-in for higher-fidelity extraction; the committed snapshot
// still uses the heuristic default so it stays reproducible across contributors.

// Map common tree-sitter node types to the adapter's symbol kinds.
const KIND = {
  function_declaration: "function",
  function_definition: "function",
  generator_function_declaration: "function",
  method_definition: "method",
  method_declaration: "method",
  class_declaration: "class",
  class_definition: "class",
  interface_declaration: "interface",
  enum_declaration: "enum",
  record_declaration: "record",
  type_declaration: "type",
  type_alias_declaration: "type",
};

function makeExtract(Parser, grammar) {
  const parser = new Parser();
  parser.setLanguage(grammar);
  return function extract(source) {
    const symbols = [];
    const imports = [];
    let tree;
    try { tree = parser.parse(String(source)); } catch { return { symbols, imports }; }
    const visit = (node, depth) => {
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (/import/.test(c.type)) {
          const m = c.text.match(/["']([^"']+)["']/) || c.text.match(/([\w.]+)/);
          if (m) imports.push({ module: m[1], line: c.startPosition.row + 1 });
        }
        const kind = KIND[c.type];
        if (kind && depth <= 1) {
          const nameNode = typeof c.childForFieldName === "function" ? c.childForFieldName("name") : null;
          const name = nameNode ? nameNode.text : (c.text.split(/\s+/)[1] || "").replace(/[^\w].*$/, "");
          if (name) {
            symbols.push({
              kind,
              name,
              exported: true,
              signature: c.text.split("\n")[0].slice(0, 200).trim(),
              line: c.startPosition.row + 1,
            });
          }
        }
        if (depth < 1) visit(c, depth + 1);
      }
    };
    visit(tree.rootNode, 0);
    return { symbols, imports };
  };
}

const GRAMMARS = [
  { id: "javascript", pkg: "tree-sitter-javascript", extensions: [".js", ".mjs", ".cjs", ".jsx"] },
  { id: "typescript", pkg: "tree-sitter-typescript", extensions: [".ts", ".tsx"] },
  { id: "python", pkg: "tree-sitter-python", extensions: [".py"] },
  { id: "go", pkg: "tree-sitter-go", extensions: [".go"] },
  { id: "java", pkg: "tree-sitter-java", extensions: [".java"] },
];

// Attempt to register tree-sitter adapters. `register` is the registry's
// registerAdapter. Returns true when at least one grammar was registered.
export async function registerTreeSitter(register) {
  let Parser;
  try {
    Parser = (await import("tree-sitter")).default;
  } catch {
    return false;
  }
  let registered = 0;
  for (const g of GRAMMARS) {
    let grammar;
    try {
      const mod = await import(g.pkg);
      grammar = g.id === "typescript" ? (mod.default?.typescript || mod.typescript) : (mod.default || mod);
    } catch {
      continue;
    }
    if (!grammar) continue;
    try {
      register({ id: `tree-sitter:${g.id}`, extensions: g.extensions, extract: makeExtract(Parser, grammar) });
      registered++;
    } catch {
      // A grammar that fails to bind is skipped; heuristic stays for those extensions.
    }
  }
  return registered > 0;
}
