/**
 * git-scope.mjs
 *
 * Shared, read-only git accessors for the hygiene surfaces: the current branch and
 * the commits unique to this branch (with identity fields and full body). Both the
 * strict hygiene CLI (scripts/hygiene.mjs) and the advisory near-miss scanner
 * (scripts/detect-near-miss.mjs) gather the same thing, so the git shelling lives in
 * one place. No mutation, no network.
 */

import { spawnSync } from "node:child_process";

export function git(args, opts = {}) {
  const res = spawnSync("git", args, { encoding: "utf8", ...opts });
  return { status: res.status ?? 1, out: (res.stdout || "").trim(), err: (res.stderr || "").trim() };
}

export function currentBranch() {
  const r = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  return r.status === 0 ? r.out : "";
}

/**
 * The commit range unique to this branch: origin/main..HEAD, falling back to the
 * last 20 commits when origin/main is not available (a fresh clone or local repo).
 */
export function defaultRange() {
  if (git(["rev-parse", "--verify", "--quiet", "origin/main"]).status !== 0) return "HEAD~20..HEAD";
  return "origin/main..HEAD";
}

/**
 * Commits in `range` as structured records: { an, ae, cn, ce, sha, body }. Returns
 * the raw tab-delimited identity table too (the shape commit-identity.mjs parses).
 * Bodies are fetched one commit at a time because a body can contain tabs and
 * newlines that would corrupt a single combined --format.
 */
export function commitsInRange(range = defaultRange()) {
  const commits = [];
  const log = git(["log", range, "--no-merges", "--format=%an%x09%ae%x09%cn%x09%ce%x09%h"]);
  if (log.status !== 0 || !log.out) return { logOutput: "", commits };
  for (const line of log.out.split("\n").filter(Boolean)) {
    const [an, ae, cn, ce, sha] = line.split("\t");
    const body = git(["log", "-1", "--format=%B", sha]);
    commits.push({ an, ae, cn, ce, sha, body: body.out });
  }
  return { logOutput: log.out, commits };
}
