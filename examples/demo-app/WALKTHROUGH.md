# Modonome in action: what one week looks like on a Node.js app

> **Representative run.** Commands, output formats, ratchet messages, and governance
> report structure are accurate: this is exactly what you would see. The specific tech
> debt items and sequence of events are illustrative of a typical week. Simulated examples
> are clearer than partial real-world runs with redacted details.

This walkthrough shows what Modonome does in practice on a Node.js app with three
real-world tech debt targets: missing test assertions, a stale dependency, and a
type safety gap.

---

## Step 1: the dry-run finds three targets

```
$ npx modonome dry-run .

Modonome dry-run sweep
Mode: dry-run. This run changed nothing.

Stack: Node or TypeScript (npm)
Protected paths: .github, CODEOWNERS, package-lock.json

Proposed work (3 bounded items)
================================

[1] Add assertions to the OrderService refund flow.
    git log shows 14 changes in 90 days with zero corresponding test additions.
    Three conditional branches, zero assertions.
    Scope: 3-5 assertions in tests/OrderService.test.js
    Risk tier: Tier 1 (test-only). Estimated: ~40 lines.

[2] Remove dead feature flag ENABLE_LEGACY_CHECKOUT.
    Flag has been false in all environments for 62 days.
    Adds ~180 lines of unreachable code and two outdated test stubs.
    Scope: remove flag check and dead branch in CheckoutService.js
    Risk tier: Tier 1 (unreachable code removal). Estimated: ~180 lines removed.

[3] Enable TypeScript strict mode.
    tsconfig.json has "strict": false. tsc --strict reveals 7 implicit-any errors.
    Scope: set strict: true, fix 7 type annotations in PaymentProcessor.js
    Risk tier: Tier 2 (type-checker only, no runtime impact). Estimated: ~25 lines.

None of the proposed changes have been applied.
```

The dry-run reads git history, checks CI config, and identifies bounded, safe work.
It changed nothing. It proved it understood the codebase.

---

## Step 2: refund test coverage merges

Modonome opened a PR with 4 new assertions covering the refund path : the
not-found case, the already-refunded case, the wrong-status case, and the
happy path.

The ratchet ran in CI:

```
guard-ratchet: checking diff...
  tests/OrderService.test.js: +4 assertions, -0 assertions. OK.
guard-ratchet: PASS. No gate-weakening patterns detected.
```

The checker reviewed the diff independently. The PR merged.

**What this proves:** Modonome found a real gap (14 changes with no tests),
proposed a bounded fix, and proved the fix added coverage without removing anything.

---

## Step 3: dead code is removed cleanly

The `ENABLE_LEGACY_CHECKOUT` flag removal PR landed: 83 lines deleted,
all tests still passed, assertion count unchanged.

```
guard-ratchet: checking diff...
  src/CheckoutService.js: 83 lines removed (non-test file). OK.
  tests/CheckoutService.test.js: +0 assertions, -0 assertions. OK.
guard-ratchet: PASS.
```

**What this proves:** The ratchet distinguishes between removing dead production
code (fine) and removing test assertions (blocked). It does not treat all
deletions as suspicious : only the ones that weaken gates.

---

## Step 4: the ratchet blocks a bad attempt

Modonome attempted to wrap the payment service with retry logic. The first
implementation simplified a test by removing two assertions to avoid flakiness.

```
guard-ratchet: checking diff...
  tests/PaymentProcessor.test.js: +1 assertion, -3 assertions. NET: -2.
guard-ratchet: FAIL. This diff removes more test assertions than it adds.
  File: tests/PaymentProcessor.test.js
  This is the pattern of a test suite that passes by doing less checking.
  Fix: restore the removed assertions or add compensating ones.
  Exit 1.
```

The PR was rejected. Modonome reworked the implementation to keep all three
assertions. The second attempt passed:

```
guard-ratchet: PASS. +3 assertions, -0 assertions.
```

**What this proves:** The ratchet is not advisory. It blocked a real shortcut
attempt. The agent cannot pass CI by weakening the tests. The fix required
actual work.

---

## Step 5: the governance report

```
$ npx modonome report .

Modonome governance report
Period: 2026-06-16 to 2026-06-23
============================================================

Items attempted:    9
Gates passed:      26
Gates failed:       1  (ratchet caught assertion removal on item-003)
Ratchet rejections: 1
Merges:             9
Lines changed:    683
Est. hours saved: 17.0

AgentProof score:  16/16 GOVERNED

Work items this period:
  item-001  merged   Add input validation to user registration endpoint
  item-002  merged   Remove dead ENABLE_LEGACY_CHECKOUT flag
  item-003  merged   Wrap payment service call with retry and circuit breaker
  item-004  merged   Add database index on orders.created_at for reporting
  item-005  merged   Replace moment.js with date-fns in date utilities
  item-006  merged   Enforce 80% line coverage threshold in jest.config.js
  item-007  merged   Add structured logging to order fulfillment pipeline
  item-008  merged   Extract inline SQL in ReportingService into named constants
  item-009  merged   Add null check guard to user profile loader before cache write
============================================================
```

Nine items, 683 lines improved, one ratchet rejection (caught and fixed), no
human-written code required for any of them.

---

## What you need to reproduce this

1. **A CI runner** that can run `node scripts/guard-ratchet.mjs --diff $DIFF`
   on every PR. See the [CI integration snippet](../../agentproof/README.md#add-agentproof-to-your-ci).

2. **A coding agent harness** that loads `prompts/modonome.bundle.md` and
   runs the governance loop. Works with any agent that can read a prompt file.

3. **Branch protection + CODEOWNERS** so the merger identity is distinct from
   the maker. Modonome validates this before arming.

That is the entire stack. No database, no central service, no vendor lock-in.
