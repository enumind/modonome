# Agent instructions for modonome

## Commit messages

- Commit messages contain only the change description and, when relevant, a `Fixes #N` reference.
- Do not add attribution trailers, session links, or generated-by notices of any kind.
- Specifically: no git trailers that credit AI tools, no session URLs, no authorship signatures.

## Governed autonomy

This repo governs itself using its own engine. Before making any change:

1. Read `.modonome/STATUS.md` to see what is active and what is queued.
2. Read `.modonome/DECISIONS.md`: items marked `hold` cannot be started until the owner answers.
3. Every change must stay within the `allowed_edit_set` of the claimed work item.
4. Run all gates listed in the work item before pushing. Do not push if any gate fails.
5. Do not modify `scripts/`, `bin/`, `schemas/`, `templates/`, `prompts/`, or `.github/` without confirming the item has `touches_protected_path: true` and that you understand a CODEOWNER review is required before merge.

## Style

The project runs `node scripts/check-style.mjs .` on every PR. It rejects em dashes,
weasel phrases, and AI authorship signatures in any tracked file. Write plainly.
See `scripts/check-style.mjs` for the exact list of banned patterns.

## What not to do

- Do not widen `allowed_edit_set` beyond what the work item specifies.
- Do not modify `.modonome/config.yaml` arming levers (`autonomy_enabled`, `auto_merge`).
- Do not merge your own PRs.
- Do not skip failing gates or add workarounds to make a gate pass without fixing the root cause.
