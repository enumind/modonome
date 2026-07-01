// Pluggable language-adapter registry. An adapter maps file extensions to a
// dependency-free extractor that returns { symbols, imports } for a source string.
// getAdapter resolves by extension and falls back to the generic adapter. New
// adapters (including an optional tree-sitter backed one) register through
// registerAdapter without any change to the core pipeline.
import { extname } from "node:path";
import { adapter as jsTs } from "./js-ts.mjs";
import { adapter as generic } from "./generic.mjs";

const registry = new Map();

export function registerAdapter(adapter) {
  for (const ext of adapter.extensions) registry.set(ext.toLowerCase(), adapter);
}

registerAdapter(jsTs);

// Resolve the adapter for a path by extension, defaulting to the generic fallback.
export function getAdapter(relPath) {
  const ext = extname(relPath || "").toLowerCase();
  return registry.get(ext) || generic;
}

// Extract from one file, guarding against any adapter error so a single bad file
// never aborts a whole snapshot.
export function extractFile(relPath, source) {
  const adapter = getAdapter(relPath);
  try {
    const result = adapter.extract(source, relPath) || {};
    return { adapterId: adapter.id, symbols: result.symbols || [], imports: result.imports || [] };
  } catch {
    return { adapterId: adapter.id, symbols: [], imports: [] };
  }
}

// The generic adapter is exported so tree-sitter or other adapters can defer to it.
export { generic };
