# Modonome on this demo app: real captured run

Everything in this walkthrough is real. The dry-run output is verbatim tool output and
the maker and checker logs are verbatim model output, captured under runs/2026-06-26T11-46-00Z/. Nothing
here is hand-authored or simulated.

## Step 1: the dry-run sweep

`node scripts/dry-run-sweep.mjs examples/demo-app` reports the posture and the bounded
work it would propose. The full verbatim output is in runs/2026-06-26T11-46-00Z/dry-run.txt and in
../dry-run-transcript.txt. The sweep changes nothing and refuses remote spend by default.

## Step 2: a maker proposes a bounded, test-only change

OrderService.refund has four branches (order not found, already refunded, wrong status,
and the success path), but the committed test suite covers only the order-not-found
branch. A maker running claude-haiku-4-5 was asked to add tests for the three uncovered
branches, adding assertions only and changing no source file. Its verbatim proposal is
in runs/2026-06-26T11-46-00Z/maker.log.

## Step 3: an independent checker reviews it

A checker running claude-sonnet-4-6, a distinct model that did not author the proposal,
reviewed it. It approved and raised one real question: the success-path assertion is only
correct if the fake payment client returns exactly {status: "refunded"}, so that contract
should be confirmed before merge. The verbatim review is in runs/2026-06-26T11-46-00Z/checker.log, and the
maker and checker events are in runs/2026-06-26T11-46-00Z/metrics.jsonl.

## Step 4: the change is recorded, not force-applied

The committed sample keeps its planted debt so the corpus and the CI dogfood control still
have something to detect. The cycle is recorded as evidence in runs/2026-06-26T11-46-00Z/ and as a done work
item in .modonome/work-items/demo-refund-coverage.json with the real maker and checker
identities and models, which differ as the separation-of-duties rule requires.
