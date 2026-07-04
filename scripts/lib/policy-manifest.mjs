// Pure builder for the policy-attestation manifest (ADR-036). It reads FROM the
// authoritative governance sources (the deterministic detector libraries, the shared
// capability-flag registry, the config, and the verify chain) and returns a deterministic,
// content-addressed object that discloses the policy this repo enforces and its
// AI-participation posture.
//
// This is a disclosure, never a source of truth: the detectors are not driven from this
// manifest, so a policy pack can be published and verified without weakening the
// base-pinned trust boundary. The attribution detectors are fingerprinted by content hash
// (not imported) so this module stays clear of the determinism boundary and never reaches
// the near-miss widener.
//
// Dependency-free and side-effect-free, so its test runs under plain `node --test`.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { canonicalize } from "./canonical-json.mjs";
import { DENYLISTED_PREFIXES } from "./branch-name.mjs";
import { CAPABILITY_FLAGS } from "./capability-flags.mjs";

// v2 adds the required `generator` credit block (Phase 4: policy-pack adoption tooling,
// ADR-037). Because `generator` is required and content-digested, a vendored copy cannot
// silently drop credit to modonome without either invalidating its digest or becoming
// schema-invalid outright.
export const MANIFEST_VERSION = 2;
export const ATTESTATION_KIND = "policy-attestation";

// The deterministic attribution detectors whose exact bytes define the enforced policy.
const POLICY_SOURCE_FILES = [
  "scripts/lib/branch-name.mjs",
  "scripts/lib/commit-identity.mjs",
  "scripts/lib/detect-attribution.mjs",
  "scripts/lib/near-miss.mjs",
];

// A stable, human-readable statement of the disclosure model. The authoritative prose
// lives in the source documents fingerprinted below; this paraphrase is drift-tolerant so
// a copyedit there does not silently rewrite the attested statement.
const DISCLOSURE_STATEMENT =
  "AI participation in this repository is disclosed at the architectural level rather " +
  "than per artifact. Trust rests on the governance process: CI gates, an independent " +
  "checker, and the anti-gaming ratchet. Git history reflects human ownership, and agent " +
  "identity stays out of commit messages, branch names, and pull requests.";

// The documents that carry the authoritative disclosure prose. Fingerprinted by section
// so a change to the stated policy surfaces as a digest change (and a stale attestation).
const DISCLOSURE_SOURCES = [
  { file: "README.md", section: "Development practice" },
  { file: "AGENTS.md", section: "Commit messages" },
];

function sha256Hex(bytes) {
  return "sha256:" + createHash("sha256").update(bytes).digest("hex");
}

function readOrNull(root, rel) {
  try {
    return readFileSync(join(root, rel));
  } catch {
    return null;
  }
}

// Extract a Markdown section body: the heading whose text matches `heading`
// (case-insensitive) and the lines beneath it, up to the next heading of the same or
// higher level. Returns null when no such heading exists, so a rename surfaces as
// found:false in the manifest rather than crashing generation.
export function extractSection(markdown, heading) {
  const lines = markdown.split("\n");
  const want = heading.trim().toLowerCase();
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.*)$/.exec(lines[i]);
    if (m && m[2].trim().toLowerCase() === want) {
      start = i;
      level = m[1].length;
      break;
    }
  }
  if (start === -1) return null;
  const body = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#{1,6})\s+/.exec(lines[i]);
    if (m && m[1].length <= level) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function fingerprintDisclosureSources(root) {
  return DISCLOSURE_SOURCES.map(({ file, section }) => {
    const raw = readOrNull(root, file);
    if (raw === null) return { file, section, found: false, sha256: null };
    const body = extractSection(raw.toString("utf8"), section);
    if (body === null) return { file, section, found: false, sha256: null };
    return { file, section, found: true, sha256: sha256Hex(Buffer.from(body, "utf8")) };
  });
}

function fingerprintPolicyFiles(root) {
  return POLICY_SOURCE_FILES.map((file) => {
    const raw = readOrNull(root, file);
    return { file, sha256: raw === null ? null : sha256Hex(raw) };
  });
}

// The disclosed gate set is derived from the actual `verify` npm script so it cannot drift
// from what the project runs. One level of `npm run <name>` / `npm test` aliases is
// flattened so gates hidden behind script names (check:drift -> scripts/check-drift.mjs)
// are disclosed too.
export function gatesFromVerify(pkgJson) {
  const scripts = (pkgJson && pkgJson.scripts) || {};
  const verify = scripts.verify || "";
  const flat = verify
    .replace(/npm run ([\w:-]+)/g, (_, name) => scripts[name] || "")
    .replace(/npm test\b/g, scripts.test || "");
  const gates = new Set();
  for (const m of flat.matchAll(/scripts\/(check-[\w-]+)\.mjs/g)) gates.add(m[1]);
  if (/agentproof\/runner\.mjs/.test(flat)) gates.add("agentproof");
  if (/node --test/.test(flat)) gates.add("tests");
  if (/snapshot\.mjs\b[^&]*--check/.test(flat)) gates.add("snapshot-freshness");
  if (/build-policy-attestation\.mjs\b[^&]*--check/.test(flat)) gates.add("policy-attestation-freshness");
  return [...gates].sort();
}

function capabilities(config) {
  return CAPABILITY_FLAGS.map((name) => ({ name, default: config[name] === true }));
}

// The credit block (ADR-037). Populated from package.json, never hardcoded twice, so a
// rename in package.json is what moves this, not a second literal to keep in sync. The
// repository URL is stripped of its "git+" prefix and ".git" suffix for a plain, clickable
// link.
function generator(pkgJson) {
  const pkg = pkgJson || {};
  const repoUrl = typeof pkg.repository === "string" ? pkg.repository : pkg.repository && pkg.repository.url;
  return {
    name: pkg.name,
    homepage: pkg.homepage,
    repository: repoUrl && repoUrl.replace(/^git\+/, "").replace(/\.git$/, ""),
  };
}

function normalizePaths(list) {
  return (Array.isArray(list) ? list : [])
    .map((p) => String(p).replace(/\/+$/, ""))
    .filter(Boolean)
    .sort();
}

// Build the deterministic manifest body (without the content_digest) from repo state.
export function buildPolicyManifestBody({ root, config, pkgJson }) {
  const cfg = config || {};
  return {
    manifest_version: MANIFEST_VERSION,
    kind: ATTESTATION_KIND,
    generator: generator(pkgJson),
    disclosure: {
      model: "architectural",
      statement: DISCLOSURE_STATEMENT,
      sources: fingerprintDisclosureSources(root),
    },
    policy: {
      attribution_sources: fingerprintPolicyFiles(root),
      branch_denylist: [...DENYLISTED_PREFIXES].sort(),
      capabilities: capabilities(cfg),
      protected_paths_extra: normalizePaths(cfg.protected_paths_extra),
      gates: gatesFromVerify(pkgJson),
    },
    posture: {
      autonomy_enabled: cfg.autonomy_enabled === true,
      dry_run: cfg.dry_run !== false,
    },
  };
}

// Content digest over the canonical (RFC 8785 JCS) serialization of the body, so a
// re-serialized or key-reordered file yields the same digest and only a real policy change
// moves it.
export function manifestDigest(body) {
  return sha256Hex(Buffer.from(canonicalize(body), "utf8"));
}

// The full manifest: the body plus its self-describing content_digest.
export function buildPolicyManifest({ root, config, pkgJson }) {
  const body = buildPolicyManifestBody({ root, config, pkgJson });
  return { ...body, content_digest: manifestDigest(body) };
}
