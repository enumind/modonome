/**
 * near-miss.mjs
 *
 * The deterministic near-miss widener for Governed Remediation (Phase 1). It is a
 * pure library (no I/O, no network, no clock) that flags attribution tokens the
 * STRICT detectors miss: separator/spelling variants of a denylisted token
 * ("claude-code", "claude_code", "claudecode") and vendor/product names not yet in
 * the denylist at all ("mistral", "grok").
 *
 * This module can only ever PROPOSE. It feeds a LESSONS.md Staged line for human
 * review; it never mutates a denylist and never blocks CI. To make "fuzzy can only
 * tighten, never override" a checked property, the strict detectors
 * (branch-name.mjs, commit-identity.mjs, detect-attribution.mjs) must never import
 * this file. That invariant is enforced by scripts/check-gate-dag.mjs. The reverse
 * direction is required and safe: this module imports the strict predicates so it
 * can SUPPRESS any finding the strict gate already catches (a near-miss is, by
 * definition, only what the strict gate misses).
 *
 * Precision is split into tiers so the widener does not reproduce the very
 * false-positive lessons Phase 0 documented. scripts/check-attribution-fp-corpus.mjs
 * holds the regression corpus every token here is screened against.
 */

import {
  branchHasModelSegment,
  isForbiddenIdentity,
  AI_SIGNATURE_RE,
} from "./detect-attribution.mjs";

// Tier 1: distinctive vendor/product tokens with no ordinary-English or in-repo
// collision, so separator-normalized SUBSTRING matching on branch names and
// identities is safe. The existing strict tokens are included so their separator
// variants ("claude-code") are caught; new vendors extend the vocabulary.
export const TIER1_TOKENS = [
  "claude",
  "anthropic",
  "openai",
  "copilot",
  "gemini",
  "gpt",
  "mistral",
  "deepseek",
  "qwen",
];

// Tier 2: generic or ambiguous words that would explode with false positives under
// substring or free-text matching ("assistant professor", "once you grok this",
// "the argument doesn't cohere"). Matched ONLY as an exact branch segment or an
// exact identity-name word, and NEVER in free text. This mirrors the discipline the
// shipped strict detector already uses (bare "ai"/"bot" are exact-segment only).
export const TIER2_TOKENS = ["assistant", "grok", "cohere"];

// Free text (commit bodies, PR text) is the noisiest surface: this repo legitimately
// names "claude"/"gpt" in prose, and "grok"/"cohere" are ordinary words there. So
// free-text scanning is limited to the distinctive NEW vendor tokens as whole words
// only. Known vendor phrases are already the strict AI_SIGNATURE_RE's job; the
// widener's free-text value is surfacing a vendor the denylist does not yet know.
export const TEXT_TOKENS = ["mistral", "deepseek", "qwen"];

// Defensive length cap before any matching, since branch names and commit bodies are
// attacker/agent-controlled input (no unbounded work on hostile input).
const MAX_INPUT = 4096;

function clamp(s) {
  return typeof s === "string" ? s.slice(0, MAX_INPUT) : "";
}

/**
 * Lowercase and strip separators (`/ - _ .` and whitespace) so "claude-code",
 * "claude_code", and "Claude Code" all normalize to a form containing "claudecode".
 * Used for Tier-1 substring matching on branch names and identities.
 */
export function normalizeForMatch(s) {
  return clamp(s).toLowerCase().replace(/[/\-_.\s]+/g, "");
}

// Split a branch name or identity into its bare word segments for exact Tier-2
// matching: "feature/grok-adapter" -> ["feature", "grok", "adapter"].
function segments(s) {
  return clamp(s)
    .toLowerCase()
    .split(/[/\-_.\s]+/)
    .filter(Boolean);
}

function tier1Hit(normalized) {
  return TIER1_TOKENS.find((t) => normalized.includes(t)) || null;
}

function tier2Hit(segs) {
  return TIER2_TOKENS.find((t) => segs.includes(t)) || null;
}

/**
 * Near-miss on a branch name. Returns a finding, or null when clean or when the
 * strict segment check already catches it (so the widener never duplicates strict).
 */
export function matchNearMissBranch(name) {
  if (!name || typeof name !== "string") return null;
  if (branchHasModelSegment(name)) return null; // strict already catches it
  const t1 = tier1Hit(normalizeForMatch(name));
  if (t1) return { tier: 1, surface: "branch", token: t1, where: name, matched: name };
  const t2 = tier2Hit(segments(name));
  if (t2) return { tier: 2, surface: "branch", token: t2, where: name, matched: name };
  return null;
}

/**
 * Near-miss on a commit author/committer identity. Checks the name (Tier 1 substring
 * and Tier 2 exact word) and the email (Tier 1 substring, catching vendor domains
 * such as "@mistral.ai"). Returns null when clean or already strict-caught.
 */
export function matchNearMissIdentity(name, email) {
  if (isForbiddenIdentity(name, email)) return null; // strict already catches it
  const nameNorm = normalizeForMatch(name);
  const emailNorm = clamp(email).toLowerCase().replace(/[\s]+/g, "");
  const t1 = tier1Hit(nameNorm) || tier1Hit(emailNorm);
  if (t1) {
    return { tier: 1, surface: "identity", token: t1, where: `${name || ""} <${email || ""}>`, matched: `${name || ""} <${email || ""}>` };
  }
  const t2 = tier2Hit(segments(name));
  if (t2) {
    return { tier: 2, surface: "identity", token: t2, where: `${name || ""} <${email || ""}>`, matched: `${name || ""} <${email || ""}>` };
  }
  return null;
}

// An attribution cue: a word that signals a line is crediting authorship rather than
// merely mentioning a vendor. Requiring a cue keeps the widener from firing on
// ordinary prose that names a model ("we evaluated mistral for the adapter").
const ATTRIBUTION_CUE_RE =
  /\b(generated|authored|coauthored|assisted|written|created|powered|signed|committed)\b/i;

/**
 * Near-miss on free text, scanned line by line. A line is a candidate only when it
 * both names a distinctive new-vendor TEXT_TOKEN (as a whole word) AND carries an
 * attribution cue, and the strict AI_SIGNATURE_RE does not already catch it.
 * Separators are normalized to spaces first, so "Co_Authored_By: Mistral" and
 * "mistral-ai" tokenize. Returns one finding per matching line.
 */
export function matchNearMissText(where, text) {
  const findings = [];
  const lines = clamp(text).split("\n");
  const tokenRe = new RegExp(`\\b(${TEXT_TOKENS.join("|")})\\b`, "i");
  lines.forEach((line, i) => {
    if (AI_SIGNATURE_RE.test(line)) return; // strict already catches it
    const norm = line.replace(/[-_.]+/g, " ");
    const m = norm.match(tokenRe);
    if (m && ATTRIBUTION_CUE_RE.test(norm)) {
      findings.push({
        tier: 1,
        surface: "text",
        token: m[1].toLowerCase(),
        where: `${where}:${i + 1}`,
        matched: line.trim().slice(0, 200),
      });
    }
  });
  return findings;
}

/**
 * Render one LESSONS.md Staged line from a finding. The line is a PROPOSED denylist
 * addition for human review, never an applied change. The (signal: review) tag marks
 * it as a review-surfaced candidate; the caller supplies the date and the evidence
 * reference. The lesson deliberately omits the " - evidence: " delimiter so the line
 * parses back cleanly.
 */
export function formatStagedLine(finding, { date, evidence }) {
  const lesson =
    `Near-miss attribution token "${finding.token}" (tier ${finding.tier}, ${finding.surface}) ` +
    `is not in the deterministic denylist; consider promotion after the false-positive ` +
    `corpus and regex-safety gates pass`;
  return `- [${date}] (signal: review) ${lesson} - evidence: ${evidence}`;
}
