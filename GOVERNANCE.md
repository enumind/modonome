# Governance

Modonome treats autonomy as something to be earned, one rung at a time.

## Maker, checker, merger

Every change needs three distinct identities:

- A maker that creates the diff.
- A checker that did not create the diff. The checker runs the gates first, then reviews the
  diff and the rationale. A persuasive rationale is evidence, not a verdict.
- A merge authority that is not the author.

If only one identity or model is available, autonomous checking and merging are disabled and
the change waits for human review.

## Risk tiers

- Tier 1: mechanical, small, test-fenced, no protected paths. Local maker and checker.
- Tier 2: multi-file but bounded, no public contracts. Stronger checker, full gates.
- Tier 3: public API, schema, migration, dependency, security, CI, auth, secrets, protected
  docs. Owner or frontier review.
- Tier 4: new product claims, architecture, policy, legal, market positioning, autonomous
  merge enablement, cross-repo changes. Owner decision only.

## The activation ladder

1. Disabled. Read state, produce plans, change nothing.
2. Dry-run. Project actions, record metrics, take no write action.
3. Shadow. Run against live state read-only, compare decisions against human outcomes.
4. Armed. Allowed only when every gate below passes.

Each rung is earned by a clean record on the rung before it.

## Arming gates

Armed mode requires all of: branch protection or equivalent enforcement, required CI checks,
code-owner review, a verified trusted author, protected-path rules, a separate merge identity,
a daily merge cap above zero, a remote budget cap, and a rollback path. The arming levers are
read from the environment or CI.

## Owner decisions

Open questions live in `.modonome/DECISIONS.md`. Each carries a recommendation and a default
of hold. Unanswered means no action.

## Learning

Lessons are captured only on a real correction signal, staged in `.modonome/LEARNINGS.md`,
bounded and dated and evidence-backed, and promoted into canonical rules only by an owner.
Promotion deletes the staged entry and, where it fits, adds a deterministic gate.
