# modonome-demo

A minimal Express.js order-management service used to demonstrate Modonome's
governed-autonomy loop. The app ships with deliberate tech debt so the dry-run
has something real to propose.

## What Modonome found in 60 seconds

```
$ npx modonome dry-run .

Modonome dry-run sweep
Mode: dry-run. This run changed nothing.

Target: .
Stack: Node or TypeScript (npm)

Proposed work (3 bounded items)
================================

[1] Add assertions to the refund flow in OrderService : 14 changes in 90 days, 0 tests.
    Risk tier: Tier 1 (test-only). Estimated size: ~40 lines.

[2] Remove dead feature flag ENABLE_LEGACY_CHECKOUT (false in all envs for 62 days).
    Risk tier: Tier 1 (unreachable code removal). Estimated size: ~180 lines removed.

[3] Enable strict type checking (jsconfig checkJs) : 7 implicit-any errors in PaymentProcessor.js.
    Risk tier: Tier 2 (type-checker only, no runtime impact). Estimated size: ~25 lines.

None of the proposed changes have been applied.
Every gate will be verified before any merge is attempted.
```

## What happened when it ran

See [WALKTHROUGH.md](./WALKTHROUGH.md) for the play-by-play: what the dry-run
proposed, and one recorded maker/checker cycle (a Haiku maker proposed
refund-flow tests; a distinct Sonnet checker reviewed them and raised one real
question). The cycle is committed as evidence in
[`runs/2026-06-26T11-46-00Z/`](./runs/2026-06-26T11-46-00Z/), not applied to
the sample, so the planted debt below stays in place for the corpus and the CI
negative control.

## Try it yourself

```bash
# 1. Clone the repo and enter the demo app
git clone https://github.com/enumind/modonome
cd modonome/examples/demo-app

# 2. Install dependencies
npm install

# 3. Run the dry-run sweep (changes nothing)
npx modonome dry-run .

# 4. See the governance report
npx modonome report .

# 5. Run AgentProof (the self-graded gate-integrity benchmark; CI requires it green)
npx modonome agentproof
```

## The tech debt intentionally left in this repo

The dry-run proposes the first three items below as bounded work. The fourth
(the missing coverage threshold) is left planted deliberately: it is what the
gate-integrity corpus and the CI negative control detect.

| File | Issue | Modonome proposal |
|---|---|---|
| `src/OrderService.js` | Refund flow has 0 tests, 14 recent changes | Add 4 assertions |
| `src/CheckoutService.js` | `ENABLE_LEGACY_CHECKOUT` flag dead for 62 days | Remove ~180 lines |
| `src/PaymentProcessor.js` | 7 implicit-any, strict mode off | Enable strict mode, fix types |
| `package.json` | No coverage threshold | Left planted for the ratchet corpus |
