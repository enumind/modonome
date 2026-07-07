---
name: preflight
description: Pre-push readiness check for this repo. Classifies the working diff by deliverable type, runs the applicable gates in fast-fail order, maps every failure id to its concrete fix, regenerates derived files, and ends with a push verdict. Use before every commit and push, and whenever CI is red and you need to reproduce the failure locally.
---

# Preflight: am I ready to push?

The full gate suite (`npm run verify`) chains roughly 25 checks plus tests, the
AgentProof scenarios, and the frontend builds. Running it blind and iterating in CI
wastes ten minutes per round trip. This skill runs the cheap, most-likely-to-fail
checks first, so most problems surface in seconds.

Naming note: `npm run preflight` is the embedding preflight
(`scripts/preflight-embedding.mjs`), a different tool. This skill never calls it.

## Step 1: Classify the diff

```
git status --short
git diff --stat origin/main...HEAD
```

Note which of these areas changed; each adds gates in step 3:

| Area touched | Extra gates to run |
| --- | --- |
| Any file at all | style, snapshot, hygiene |
| Markdown anywhere | md-governance |
| `scripts/`, `bin/` | targeted test file, self-application, gate-dag |
| `schemas/`, `templates/`, `prompts/` | drift, prompt bundle check |
| Tests or fixtures | gate integrity check on the diff, coverage |
| `.modonome/work-items/`, `STATUS.md` | work-items, staleness |
| `.modonome/DECISIONS.md` | decisions-authority |
| `apps/control-panel/`, `design-system/` | frontend builds, control-panel gates |
| `site/` | style on HTML, site data sync check |
| `docs/adr/` | ADR number check against fetched base |

Protected-path reminder: changes under `scripts/`, `bin/`, `schemas/`,
`templates/`, `prompts/`, `.github/`, or `site/` need a work item with
`touches_protected_path: true` and CODEOWNER review. If you are here without one,
stop and escalate before polishing the diff.

## Step 2: Regenerate derived files

Derived files fail CI when stale. Regenerate before checking:

```
node scripts/snapshot.mjs .
```

If you touched governance surfaces (protected paths list, gate set, capability
defaults, branch denylist), also:

```
npm run attest
```

If you touched `prompts/modonome.core.md` or the prompt modules:

```
npm run build:prompt
```

Commit regenerated files together with the change that caused them.

## Step 3: Run gates, cheapest first

Run in this order and stop at the first failure:

```
npm run check:style
npm run check:md-governance        # if markdown changed
npm run check:drift                # if schema/template/prompt changed
npm run check:snapshot
node scripts/check-repo-hygiene.mjs
node scripts/guard-ratchet.mjs origin/main   # if tests or fixtures changed
node --test tests/<changed-area>.test.mjs    # targeted tests
npm run verify                     # the full suite, last
```

`npm run verify` is the same aggregate CI runs; green here means green there, with
two exceptions: the decisions-authority gate needs a `GITHUB_TOKEN` and PR context,
and CI re-runs several gates from a base-branch copy that your working tree cannot
influence.

## Step 4: Map failures to fixes

| Failure id or symptom | Meaning | Fix |
| --- | --- | --- |
| `gate.style.em-dash` | Em dash character in a tracked file | Replace with period, comma, colon, or parentheses |
| `gate.style.not-just`, `gate.style.not-only` | Hedging phrase | State the point directly |
| `gate.style.it-is-not-x-it-is-y` | Contrast-by-denial construction | Say what the thing is |
| `gate.style.ai-signature` | AI authorship signature in file content | Remove the trailer, notice, or session link |
| Lexicon term failure | Banned vocabulary | Use the preferred term from `lexicon.json` |
| MR101 | More assertions removed than added in tests | Restore assertions; if a test is truly obsolete, delete the whole file in an owner-reviewed item |
| MR102 | Skip or focus marker added | Remove it; fix the test instead |
| MR103 | Vacuous assertion (literal compared to itself) | Assert on real output |
| MR104 | Coverage threshold removed or lowered | Restore the floor; add tests |
| MR105 | Type-escape added in non-test source | Type the value properly |
| MR106 | Strong assertions downgraded to existence checks | Restore value comparisons |
| MR107 | Lookalike Unicode hiding a skip or assert token | Remove the homoglyph |
| Snapshot check red | Snapshot stale after an edit | `node scripts/snapshot.mjs .` and commit the result |
| Attestation check red | Governance surface changed or file hand-edited | `npm run attest`, commit; never edit the JSON by hand |
| Drift check red | A control's four representations disagree | Update schema, template, core prompt, and migration together (see `/add-control`) |
| Work-item staleness red | Item state contradicts merged reality | Transition the item; update `STATUS.md` (see `/work-item`) |
| md-governance red | Root allow-list, link, ADR number, or deletion violation | Read the message; consult `docs/guidelines/markdown-governance.md` |
| Self-application red | Advertised gate missing from CI, protected paths out of sync, or badge mismatch | Wire the gate or sync the lists (see `/add-gate`) |
| Decisions-authority red | `DECISIONS.md` shape or provenance violation | Only `Resolved` and `Open` H2s; new entries need an independent CODEOWNER approval |
| Hygiene red on branch or commit | Model token in branch segment or trailer in a commit | Rename the branch; amend the message |

Fix the cause, never the gate. If a gate is wrong, that is an owner-reviewed change
to a protected path, in its own work item.

## Step 5: Verdict checklist

Push when every line is true:

- [ ] `npm run verify` exits 0.
- [ ] Branch name has no denylisted segment (`scripts/lib/branch-name.mjs`).
- [ ] `git log origin/main..HEAD --format='%B'` shows description-only messages:
      no trailers, no session links, no model names.
- [ ] The diff stays inside the claimed work item's `allowed_edit_set`.
- [ ] Regenerated files (snapshot, attestation, bundle, evidence) are committed.
- [ ] The PR body you are about to write follows Summary, Details, Annexure.

Then:

```
git push -u origin <branch>
```
