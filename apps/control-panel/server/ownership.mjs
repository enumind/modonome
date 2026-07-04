// Decides whether the operator running the panel is a code owner of this repo, used
// to gate "self-governance" writes: changes to the panel repo's OWN .modonome, above
// all its autonomy levers. Evolving a connected host repo needs only the write flag;
// changing how modonome governs itself is reserved to a code owner, so a cloner
// cannot turn autonomy on the tool itself by accident.
//
// This is a local guardrail, not a cryptographic boundary. Whoever launches the dev
// server controls the machine and could set any git identity; the unbreakable arming
// boundary stays the MODONOME_ARMED CI secret, which the panel can never set. The gate
// here makes self-governance edits deliberate and owner-scoped, nothing more.
//
// Deps are injectable so the decision is unit-testable without touching real git or
// the real filesystem.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const CODEOWNERS_CANDIDATES = [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"];

// Parse CODEOWNERS "pattern @owner @owner" lines into ordered rules. Comments and
// blank lines are dropped; each owner handle is lowercased with its leading @ removed
// so it compares directly to a handle extracted from a git email.
export function parseCodeowners(text) {
  const rules = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [pattern, ...owners] = line.split(/\s+/);
    if (!pattern || owners.length === 0) continue;
    rules.push({ pattern, owners: owners.map((o) => o.replace(/^@/, "").toLowerCase()) });
  }
  return rules;
}

// GitHub CODEOWNERS is last-match-wins: the owners of the LAST rule whose pattern
// matches the path. Supports the common subset modonome's own CODEOWNERS uses (a "*"
// catchall and rooted dir/file prefixes), not the full gitignore glob grammar, which
// is all that .modonome/config.yaml needs to resolve correctly.
export function ownersForPath(rules, path) {
  let owners = [];
  for (const rule of rules) {
    if (matchesPattern(rule.pattern, path)) owners = rule.owners;
  }
  return owners;
}

function matchesPattern(pattern, path) {
  if (pattern === "*") return true;
  const p = pattern.replace(/^\//, "");
  if (p.endsWith("/")) return path === p.slice(0, -1) || path.startsWith(p) || path.includes("/" + p);
  return path === p || path.startsWith(p + "/") || path.endsWith("/" + p);
}

// Extract a GitHub handle from a commit email. Only the two GitHub noreply formats
// carry a handle deterministically; any other address returns null (fail closed), so
// an unmapped identity is treated as not-an-owner rather than guessed at. Modonome's
// own arming checklist already requires the noreply identity for agent commits, so an
// owner working under it resolves cleanly.
export function handleFromEmail(email) {
  if (!email) return null;
  let m = /^\d+\+([^@]+)@users\.noreply\.github\.com$/i.exec(email);
  if (m) return m[1].toLowerCase();
  m = /^([^@]+)@users\.noreply\.github\.com$/i.exec(email);
  if (m) return m[1].toLowerCase();
  return null;
}

function localGitEmail(repoRoot, exec) {
  try {
    return exec("git", ["config", "user.email"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function pickCodeowners(repoRoot, exists) {
  for (const rel of CODEOWNERS_CANDIDATES) {
    const p = join(repoRoot, rel);
    if (exists(p)) return p;
  }
  return null;
}

/**
 * Decide whether the local git identity is a code owner of the config at
 * configRelPath within repoRoot. Fail-closed everywhere it cannot prove ownership:
 * no CODEOWNERS file, no owner declared for the path, an identity that is not a
 * GitHub noreply address, or a handle not in the owner set all return owner: false.
 *
 * @returns {{ owner: boolean, handle?: string|null, owners?: string[], reason: string }}
 */
export function selfGovernanceOwnership(
  repoRoot,
  { configRelPath = ".modonome/config.yaml", exec = execFileSync, readFile = readFileSync, exists = existsSync } = {},
) {
  const codeownersPath = pickCodeowners(repoRoot, exists);
  if (!codeownersPath) {
    return { owner: false, reason: "no CODEOWNERS file defines any code owner for this repository" };
  }
  const owners = ownersForPath(parseCodeowners(readFile(codeownersPath, "utf8")), configRelPath);
  if (owners.length === 0) {
    return { owner: false, owners, reason: `CODEOWNERS declares no owner for ${configRelPath}` };
  }
  const handle = handleFromEmail(localGitEmail(repoRoot, exec));
  if (!handle) {
    return {
      owner: false,
      handle: null,
      owners,
      reason: "the local git identity is not a GitHub noreply address, so it cannot be matched to a code owner",
    };
  }
  const owner = owners.includes(handle);
  return {
    owner,
    handle,
    owners,
    reason: owner ? "" : `git identity "${handle}" is not a code owner (${owners.join(", ")})`,
  };
}
