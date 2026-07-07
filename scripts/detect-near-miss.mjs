#!/usr/bin/env node
/**
 * detect-near-miss.mjs
 *
 * Advisory scanner for the near-miss widener (Phase 1). It reads the current branch
 * and the commits unique to this branch, runs the deterministic widener
 * (scripts/lib/near-miss.mjs), and prints any near-miss attribution token together
 * with the exact LESSONS.md Staged line a human could paste to propose a denylist
 * addition.
 *
 * It is advisory by construction:
 *   - Finding a near-miss ALWAYS exits 0. This never blocks CI. It surfaces a
 *     proposal for human review; promotion into the live denylist stays human-only,
 *     gated by check-attribution-fp-corpus.mjs and check-regex-safety.mjs.
 *   - A genuine tool error (a malformed LESSONS.md, or a full Staged section on
 *     --write) exits 1, because that is a real failure the operator must act on.
 *
 * Usage:
 *   node scripts/detect-near-miss.mjs           print near-miss proposals; exit 0
 *   node scripts/detect-near-miss.mjs --write    also append each proposal to the
 *                                                LESSONS.md Staged section (capped)
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { currentBranch, commitsInRange } from "./lib/git-scope.mjs";
import {
  matchNearMissBranch,
  matchNearMissIdentity,
  matchNearMissText,
  formatStagedLine,
} from "./lib/near-miss.mjs";
import { appendStagedEntry } from "./lib/learnings.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Gather every near-miss across the branch name, commit identities, and commit
// bodies unique to this branch.
export function collectNearMisses({ branch, commits }) {
  const findings = [];
  if (branch && branch !== "HEAD") {
    const f = matchNearMissBranch(branch);
    if (f) findings.push(f);
  }
  for (const c of commits) {
    const author = matchNearMissIdentity(c.an, c.ae);
    if (author) findings.push({ ...author, where: `${c.sha} author ${author.where}` });
    // Skip the committer when it is the same identity as the author (the usual case).
    if (c.cn !== c.an || c.ce !== c.ae) {
      const committer = matchNearMissIdentity(c.cn, c.ce);
      if (committer) findings.push({ ...committer, where: `${c.sha} committer ${committer.where}` });
    }
    findings.push(...matchNearMissText(c.sha, c.body));
  }
  return findings;
}

// A denylist proposal is per unique (tier, surface, token): the widener proposes
// adding a token, not fixing N occurrences. Keep the first occurrence as evidence.
export function proposalsFrom(findings) {
  const byKey = new Map();
  for (const f of findings) {
    const key = `${f.tier}:${f.surface}:${f.token}`;
    if (!byKey.has(key)) byKey.set(key, f);
  }
  return [...byKey.values()];
}

function main(argv) {
  const write = argv.includes("--write");
  const branch = currentBranch();
  const { commits } = commitsInRange();
  const proposals = proposalsFrom(collectNearMisses({ branch, commits }));

  if (proposals.length === 0) {
    console.log("No near-miss attribution tokens found. Nothing to propose.");
    process.exit(0);
  }

  console.log(formatMessage("advisory.near-miss.findings-summary", { count: proposals.length }, overrides).message);

  const date = today();
  let wrote = 0;
  for (const p of proposals) {
    const line = formatStagedLine(p, { date, evidence: `${p.surface} near-miss at ${p.where}` });
    console.log(formatMessage("advisory.near-miss.finding-line", { tier: p.tier, surface: p.surface, token: p.token, where: p.where }, overrides).message);
    console.log(formatMessage("advisory.near-miss.staged-proposal-line", { line }, overrides).message);
    if (write) {
      try {
        const res = appendStagedEntry(root, line);
        if (res.added) {
          wrote++;
          console.log("    written to .modonome/LESSONS.md Staged section.");
        } else {
          console.log(`    already staged (${res.reason}); left unchanged.`);
        }
      } catch (e) {
        // A full or malformed Staged section is a real error on --write.
        console.error(formatMessage("advisory.near-miss.write-failed", { reason: e.message }, overrides).message);
        process.exit(1);
      }
    }
    console.log("");
  }

  if (write) console.log(`Appended ${wrote} new staged proposal(s).`);
  else console.log("Re-run with --write to append these proposals to the Staged section.");
  // Advisory: finding near-misses never fails the run.
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
