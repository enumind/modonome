---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-04
canonical: [lexicon]
---

# Lexicon

This repository has one preferred term per concept. The list lives in `lexicon.json`
(machine-readable, terms only) and `scripts/check-style.mjs` fails CI when a banned term
appears in shipped text, the same way it already fails on an em dash or an AI authorship
signature.

The point is not taste. Naming drift compounds: a repo that calls the same thing "work
packet" in one file and "work item" in another teaches a reader (human or agent) that the
two might be different things. A lexicon gate that governs its own language is a small,
self-applying proof that the discipline the product asks of adopters, the product also
holds itself to.

| Banned | Preferred | Why |
|---|---|---|
| work packet | work item | Ends a real drift the repo used to exhibit between `scripts/queue.mjs` and its own prompts. |
| Modonome Autonomy | Modonome Loop | Pairs with Modonome Guard as the two-product brand spine. |
| anti-gaming ratchet (buyer-facing) | gate integrity check | Grandfathered (see below): the phrase is used across fixtures, tests, and site copy too widely to migrate as a side effect of shipping this gate. The check name itself (`modonome/gate-integrity`) already carries the rename. |
| levers | controls | Grandfathered (see below): the code-level rename (`coreLevers()` and friends) hasn't landed yet. |

## Adding a term

Add an entry to `lexicon.json` (`banned`, `preferred`, `note`). `scripts/check-style.mjs`
picks it up automatically; no code change is needed. Mark a term `"grandfathered": true`
only when the rename is approved but not yet applied everywhere, the same "advisory during
the migration window" pattern `scripts/check-md-governance.mjs` already uses for its own
front-matter rollout. A grandfathered term still surfaces as a warning; it does not fail
the build until the term is fully migrated and the flag is removed.
