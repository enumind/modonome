// Content-addressed Merkle tree over a repository, the reliability core of a
// snapshot. Every file contributes a content hash; every directory hash covers the
// canonical list of its sorted children, so an unchanged subtree keeps a stable
// hash and any byte change flows up to the root. The root is the Tier 0 signature.
import { createHash } from "node:crypto";
import { canonicalize } from "./canonical-json.mjs";

// Hash raw file bytes (Buffer or string) into a prefixed digest.
export function hashFileContent(bytes) {
  return "sha256:" + createHash("sha256").update(bytes).digest("hex");
}

// Hash an arbitrary string, used for oversized or unreadable files where content
// is represented by a stable stand-in rather than its bytes.
export function hashString(text) {
  return "sha256:" + createHash("sha256").update(String(text)).digest("hex");
}

// Build a Merkle tree from file leaves. `entries` is [{ relPath, hash }]. Returns
// { root, nodes } where nodes maps every directory path (root is ".") to its hash.
export function buildMerkleTree(entries) {
  const tree = {};
  for (const { relPath, hash } of [...entries].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    const parts = relPath.split("/");
    let cur = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = hash;
  }

  const nodes = {};
  function hashNode(obj, path) {
    const names = Object.keys(obj).sort();
    const children = names.map((name) => {
      const value = obj[name];
      const childHash = typeof value === "string" ? value : hashNode(value, path ? `${path}/${name}` : name);
      return { name, hash: childHash };
    });
    const h = "sha256:" + createHash("sha256").update(canonicalize(children)).digest("hex");
    nodes[path || "."] = h;
    return h;
  }
  const root = hashNode(tree, "");
  return { root, nodes };
}

// File-level diff between two { relPath -> hash } maps. Returns sorted lists of
// added, removed, and changed paths. Directory node hashes (from buildMerkleTree)
// let a caller skip re-extracting an unchanged subtree; this diff drives that.
export function diffMerkle(prevFiles, nextFiles) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const p of Object.keys(nextFiles)) {
    if (!(p in prevFiles)) added.push(p);
    else if (prevFiles[p] !== nextFiles[p]) changed.push(p);
  }
  for (const p of Object.keys(prevFiles)) {
    if (!(p in nextFiles)) removed.push(p);
  }
  added.sort();
  removed.sort();
  changed.sort();
  return { added, removed, changed };
}
