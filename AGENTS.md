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

## Repo snapshot

For fast context, read `.modonome/snapshot/map.md` before reading source files. It lists
modules, public API signatures, import edges, and an attention ranking. Check
`.modonome/snapshot/signature.json`: if `merkle_root` matches your last read, the repo has
not changed. Cite the `F:` and `S:` anchors and open only the file and line you need. After
changing files, run `node scripts/snapshot.mjs .` to refresh the snapshot.

## Style

The project runs `node scripts/check-style.mjs .` on every PR. It rejects em dashes,
weasel phrases, and AI authorship signatures in any tracked file. Write plainly.
See `scripts/check-style.mjs` for the exact list of banned patterns.

## Documentation

Documentation placement, naming, coherence, and cleanup follow
`docs/guidelines/markdown-governance.md` (ADR-031). Before adding, moving, or deleting a
Markdown file, read that policy and run `node scripts/check-md-governance.mjs`. Markdown
deletion is deny-by-default: it requires an owner-approved work item and a `DECISIONS.md`
entry. Keep each topic to one source of truth and cross-link rather than copy. Before
adding a new file under `docs/adr/`, fetch the latest base branch and pick a number one
past its highest existing ADR: a concurrent branch you cannot see may already hold the
number your local checkout would otherwise suggest, and `check-md-governance.mjs` only
catches the collision after both land, not before either does.

## Session artifacts

Producing a document in response to a user question is a chat response, not a file.
Write a new file to the repo only when the user explicitly asks for it to be committed
or added to the codebase ("add this to the repo", "commit this as a doc", "write this
to docs/"). For everything else, respond inline in chat: explanations, plans, Q&A
writeups, offline reference material.

When a single request mixes repo work and personal artifacts (a code change plus a
marketing plan, for example), commit only the repo change. Surface the personal
artifact inline so the user can copy it from the transcript.

For artifacts the user wants saved as files but not committed, use the session
scratchpad (/tmp/claude-0/.../scratchpad), not the working tree.

When the intended destination is unclear, ask: "Should this go into the repo, or is
this for your reference?"

## Guardrails

- Stay within the `allowed_edit_set` the work item specifies.
- Leave the `.modonome/config.yaml` arming levers (`autonomy_enabled`, `auto_merge`) unchanged.
- Merge only PRs authored by someone else.
- Fix the root cause behind a failing gate, and keep gates and assertions intact.
