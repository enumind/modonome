#!/usr/bin/env node
// Decisions-authority gate. .modonome/DECISIONS.md is the one file in this repo
// that can carry an approval claim ("this was authorized") in plain prose. That
// makes it a high-value target: a change bundled into an unrelated PR can add a
// heading that reads like a governance record without ever going through the
// decision process the file exists to log.
//
// Blocking checks, always enforced, no network:
//   1. Heading whitelist: the file may only contain "## Resolved" and "## Open"
//      as H2 sections. Any other H2 ("## Administrative ... Exception" and the
//      like) is rejected outright, regardless of content.
//   2. Resolved entry shape: every entry under "## Resolved" must carry
//      id / question / decision / resolved keys. A bare id with no substance
//      is not a decision record.
//
// Blocking check, network-dependent, PR context only:
//   3. New-entry provenance. Git commit authorship (name/email) is NOT an
//      authenticated signal: anyone with push access sets it locally via
//      `git config user.email` and git will happily attribute a commit to
//      whoever they typed in. An earlier version of this gate trusted `git
//      blame` for provenance; it does not hold up, and it also could never
//      pass on this repo's own legitimate history without CODEOWNERS being
//      exactly right. Trusting local commit metadata for an authorization
//      decision is the same category of mistake this gate exists to catch
//      elsewhere.
//
//      The one signal in this repo that IS authenticated by GitHub itself is
//      a pull request review. So: every "## Resolved" entry newly added by
//      the diff under review must trace to a pull request that has at least
//      one APPROVED review from a CODEOWNERS-listed login, and that reviewer
//      must NOT be the PR's author. Self-approval never counts, regardless of
//      what CODEOWNERS says -- which also means a CODEOWNERS file with a
//      single owner can never pass this check on its own new decisions. That
//      is not a bug: a governance record that only one account can ever
//      unilaterally approve is not what this file is for. Fix CODEOWNERS.
//
//      This check only runs when new Resolved entries exist in the diff AND
//      GitHub PR context (repo, PR number, token) is available. Outside a PR
//      (local dev, a push straight to main, no new entries) it is skipped,
//      not silently passed as "authorized" -- there is nothing to authorize.
//
// Usage: node scripts/check-decisions-authority.mjs [baseRef]
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.MODONOME_ROOT ? process.env.MODONOME_ROOT : join(here, "..");

const DECISIONS_REL = ".modonome/DECISIONS.md";
const ALLOWED_HEADINGS = new Set(["Resolved", "Open"]);
const REQUIRED_RESOLVED_KEYS = ["id", "question", "decision", "resolved"];
const SAFE_REF = /^[A-Za-z0-9._/-]+$/;
const GITHUB_API_BASE = process.env.MODONOME_GITHUB_API_BASE || "https://api.github.com";

// ---------------------------------------------------------------------------
// 1 + 2: structural parsing (pure, testable, no I/O)
// ---------------------------------------------------------------------------

// Parse DECISIONS.md text into heading violations and Resolved-section entries.
export function parseDecisions(text) {
  const lines = text.split("\n");
  const violations = [];
  const resolvedEntries = []; // { id, lineNo (1-based), keys: Set }

  let section = null;
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      const title = h2[1];
      if (!ALLOWED_HEADINGS.has(title)) {
        violations.push(
          `${DECISIONS_REL}:${lineNo}: heading "## ${title}" is not permitted. ` +
            `Only "## Resolved" and "## Open" are allowed; approval-bearing prose ` +
            `outside those two sections cannot be added this way.`
        );
      }
      section = ALLOWED_HEADINGS.has(title) ? title : "unknown";
      currentEntry = null;
      continue;
    }

    const idMatch = line.match(/^-\s+id:\s*(.+?)\s*$/);
    if (idMatch && section === "Resolved") {
      currentEntry = { id: idMatch[1], lineNo, keys: new Set(["id"]) };
      resolvedEntries.push(currentEntry);
      continue;
    }
    if (idMatch && section !== "Resolved") {
      currentEntry = null;
      continue;
    }

    if (currentEntry && section === "Resolved") {
      const kv = line.match(/^\s+([a-z_]+):/);
      if (kv) currentEntry.keys.add(kv[1]);
    }
  }

  for (const entry of resolvedEntries) {
    const missing = REQUIRED_RESOLVED_KEYS.filter((k) => !entry.keys.has(k));
    if (missing.length > 0) {
      violations.push(
        `${DECISIONS_REL}:${entry.lineNo}: Resolved entry "${entry.id}" is missing required key(s): ${missing.join(", ")}.`
      );
    }
  }

  return { violations, resolvedEntries };
}

// ---------------------------------------------------------------------------
// 3: provenance (pure decision function, separate from the fetch that feeds it)
// ---------------------------------------------------------------------------

function readCodeownersUsers(rootDir) {
  const candidates = [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"];
  for (const rel of candidates) {
    const p = join(rootDir, rel);
    if (!existsSync(p)) continue;
    const users = new Set();
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const owners = t.split(/\s+/).slice(1);
      for (const o of owners) {
        const m = o.match(/^@([A-Za-z0-9-]+)$/);
        if (m) users.add(m[1].toLowerCase());
      }
    }
    return users;
  }
  return null;
}

// Given a PR's reviews (GitHub API shape: [{ user: { login }, state }]) and its
// author login, is there at least one APPROVED review from a CODEOWNERS-listed
// login that is not the author themselves? Self-approval never counts.
export function hasEligibleApproval(reviews, prAuthorLogin, codeownersUsers) {
  const author = (prAuthorLogin || "").toLowerCase();
  // A login can review more than once (dismiss + re-approve); only the latest
  // review per login should count. GitHub returns reviews in chronological
  // order, so the last entry per login wins.
  const latestByLogin = new Map();
  for (const r of reviews) {
    const login = r.user?.login?.toLowerCase();
    if (!login) continue;
    latestByLogin.set(login, r.state);
  }
  for (const [login, state] of latestByLogin) {
    if (state !== "APPROVED") continue;
    if (login === author) continue;
    if (codeownersUsers.has(login)) return true;
  }
  return false;
}

async function fetchPRReviews(repoSlug, prNumber, token) {
  const url = `${GITHUB_API_BASE}/repos/${repoSlug}/pulls/${prNumber}/reviews?per_page=100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "modonome-decisions-authority-gate",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} fetching PR #${prNumber} reviews`);
  }
  return res.json();
}

// PR number must be a bare positive integer and repo slug must be exactly
// "owner/repo": both flow straight into the fetch() URL path in
// fetchPRReviews, so anything else in this shape is rejected here rather
// than trusted, regardless of source (GITHUB_EVENT_PATH is a GitHub-Actions-
// written file, but a file is still an input, not a hardcoded value).
const PR_NUMBER_RE = /^[1-9]\d*$/;
const REPO_SLUG_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// Read the current PR's number, author login, and repo slug from GitHub Actions'
// standard environment (or from MODONOME_PR_* overrides, for tests and manual
// runs against a specific PR). Returns null when there is no PR context.
function readPRContext() {
  const repoSlug = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.MODONOME_GITHUB_TOKEN;
  let prNumber = process.env.MODONOME_PR_NUMBER;
  let prAuthor = process.env.MODONOME_PR_AUTHOR;

  if (!prNumber && process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
      if (event.pull_request) {
        prNumber = String(event.pull_request.number);
        prAuthor = event.pull_request.user?.login;
      }
    } catch {
      // Malformed or unreadable event payload: no PR context to read.
    }
  }

  if (!repoSlug || !token || !prNumber) return null;
  if (!PR_NUMBER_RE.test(prNumber) || !REPO_SLUG_RE.test(repoSlug)) return null;
  return { repoSlug, token, prNumber, prAuthor };
}

function getFileAt(ref, rootDir) {
  if (!SAFE_REF.test(ref)) throw new Error(`refusing to read from unsafe ref: ${ref}`);
  const r = spawnSync("git", ["show", `${ref}:${DECISIONS_REL}`], { cwd: rootDir, encoding: "utf8" });
  if (r.status !== 0) return null; // file did not exist at that ref
  return r.stdout;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const decisionsPath = join(root, DECISIONS_REL);
  if (!existsSync(decisionsPath)) {
    console.log(`${DECISIONS_REL} does not exist; nothing to check.`);
    return 0;
  }

  const headText = readFileSync(decisionsPath, "utf8");
  const { violations, resolvedEntries } = parseDecisions(headText);

  // New entries: ids present at HEAD's working copy but not at the base ref.
  // Nothing to authorize when there is no base to diff against (no network,
  // no git required for this part).
  const baseArg = process.argv[2];
  const base = baseArg || "origin/main";
  let newEntries = [];
  const baseText = getFileAt(base, root);
  if (baseText !== null) {
    const baseIds = new Set(parseDecisions(baseText).resolvedEntries.map((e) => e.id));
    newEntries = resolvedEntries.filter((e) => !baseIds.has(e.id));
  } else {
    // No base to compare against (e.g. shallow clone, unknown ref): every
    // current entry is unverifiable against history, but this is a local/CI
    // environment limitation, not a governance violation. Structural checks
    // (1, 2) still ran above; provenance is skipped rather than guessed at.
  }

  if (newEntries.length > 0) {
    const ctx = readPRContext();
    if (!ctx) {
      violations.push(
        `${DECISIONS_REL}: ${newEntries.length} new Resolved entr${newEntries.length === 1 ? "y" : "ies"} ` +
          `(${newEntries.map((e) => e.id).join(", ")}) added, but no PR context (repo/PR number/token) is ` +
          `available to verify who approved ${newEntries.length === 1 ? "it" : "them"}. Run this check in CI on the pull request.`
      );
    } else {
      const codeownersUsers = readCodeownersUsers(root);
      if (codeownersUsers === null) {
        violations.push("No CODEOWNERS file found; cannot verify Resolved-entry authorship.");
      } else {
        let reviews;
        try {
          reviews = await fetchPRReviews(ctx.repoSlug, ctx.prNumber, ctx.token);
        } catch (e) {
          violations.push(`${DECISIONS_REL}: could not fetch PR #${ctx.prNumber} reviews: ${e.message}`);
          reviews = null;
        }
        if (reviews) {
          const approved = hasEligibleApproval(reviews, ctx.prAuthor, codeownersUsers);
          if (!approved) {
            violations.push(
              `${DECISIONS_REL}: new Resolved entr${newEntries.length === 1 ? "y" : "ies"} ` +
                `(${newEntries.map((e) => e.id).join(", ")}) needs an APPROVED review from a CODEOWNERS-listed ` +
                `account other than the PR author (${ctx.prAuthor || "unknown"}). Self-approval does not count.`
            );
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("Decisions-authority gate rejected this change:\n");
    for (const v of violations) console.error("  - " + v);
    console.error(
      "\nDECISIONS.md records real decisions with real authority behind them. " +
        "Approval-bearing content cannot be added outside that process."
    );
    return 1;
  }
  console.log("Decisions-authority gate: headings, entry shape, and new-entry provenance all clean.");
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
