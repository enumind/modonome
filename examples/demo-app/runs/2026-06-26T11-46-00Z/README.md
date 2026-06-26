# Captured maker and checker run: demo-refund-coverage

This directory holds a real captured run of a maker and checker cycle on this sample
app. Nothing here is hand-authored. The .log files are verbatim model output and the
metrics.jsonl line is produced from that run.

## What ran

- Target debt: OrderService.refund has four branches, but the test suite covered only
  the order-not-found branch (see src/OrderService.js and the WS-A planted debt).
- Maker: claude-haiku-4-5. Asked to add tests for the three uncovered refund branches,
  test only, adding assertions and changing no source. Verbatim output in maker.log.
- Checker: claude-sonnet-4-6, a distinct model. Reviewed the maker proposal as a
  skeptic. Verbatim output in checker.log. The checker approved and raised one question
  about whether the success-path assertion matches the fake payment client contract.
- metrics.jsonl records one maker_run and one checker_review event with the real
  identities, models, and the checker engagement counts.
- dry-run.txt is the verbatim output of: node scripts/dry-run-sweep.mjs examples/demo-app

## Why the change is not applied here

The committed sample keeps its planted debt on purpose, so the corpus scenarios and the
CI dogfood negative control still have something to detect. This run records the
proposal and the independent review as evidence, not as an applied edit.

## Reproduce

Run the same two prompts against claude-haiku-4-5 as maker and claude-sonnet-4-6 as
checker. The exact wording varies between runs; the shape stays stable: the maker
proposes test-only branch coverage and the checker reviews it for ratchet safety and
correctness.
