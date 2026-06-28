# Agent instructions for modonome

## Commit messages

- Commit messages contain only the change description and, when relevant, a `Fixes #N` reference.
- Keep attribution trailers, session links, and generated-by notices out of commit messages.
- Specifically: no git trailers that credit AI tools, no session URLs, no authorship signatures.

## Governed autonomy

This repo governs itself using its own engine. Before making any change:

1. Read `.modonome/STATUS.md` to see what is active and what is queued.
2. Read `.modonome/DECISIONS.md`: items marked `hold` wait for the owner's answer before they start.
3. Every change must stay within the `allowed_edit_set` of the claimed work item.
4. Run all gates listed in the work item before pushing. Push only when every gate passes.
5. Modify `scripts/`, `bin/`, `schemas/`, `templates/`, `prompts/`, or `.github/` only after confirming the item has `touches_protected_path: true` and that a CODEOWNER review is required before merge.

## Style

The project runs `node scripts/check-style.mjs .` on every PR. It rejects em dashes,
weasel phrases, and AI authorship signatures in any tracked file. Write plainly.
See `scripts/check-style.mjs` for the exact list of banned patterns.

## Documentation

Documentation placement, naming, coherence, and cleanup follow
`docs/guidelines/markdown-governance.md` (ADR-031). Before adding, moving, or deleting a
Markdown file, read that policy and run `node scripts/check-md-governance.mjs`. Markdown
deletion is deny-by-default: it requires an owner-approved work item and a `DECISIONS.md`
entry. Keep each topic to one source of truth and cross-link rather than copy.

## Guardrails

- Stay within the `allowed_edit_set` the work item specifies.
- Leave the `.modonome/config.yaml` arming levers (`autonomy_enabled`, `auto_merge`) unchanged.
- Merge only PRs authored by someone else.
- Fix the root cause behind a failing gate, and keep gates and assertions intact.
