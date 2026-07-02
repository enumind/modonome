/**
 * attribution-fp-corpus.mjs
 *
 * The false-positive regression corpus for attribution detection. Every entry is a
 * known-good input that the deterministic detectors AND the near-miss widener must
 * leave alone. It exists so a promotion into the live denylist cannot silently start
 * flagging legitimate names, branches, or prose. scripts/check-attribution-fp-corpus.mjs
 * runs each entry through both layers and fails if any is flagged.
 *
 * The corpus is a pure data module: no I/O, no imports. It encodes the specific
 * lessons Phase 0 and its design review surfaced, each with a comment naming the
 * trap it guards against.
 */

// Branch names no layer may flag. These include descriptive names that merely
// contain a denylisted token as a substring of a longer word.
export const SAFE_BRANCH_NAMES = [
  "governance/attribution-near-miss", // this very feature's branch
  "governance/pr-body-hygiene",
  "feature/ai-adapter", // "ai-adapter" is a segment, not the token "ai" (Phase 0 tested)
  "policy/ai-participation-governance",
  "fix/config-schema",
  "docs/embedding-guide",
  "release/maintain-domain", // "ai" is a substring of "maintain"/"domain": must not fire
  "chore/deps",
  "feature/grokking-the-ratchet", // "grok" is a substring of "grokking": Tier-2 is exact-segment
  "docs/assistants-overview", // "assistants" != the exact segment "assistant"
  "feature/coherence-refactor", // "cohere" is a substring of "coherence": must not fire
];

// Commit identities no layer may flag. dependabot is ordinary automation, allowed.
export const SAFE_IDENTITIES = [
  { name: "nateshpp", email: "107772539+nateshpp@users.noreply.github.com" },
  { name: "dependabot[bot]", email: "49699333+dependabot[bot]@users.noreply.github.com" },
  { name: "Jane Doe", email: "jane@example.com" },
  // The canonical regression: a human surname containing "bott" must never trip a
  // future careless "bot" substring rule. Guards against a naive .includes("bot").
  { name: "Robin Bott", email: "robin.bott@example.com" },
  // "Coherently" contains "cohere"; Tier-2 matches only an exact name word.
  { name: "Sam Coherently", email: "sam@example.com" },
];

// Free-text snippets (PR-body/commit-body shaped) no layer may flag. These exercise
// the ordinary-English and in-repo-vocabulary collisions that bare-word or substring
// matching would trip on.
export const SAFE_TEXT_SNIPPETS = [
  "She is an assistant professor of constitutional law", // job title, not a model
  "Once you grok this pattern, the ratchet is obvious", // slang for "understand"
  "The argument does not cohere across the two sections", // ordinary verb
  "This design is incoherent and needs another pass", // substring of "cohere"
  "Update the Claude adapter configuration for the new endpoint", // legit vendor mention, no attribution cue
  "See CODEX.md for the Codex agent instructions", // this repo's own file and a supported agent
  "We generated the release report from the metrics ledger", // attribution cue but no vendor token
  "The assistant generated a one-paragraph summary", // cue + a Tier-2 word, but not a free-text vendor token
];

// Inputs the STRICT detector intentionally flags today. This is a documented,
// deliberate over-block, not a false positive: the corpus locks the current
// behavior so any future change to it is a conscious decision, surfaced in review,
// rather than a silent drift. "ai/telemetry" is rejected because "ai" is an exact
// leading segment; a team wanting it must add an allowlist entry, not weaken the
// token. check-attribution-fp-corpus.mjs asserts these are STILL flagged by strict.
export const DOCUMENTED_STRICT_OVERBLOCKS = [
  {
    branch: "ai/telemetry",
    reason: '"ai" is an exact leading branch segment; the strict gate rejects it by design (Phase 0).',
  },
];
