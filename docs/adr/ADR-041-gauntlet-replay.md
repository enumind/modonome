# ADR-041: The Gauntlet, a Host-Repo Gate-Integrity Replay

**Status:** Accepted
**Date:** 2026-07-04
**Milestone:** 7 (Distribution and adoption)
**Related:** ADR-003 (AgentProof portability), ADR-027 (AgentProof 25-scenario expansion),
ADR-029 (adversarial test design)

## Context

`agentproof/` proves that Modonome's own gate-integrity detector (`scripts/guard-ratchet.mjs`)
catches known gaming patterns, using its own fixed fixtures. `agentproof/CONFORMANCE-INTERFACE.md`
requires every scenario to run against those fixtures only and forbids a scenario from ever
touching a real repository's files, so a fork's reproduction and this repository's own run are
provably the same test. That rule is correct for a portable benchmark, but it means AgentProof
cannot answer the question an adopter actually has: "if an attack like this were made against a
file that exists in *my* repo, would *my* CI catch it?" AgentProof grades Modonome. It was never
built to grade the adopter.

## Decision

Add `scripts/gauntlet.mjs` (`npx modonome gauntlet [dir]`), a new, separate, read-only tool that
answers exactly that question and only that question, without touching AgentProof's fixtures,
scenarios, or scoring:

- For each of AgentProof's 25 normative gate-weakening categories, find a real file in the target
  repository whose type matches (reusing `scripts/lib/file-classifiers.mjs`, extracted from
  `guard-ratchet.mjs` so the two tools never disagree about what a path is).
- Copy only that file into an OS temp directory (`mkdtempSync`) and synthesize a minimal,
  realistic weakening of the copy. The real working tree is read, never written.
- Confirm the synthetic mutation is a genuine instance of the category by running the bundled
  reference `guard-ratchet.mjs` against it first (the oracle). A mutation that the reference
  detector itself does not reject is discarded, not scored, so a bug in mutation synthesis cannot
  manufacture a false PASS or FAIL.
- Grade the mutation a second time against whatever gate-integrity check the target repository
  actually has configured today: its own `scripts/guard-ratchet.mjs` if present, or the bundled
  reference detector if the target's CI workflow is wired to run one (via a workflow referencing
  `guard-ratchet`, `modonome ratchet`, or the `enumind/modonome` action). If neither exists, every
  applicable attack is scored as one that would have merged unchecked.
- Categories with no matching file in the target report `N/A` and are excluded from both the
  numerator and the denominator, so a single-language repository is graded on the attacks that
  apply to its stack, not penalized for languages it does not use.

**What "your gates: X/Y" precisely measures.** X of the Y gate-weakening attacks that could be
replayed against files this repo actually has would be rejected by the gate-integrity check this
repo has configured *today*. It is not a claim about GitHub Actions, about any check this tool did
not itself run, or about categories with no matching file. The tool's own scorecard states this
plainly in every run, and here in this ADR too, so the number cannot travel further than the claim
it supports.

The Gauntlet is not wired into `npm run verify` or any of this repository's own gates: it grades
*other* repositories, and running it against itself here would be a self-application category
error, the same reasoning `check-self-application.mjs` already applies elsewhere.

## Consequences

- A prospective adopter gets an honest, repo-specific, one-command answer to "would this actually
  catch anything on my code" before adopting anything, which AgentProof's own portable-fixture
  design cannot offer.
- The oracle-then-grade design means a mutation-synthesis bug fails closed: it can under-report
  (miss a category as N/A when a suitable file existed but wasn't matched) but it cannot over-report
  a category as caught when the underlying mutation was never valid, since the oracle gate has to
  independently agree first.
- Scope is deliberately narrow: this grades gate integrity (the ratchet surface) only, not full
  autonomy governance (config validation, work-item identity, drift, and so on), and it does not
  invoke GitHub Actions or any live CI system. A `.modonome/runs/gauntlet` entry is written only
  when the target is already scaffolded, matching `dry-run-sweep.mjs`'s clean-hands rule.
- If a future change alters how `guard-ratchet.mjs` classifies files or adds a new MR rule code,
  `scripts/lib/file-classifiers.mjs` and the category list in `scripts/gauntlet.mjs` need a matching
  update, or a new attack category will silently have no coverage. There is no drift gate for this
  yet; a future ADR should consider one if the category list grows.

## Related

- `agentproof/CONFORMANCE-INTERFACE.md`: the rule this ADR deliberately does not touch or weaken
  ("a scenario must never modify the host repository").
- ADR-003, ADR-027, ADR-029: AgentProof's own portability and adversarial-design decisions, which
  the Gauntlet complements rather than extends.
