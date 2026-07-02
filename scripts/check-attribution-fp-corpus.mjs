#!/usr/bin/env node
/**
 * check-attribution-fp-corpus.mjs
 *
 * The false-positive regression gate for the attribution promotion path. It runs
 * every known-good input in scripts/lib/attribution-fp-corpus.mjs through BOTH the
 * strict detectors and the near-miss widener, and fails if any legitimate name,
 * branch, or prose snippet is flagged. A promotion that over-broadens a denylist
 * pattern (the classic "bot" -> flags "Robin Bott" trap) is caught here before it
 * can reach the live gate.
 *
 * It reads the detector modules from disk, so on a PR it must run BEFORE ci.yml's
 * base-branch checkout: the point is to judge THIS branch's proposed detector
 * changes, not the base copy the checkout would restore. It is a review aid for a
 * change that is CODEOWNER-reviewed regardless, not an autonomous trust boundary.
 *
 * Usage: node scripts/check-attribution-fp-corpus.mjs
 */

import { branchHasModelSegment, isForbiddenIdentity, AI_SIGNATURE_RE } from "./lib/detect-attribution.mjs";
import { matchNearMissBranch, matchNearMissIdentity, matchNearMissText } from "./lib/near-miss.mjs";
import {
  SAFE_BRANCH_NAMES,
  SAFE_IDENTITIES,
  SAFE_TEXT_SNIPPETS,
  DOCUMENTED_STRICT_OVERBLOCKS,
} from "./lib/attribution-fp-corpus.mjs";

/**
 * Run the corpus through the two layers. The detector predicates are injected so the
 * gate's own logic is testable with a deliberately over-broad matcher (proving it
 * would catch a bad promotion). Each predicate returns truthy when it flags.
 */
export function corpusProblems({ strictBranch, fuzzyBranch, strictId, fuzzyId, strictText, fuzzyText }) {
  const problems = [];

  for (const name of SAFE_BRANCH_NAMES) {
    if (strictBranch(name)) problems.push(`strict detector flags safe branch "${name}".`);
    if (fuzzyBranch(name)) problems.push(`near-miss widener flags safe branch "${name}".`);
  }

  for (const { name, email } of SAFE_IDENTITIES) {
    const who = `${name} <${email}>`;
    if (strictId(name, email)) problems.push(`strict detector flags safe identity "${who}".`);
    if (fuzzyId(name, email)) problems.push(`near-miss widener flags safe identity "${who}".`);
  }

  for (const snippet of SAFE_TEXT_SNIPPETS) {
    if (strictText(snippet)) problems.push(`strict detector flags safe text: "${snippet}".`);
    if (fuzzyText(snippet)) problems.push(`near-miss widener flags safe text: "${snippet}".`);
  }

  // Documented over-blocks must STILL be flagged by strict. If one stops being
  // flagged, a known trade-off changed silently; surface it for a deliberate review.
  for (const { branch, reason } of DOCUMENTED_STRICT_OVERBLOCKS) {
    if (!strictBranch(branch)) {
      problems.push(
        `documented over-block "${branch}" is no longer flagged by the strict detector. ` +
          `This known trade-off changed (${reason}). Update the corpus deliberately if intended.`,
      );
    }
  }

  return problems;
}

// The real detectors, wired to the injectable checker.
export const LIVE_DETECTORS = {
  strictBranch: (name) => branchHasModelSegment(name),
  fuzzyBranch: (name) => Boolean(matchNearMissBranch(name)),
  strictId: (name, email) => isForbiddenIdentity(name, email),
  fuzzyId: (name, email) => Boolean(matchNearMissIdentity(name, email)),
  strictText: (text) => AI_SIGNATURE_RE.test(text),
  fuzzyText: (text) => matchNearMissText("corpus", text).length > 0,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = corpusProblems(LIVE_DETECTORS);
  console.log("Attribution false-positive corpus");
  console.log("=================================");
  if (problems.length === 0) {
    console.log(
      `PASS: ${SAFE_BRANCH_NAMES.length} branches, ${SAFE_IDENTITIES.length} identities, ` +
        `${SAFE_TEXT_SNIPPETS.length} text snippets stay clean under both layers.`,
    );
    process.exit(0);
  }
  console.error(`FAIL: ${problems.length} false-positive regression(s):\n`);
  for (const p of problems) console.error("  - " + p);
  console.error("\nA promotion must not flag legitimate input. Narrow the pattern or add an allowlist entry.");
  process.exit(1);
}
