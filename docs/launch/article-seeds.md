# Article seeds

Not full drafts. Enough structure and evidence links to write from without inventing claims
mid-draft. Follow the existing `site/articles/` tone (see `stop-ai-agents-gaming-tests/`):
plain, confident, cited, no hype adjectives.

## 1. Cross-post: the Goodhart angle, updated with real demo evidence

The existing article (`site/articles/stop-ai-agents-gaming-tests/index.html`) makes the
Goodhart's Law argument well but predates the real gate-rejection evidence. A dev.to/blog
cross-post update should:

- Open the same way: Goodhart 1975, Strathern 1997, Amodei 2016, Krakovna 2020, the century-old
  warning showing up in CI.
- Replace any abstract example with the real captured one:
  `examples/demo-app/runs/2026-07-08T05-30-00Z/` (a gaming diff rejected, exit 1, SARIF rule
  codes MR101/MR102; the honest fix for the same debt passing the identical gate, exit 0).
- Close with the "what it cannot catch" honesty section from the README, framed as the piece's
  thesis payoff: a measure a tool cannot fully protect is exactly the case Goodhart's Law
  predicts, so the tool says so instead of overclaiming, and adds a second layer (the
  independent checker) rather than pretending pattern-matching solves a measurement problem.

## 2. New: we benchmark our AI code reviewer with planted bugs

Write only once CheckerProof exists and has run (see OWNER-ACTIONS.md; this is explicitly
post-launch, not a launch-week piece). Structure to have ready:

- Thesis: everyone benchmarks the coding agent. Almost no one benchmarks the reviewer that is
  supposed to catch what the coding agent gets wrong. The reviewer's catch rate is the actual
  safety property that matters once a deterministic gate has already screened out the
  structural attacks.
- Method: a seeded-defect corpus of maker diffs with planted semantic weakenings (expected-value
  drift, cross-file assertion migration, vacuous-in-spirit assertions), the same categories
  named in the hardened `prompts/roles/checker.txt` rubric. Report catch rate honestly. It will
  not be 25/25, and that is the credibility, not the embarrassment.
- Payoff: pair this with the README's "what it catches, and what it cannot" section. The
  deterministic gate has a provable, machine-verified score (AgentProof). The independent
  checker's score is measured, not assumed. No other project in this space publishes both.

## 3. New (smaller, launch-week candidate): the trust boundary, explained in one diagram

A short, focused piece (or just the README section promoted): the single idea that a PR cannot
weaken the gate that judges it because the gate code loads from a pinned base-branch copy. Good
for a standalone share (a single diagram plus 300 words travels better on its own than buried in
a longer piece). Anchor on `ARCHITECTURE.md`'s "Host vs. self" section and the mermaid diagram
in the README's "How the trust boundary works" section for the visual.

## Rule for all of these, same as the Show HN draft

Every factual claim links to a committed evidence file or a specific script/test. If a draft
needs a claim the repo cannot back up yet, that claim is cut or the article waits.
