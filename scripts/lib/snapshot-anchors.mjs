// Stable short anchors and the path dictionary for a snapshot. An anchor is a
// deterministic short id derived from a content hash. Files get F: ids and symbols
// get S: ids that resolve back to a file and line, so an LLM can cite an anchor and
// act on it without re-reading the repository. The dictionary lets the map compress
// by referencing path ids instead of repeating full paths.
import { createHash } from "node:crypto";

// A short, stable id from a string. Hex keeps it deterministic across platforms.
function short(text, len = 10) {
  return createHash("sha256").update(text).digest("hex").slice(0, len);
}

export function fileAnchor(relPath) {
  return "F:" + short(relPath);
}

export function symbolAnchor(relPath, name) {
  return "S:" + short(`${relPath}#${name}`);
}

// Build the path dictionary from walked files. Returns { paths, pathIdByPath }
// where `paths` is the serializable { id -> relPath } map and `pathIdByPath` is the
// reverse lookup callers use to reference paths by id in edges and the API list.
export function buildPathDictionary(relPaths) {
  const paths = {};
  const pathIdByPath = {};
  for (const relPath of [...relPaths].sort()) {
    const id = fileAnchor(relPath);
    paths[id] = relPath;
    pathIdByPath[relPath] = id;
  }
  return { paths, pathIdByPath };
}

// Build the symbol dictionary from API entries. Each entry carries its anchor,
// owning path id, name, and line, so an anchor resolves to an exact location.
export function buildSymbolDictionary(apiEntries) {
  const symbols = {};
  for (const entry of apiEntries) {
    symbols[entry.anchor] = { path_id: entry.path_id, name: entry.name, line: entry.line };
  }
  return symbols;
}
