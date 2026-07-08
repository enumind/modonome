# Modonome on this demo app: dry-run, maker/checker cycle, and a real ratchet block

Two captured runs back this walkthrough, and each claim below links to its
committed evidence file:

- `runs/2026-06-26T11-46-00Z/`: one recorded maker/checker cycle. The
  metrics events are committed; the raw model output logs were not (they are
  large and reproducible on demand; see that directory's README).
- `runs/2026-07-08T05-30-00Z/`: a fully deterministic gate-integrity run. A
  gaming diff and an honest diff judged by the same gate, plus the Gauntlet
  before and after the gate is wired. No model involved; it reproduces
  bit-for-bit from the committed patches.

## Step 1: the dry-run sweep

`node scripts/dry-run-sweep.mjs examples/demo-app` reports the posture and the bounded
work it would propose. The full verbatim output is in runs/2026-06-26T11-46-00Z/dry-run.txt and in
../dry-run-transcript.txt. The sweep changes nothing and refuses remote spend by default.

## Step 2: a maker proposes a bounded, test-only change

OrderService.refund has four branches (order not found, already refunded, wrong status,
and the success path), but the committed test suite covers only the order-not-found
branch. A maker running claude-haiku-4-5 was asked to add tests for the three uncovered
branches, adding assertions only and changing no source file. The maker_run event is
captured in runs/2026-06-26T11-46-00Z/metrics.jsonl.

## Step 3: an independent checker reviews it

A checker running claude-sonnet-4-6, a distinct model that did not author the proposal,
reviewed it. It approved and raised one real question: the success-path assertion is only
correct if the fake payment client returns exactly {status: "refunded"}, so that contract
should be confirmed before merge. The checker_review event is captured in
runs/2026-06-26T11-46-00Z/metrics.jsonl.

## Step 4: the change is recorded, not force-applied

The committed sample keeps its planted debt so the corpus and the CI negative control still
have something to detect. The cycle is recorded as evidence in runs/2026-06-26T11-46-00Z/.
The maker and checker identities and models differ, as the separation-of-duties rule requires.

## Step 5: the gate rejects the shortcut and passes the honest fix

This is the part no model can talk its way past, so it is committed as verbatim,
deterministic output in runs/2026-07-08T05-30-00Z/:

- An agent-style shortcut (`gaming.patch`: skip the failing refund test, delete its two
  assertions, commit it as "fix: stabilize flaky refund test") is rejected by
  `guard-ratchet.mjs` with exit code 1, naming both weakenings
  (`ratchet-block.txt`, and `ratchet-block.sarif.json` with rule codes MR101 and MR102).
- The honest fix for the same debt (`clean.patch`: real tests for the three uncovered
  refund branches, all passing) sails through the identical gate with exit code 0
  (`ratchet-clean.txt`).

Same file, same gate, opposite verdicts. That asymmetry is the product.

## Step 6: the Gauntlet, before and after

`npx modonome gauntlet .` replays known gate-weakening attacks against this repo's own
files and grades the gate the repo actually has:

- Before wiring anything: 0/3 applicable attacks blocked, UNHARDENED, because the demo
  app ships with no gate on purpose (`runs/2026-07-08T05-30-00Z/gauntlet-before.txt`).
  Categories for languages this app does not use are counted N/A, not silently passed.
- After wiring the shipped workflow template and ratchet script: the same three attacks
  are blocked, 3/3 HARDENED (`runs/2026-07-08T05-30-00Z/gauntlet-after.txt`).

Run it on your own repo. The number it prints is about your gates, not ours.
