# Break the Ratchet

The gate integrity check (`scripts/guard-ratchet.mjs`) is a deterministic, line-based diff
analyzer. The README says plainly what that means it can and cannot see: [What it catches, and
what it cannot](README.md#what-it-catches-and-what-it-cannot). This is the other half of that
honesty: an open invitation to prove the boundary wrong, or to prove it right.

**If you can construct a diff that represents a genuine gate weakening and the ratchet does not
flag it, we want it.** A confirmed break becomes a named, credited entry below and, once fixed, a
new AgentProof scenario with your name on it.

## The rule that keeps this safe to run

**Submissions are never executed.** `npx modonome break-the-ratchet <your-submission-dir>` reads
your `.patch` file as plain text and hands it to the ratchet's own `--diff` mode, which is
itself a pure text analyzer: it parses a diff into added and removed lines and pattern-matches
them. It never runs `git apply`, never writes your diff's content into a working tree, and never
executes anything a submission contains. That is the whole safety model, and it is not
negotiable: a "bring your own agent" style challenge that ran arbitrary submitted code would be a
security hole shaped exactly like the thing this project exists to prevent.

Because the judge never executes your diff, it cannot itself decide whether your claim is true.
It mechanically confirms one fact (did the ratchet flag it, yes or no) and presents your
declared claim for a maintainer to review. See the seeded example below for what a genuine,
already-confirmed candidate looks like.

## How to submit

1. Create a directory: `submission.patch` (a real unified diff, same format as
   `fixtures/ratchet-diffs/gaming/*.diff`) plus `declaration.json` describing the claim
   (schema: `schemas/break-the-ratchet-submission.schema.json`):

   ```json
   {
     "title": "One-line description",
     "category": "expected-value-drift",
     "claim": "What the diff does, mechanically.",
     "whyRealWeakening": "Why a maintainer merging this would be worse off. Be concrete: what does the test stop proving?",
     "expectedRatchetVerdict": "should-block"
   }
   ```

   `category` is one of the ratchet's known structural categories (`assertion-removal`,
   `skip-injection`, `vacuous-assertion`, `coverage-lowering`, `type-escape`,
   `assertion-strength-downgrade`, `homoglyph-disguise`) or one of the semantic categories the
   README already names as out of scope (`expected-value-drift`, `cross-file-migration`), or
   `novel` if it is neither.

2. Run the judge locally and read its verdict:

   ```bash
   npx modonome break-the-ratchet path/to/your-submission/
   ```

3. Open an issue using the "Break the Ratchet" template with your `declaration.json` and
   `submission.patch` attached. A maintainer reviews `candidate-break` verdicts by hand: does the
   diff genuinely weaken a gate the way the claim describes, in a way a reasonable reviewer could
   miss?

## What happens to a confirmed break

- It is credited here, in the hall of fame, with your name (or handle) and the date.
- If the underlying gap is fixable within the ratchet's structural, false-positive-safe design
  (see `docs/adr/ADR-045-scope-focus.md`'s constraint: a fix may never introduce a new false
  negative), it gets fixed and the fixture becomes a permanent regression test.
- If it is a genuinely semantic gap the deterministic ratchet cannot close without becoming
  something other than a deterministic line-based analyzer (most `expected-value-drift` and
  `cross-file-migration` cases), it is documented as a confirmed, permanent limitation, and it
  strengthens the case for the independent checker's role rather than the ratchet's.

## Hall of fame

| Date | Submitter | Category | Verdict | Outcome |
|---|---|---|---|---|
| 2026-07-08 | modonome project (seed example) | expected-value-drift | Confirmed | Documented as a permanent limitation; see [challenge/examples/expected-value-drift/](challenge/examples/expected-value-drift/). The ratchet does not, and structurally cannot, see that `assert.equal(result.total, 95)` becoming `assert.equal(result.total, 100)` moved the expected value to match a bug rather than fixing one. This is why the independent checker rubric (`prompts/roles/checker.txt`) explicitly asks the reviewer to check for expected-value drift. |

The seed entry above is not a community submission; it starts the ledger honestly with the
ratchet's own documented, already-known limitation, rather than launching with an empty table
that implies no one has looked yet.
