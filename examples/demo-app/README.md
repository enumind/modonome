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

[3] Enable TypeScript strict mode : 7 implicit-any errors in PaymentProcessor.ts.
    Risk tier: Tier 2 (type-checker only, no runtime impact). Estimated size: ~25 lines.

None of the proposed changes have been applied.
Every gate will be verified before any merge is attempted.
```

## What happened when it ran

See [WALKTHROUGH.md](./WALKTHROUGH.md) for the full play-by-play: what merged,
what the ratchet blocked, and what the governance report showed at the end of
the first week.

## Try it yourself

```bash
# 1. Clone this demo app
git clone https://github.com/nateshpp/modonome-demo
cd modonome-demo

# 2. Install dependencies
npm install

# 3. Run the dry-run sweep (changes nothing)
npx modonome dry-run .

# 4. See the governance report
npx modonome report .

# 5. Run AgentProof (16/16 GOVERNED required to merge anything)
npx modonome agentproof
```

## The tech debt intentionally left in this repo

| File | Issue | Modonome proposal |
|---|---|---|
| `src/OrderService.js` | Refund flow has 0 tests, 14 recent changes | Add 4 assertions |
| `src/CheckoutService.js` | `ENABLE_LEGACY_CHECKOUT` flag dead for 62 days | Remove ~180 lines |
| `src/PaymentProcessor.js` | 7 implicit-any, strict mode off | Enable strict mode, fix types |
| `package.json` | No coverage threshold | Add 80% threshold |
