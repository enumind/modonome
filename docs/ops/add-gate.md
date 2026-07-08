---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-07
---

# Add-gate runbook

Vendor-neutral runbook for adding a new deterministic check (gate) end-to-end. Any
agent or human follows it directly; Claude Code also surfaces it as the `/add-gate`
skill through a thin adapter under `.claude/skills/`.

A gate here is a zero-dependency Node script under `scripts/` that exits 0 on pass
and 1 on failure, plus the paperwork that makes it real: an ADR, a test file, CI
wiring, and registration in the self-application check. Skipping any of these fails
CI, because the repo checks that it lives its own pitch.

Everything below touches protected paths (`scripts/`, `.github/`, `schemas/`,
`docs/adr/` via markdown governance). Claim a work item with
`touches_protected_path: true` before starting; the PR needs CODEOWNER review.

## Step 1: The ADR

1. `git fetch origin main`, then find the highest ADR on the base branch:
   `ls docs/adr/ | sort -V | tail -1`. Your number is that plus one. Never number
   from your local checkout; a concurrent branch may hold the number you see, and
   the governance gate only catches the collision after both land.
2. Create `docs/adr/adr-NNN-<kebab-title>.md` with front-matter (`status`, `owner`,
   `last_reviewed`) matching neighboring ADRs. State the problem, the decision, and
   what the gate enforces. A `Proposed` ADR needs a milestone within 30 days.

## Step 2: The script

Create `scripts/check-<subject>.mjs`. Copy the shape of an existing small gate
(`scripts/check-work-items.mjs` is a good template). Requirements:

- Header comment cites the ADR: what the gate enforces and why it exists.
- Node stdlib only. Zero npm dependencies (`scripts/check-licenses.mjs` enforces
  this).
- All operator-facing output goes through the message catalog: define message ids
  under `scripts/lib/message-catalog/gate/`, emit via `formatMessage` from
  `scripts/lib/messages.mjs`. Set the severity floor deliberately; blocking
  messages are non-suppressible.
- Exit 0 on pass, 1 on failure. Support a `--json` flag when the output feeds
  tooling.
- Entropy, if any, comes from `node:crypto`. `Math.random()` in `scripts/` is a
  red build.
- Regex alternatives stay disjoint; no nested quantifiers over overlapping
  classes. `scripts/check-regex-safety.mjs` and CodeQL both watch for this.
- If the gate is a deterministic detector, it must not import
  `scripts/lib/near-miss.mjs` or `scripts/remediate.mjs`; the gate-dag check
  enforces that boundary.

## Step 3: The tests

Create `tests/check-<subject>.test.mjs` using `node:test` and
`node:assert/strict`. Required sections, in order:

1. Pure-function unit tests for the exported logic, no process spawn.
2. CLI integration: `spawnSync("node", [SCRIPT, ...fixtureArgs])`, asserting the
   exit status and matching real stderr text, with child output interpolated into
   the assertion message.
3. A run against this repo's own live files that must pass. Every gate proves it
   passes on the real repo.
4. Adversarial cases named for the attack they block (evasion spellings, path
   traversal in arguments, self-approval, whatever applies).

Fixtures go in `mkdtempSync` temp dirs removed in `finally`, or in
`fixtures/<subject>/` when shared. No network; mock servers from `tests/helpers/`
if an API is involved.

Coverage floors (80 lines, 66 branches, 80 functions) must still hold:
`npm run test:coverage`.

## Step 4: The wiring

A gate that exists but is unwired fails the self-application check. Update all of
these:

1. **`package.json`**: add the script to the `verify` chain (and a `check:<name>`
   alias if operators will run it alone).
2. **`.github/workflows/ci.yml`**: add the invocation to the `ratchet` job.
   Placement decision: gates that judge the PR's own new code run before the
   base-branch checkouts; gates that must be tamper-proof against the PR are
   base-pinned (added to the `git checkout origin/<base_ref> --` list) and run
   after. Base-pin any gate whose weakening would let a bad diff through.
3. **`scripts/check-self-application.mjs`**: add the gate to `REQUIRED_GATES` so
   CI proves it stays wired. If it is base-pinned, register that there too.
4. **`schemas/gate-graph.json`**: add the node and its prerequisite edges. The
   graph must stay acyclic (`node scripts/check-gate-dag.mjs`).
5. If the gate encodes a promoted lesson, update the `Promoted` block in
   `.modonome/LESSONS.md` with `id`, `correction_signal`, dates, `gate_added`, and
   `gate_location` (`node scripts/check-learning-traceability.mjs` validates it).

## Step 5: Derived files and changelog

```
node scripts/snapshot.mjs .
npm run attest        # the enforced gate set is an attestation input
```

Add a `CHANGELOG.md` entry under `## Unreleased`: name the script and test file in
backticks, cite the ADR, state that the change is additive, and name any accepted
residual risk plainly.

## Step 6: Verify

```
node --test tests/check-<subject>.test.mjs
npm run verify
```

Ship when both are green, the diff matches the work item's `allowed_edit_set`, and
the PR body (Summary, Details, Annexure) names the ADR. Then follow
[preflight.md](preflight.md) for the final push checklist.
