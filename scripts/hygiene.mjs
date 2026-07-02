#!/usr/bin/env node
/**
 * hygiene.mjs
 *
 * Zero-infrastructure local surface for Governed Remediation's attribution pack.
 * Wraps the deterministic detector (scripts/lib/detect-attribution.mjs) so a
 * developer with no CI can find and fix AI-participation signatures from the CLI:
 *
 *   modonome hygiene check   [dir]   list findings + the precomputed remedy, exit 1 if any
 *   modonome hygiene explain [dir]   same, with the pattern and reason for each finding
 *   modonome hygiene fix     [dir]   apply the safe, local, metadata-only remedy (branch rename)
 *
 * `fix` performs only reversible, metadata-only operations: it renames the current
 * branch to the suggested compliant name. A branch rename changes no file, so the
 * git tree SHA is unchanged by construction. Commit-message and comment remedies are
 * printed as exact commands rather than applied, because rewriting history is a
 * destructive operation reserved for the armed, gated remediator (later phase).
 */

import { spawnSync } from "node:child_process";
import {
  detectBranch,
  detectCommits,
  detectText,
  formatRemedy,
} from "./lib/detect-attribution.mjs";

function git(args, opts = {}) {
  const res = spawnSync("git", args, { encoding: "utf8", ...opts });
  return { status: res.status ?? 1, out: (res.stdout || "").trim(), err: (res.stderr || "").trim() };
}

function currentBranch() {
  const r = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  return r.status === 0 ? r.out : "";
}

// Collect findings for the current branch, the commits unique to it, and the
// PR-body-shaped surfaces we can see locally (the commit bodies themselves).
function collectFindings() {
  const findings = [];

  const branch = currentBranch();
  if (branch && branch !== "HEAD") {
    const f = detectBranch(branch);
    if (f) findings.push(f);
  }

  // Commits unique to this branch relative to origin/main (fall back to last commit).
  let range = "origin/main..HEAD";
  if (git(["rev-parse", "--verify", "--quiet", "origin/main"]).status !== 0) range = "HEAD~20..HEAD";
  const log = git(["log", range, "--no-merges", "--format=%an%x09%ae%x09%cn%x09%ce%x09%h"]);
  const shas = git(["log", range, "--no-merges", "--format=%h"]);
  const bodies = [];
  if (shas.status === 0 && shas.out) {
    for (const sha of shas.out.split("\n").filter(Boolean)) {
      const body = git(["log", "-1", "--format=%B", sha]);
      bodies.push({ sha, body: body.out });
    }
  }
  if (log.status === 0) findings.push(...detectCommits(log.out, bodies));

  return { branch, findings };
}

function applyFix(branch, findings) {
  const applied = [];
  const remaining = [];
  for (const f of findings) {
    if (f.remedy.action === "rename-branch" && f.kind === "branch") {
      const target = f.remedy.suggestion;
      const rename = git(["branch", "-m", target]);
      if (rename.status === 0) {
        applied.push(`renamed branch ${branch} -> ${target} (tree unchanged)`);
      } else {
        remaining.push(`could not rename branch: ${rename.err}`);
      }
    } else {
      remaining.push(`[${f.kind}] ${f.where}: ${f.remedy.suggestion}`);
    }
  }
  return { applied, remaining };
}

function main(argv) {
  const [sub = "check", ...rest] = argv;
  // dir arg is accepted for symmetry with other commands; detection is git-based
  // and operates on the current repo, so the dir is advisory today.
  void rest;

  const { branch, findings } = collectFindings();

  if (sub === "check" || sub === "explain") {
    if (!findings.length) {
      console.log("Hygiene check passed. No AI-participation signatures found.");
      process.exit(0);
    }
    console.error(formatRemedy(findings));
    if (sub === "explain") {
      console.error("Why: these signatures put model or tool identity into the branch,");
      console.error("commit history, or review record. The author graph should reflect human");
      console.error("ownership; run `modonome hygiene fix` to apply the safe local remedy.");
    }
    process.exit(1);
  }

  if (sub === "fix") {
    if (!findings.length) {
      console.log("Nothing to fix. No AI-participation signatures found.");
      process.exit(0);
    }
    const { applied, remaining } = applyFix(branch, findings);
    for (const a of applied) console.log("fixed:  " + a);
    if (remaining.length) {
      console.log("");
      console.log("Remaining (apply manually; history rewrites are not auto-applied):");
      for (const r of remaining) console.log("  - " + r);
      process.exit(1);
    }
    console.log("All findings resolved by safe, metadata-only fixes.");
    process.exit(0);
  }

  console.error(`Unknown hygiene subcommand: ${sub}. Use check | explain | fix.`);
  process.exit(2);
}

main(process.argv.slice(2));
