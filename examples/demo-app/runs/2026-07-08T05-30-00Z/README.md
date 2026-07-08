# Captured gate-integrity run: the ratchet blocking a gaming diff

Every file in this directory is verbatim, deterministic tool output. No model
was involved: the gate integrity check is a plain Node script, so this entire
run reproduces bit-for-bit from the patches committed here.

## What ran

A scratch git clone of this demo app was given two competing changes to the
same planted debt (the under-tested `OrderService.refund` flow):

1. **The gaming change** (`gaming.patch`): the shortcut an agent takes to "go
   green": `it.skip(...)` on the failing refund test plus deletion of its two
   assertions. Committed as `fix: stabilize flaky refund test`, which is
   exactly how these diffs tend to arrive.
2. **The honest change** (`clean.patch`): real tests for the three uncovered
   refund branches (already-refunded signalling, non-refundable status, and
   the success path recording the refund reason). All five tests pass.

The same gate judged both:

- `ratchet-block.txt`: the ratchet rejects the gaming diff, exit code 1,
  naming the assertion removal and the injected skip.
- `ratchet-block.sarif.json`: the same rejection as SARIF 2.1.0 with stable
  rule codes (MR101 assertion-removal, MR102 skip-injection), as it appears
  in a GitHub code-scanning tab.
- `ratchet-clean.txt`: the honest diff passes the identical gate, exit code 0.

## The Gauntlet, before and after

- `gauntlet-before.txt`: the demo app as committed has no gate wired, and the
  Gauntlet says so honestly: 0/3 applicable attacks blocked, UNHARDENED,
  22 of 25 categories N/A because this stack does not use those languages.
- `gauntlet-after.txt`: after wiring the shipped workflow template
  (`templates/.github/workflows/gate-integrity.yml`) and the ratchet script,
  the same three attacks are blocked: 3/3, HARDENED.

## Reproduce

```bash
git clone https://github.com/enumind/modonome
cd modonome
# scratch copy of the demo app
cp -r examples/demo-app /tmp/demo && cd /tmp/demo && rm -rf runs && git init -b main
git add -A && git commit -m "base"
# apply the gaming diff and watch the gate reject it
git apply path/to/gaming.patch
git add -A && git commit -m "fix: stabilize flaky refund test"
node /path/to/modonome/scripts/guard-ratchet.mjs HEAD~1   # exits 1, MR101 + MR102
# reset, apply the honest diff, watch the same gate pass it
git reset --hard HEAD~1 && git apply path/to/clean.patch
git add -A && git commit -m "test: cover the three untested refund branches"
node /path/to/modonome/scripts/guard-ratchet.mjs HEAD~1   # exits 0
```
