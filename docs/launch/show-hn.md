# Show HN draft

Not launch-ready until the OWNER-ACTIONS.md gates are cleared (real armed week, Marketplace
listing verified, co-maintainer engagement confirmed). This is the draft to have ready.

## Title candidates

1. Show HN: A CI gate that catches AI agents gaming your tests, try to break it
2. Show HN: We catch AI coding agents weakening tests in CI, from a copy the agent can't touch
3. Show HN: Modonome, an anti-gaming gate for AI-authored PRs (MIT, no service)

Lead with (1). It states the mechanism and issues the challenge in one line, which is the two
things this audience actually evaluates a security claim on.

## First comment (post immediately after submitting, from the account that submits)

> Maker/checker context: I built this because a coding agent's most common failure mode when
> asked to "make the tests pass" is to weaken the tests, not fix the code. Removed assertions,
> injected skips, a `coverageThreshold` that quietly drops to 0.
>
> The core idea: the gate that checks a pull request runs from a pinned copy of the base
> branch, not from the PR under review, so the PR cannot weaken the very check that judges it.
> It's a deterministic, zero-dependency, line-based diff analyzer, not a model call, so it's
> immune to prompt injection and fast enough to run on every PR.
>
> It is also honest about its limits: [What it catches, and what it cannot](https://github.com/enumind/modonome#what-it-catches-and-what-it-cannot)
> in the README. It catches structural gaming. It does not catch an assertion whose expected
> value was quietly changed to match a bug. That gap is the independent checker's job, and
> that's a much harder problem than pattern matching a diff, which is exactly why I built
> [CheckerProof](https://github.com/enumind/modonome/tree/main/checkerproof): a seeded-defect
> benchmark that measures the checker's actual catch rate on planted semantic weaknesses
> (expected-value drift, cross-file coverage migration, and so on) instead of assuming a prompt
> that says "review adversarially" works. First real run: 5/5, committed evidence, not a claim.
>
> Try it read-only in 60 seconds: `npx modonome dry-run .` then `npx modonome gauntlet .`
> (the second one scores your repo's own CI gate against 25 known gaming patterns, no arming,
> writes nothing).
>
> If you can construct a diff that weakens a gate and slips past the ratchet, I want it:
> [Break the Ratchet](https://github.com/enumind/modonome/blob/main/BREAK-THE-RATCHET.md).
> Submissions are never executed, only text-analyzed by the ratchet itself; a confirmed break is
> a named, credited hall-of-fame entry. The project's own claims audits (linked in docs/audits/)
> are written to be uncharitable to our own marketing on purpose, that's the standard I'd want
> applied to a tool that gates my CI.

## Rules for all launch copy

- Every claim links to a committed evidence file. If a claim cannot be linked to evidence, it
  does not go in launch copy, full stop.
- Lead with the mechanism (base-branch trust boundary) before the roadmap (loop, enterprise,
  standards). The mechanism is shipped and provable; the rest is not yet.
- State the limits before someone else finds them. The "what it cannot catch" framing is not a
  disclaimer, it is the thing that makes the "what it catches" claim credible.

## Anticipated pushback, and the honest answer (do not pre-empt with defensiveness, just have this ready)

- "This is just line-based regex, an agent can get around it." Yes, for semantic weakening.
  That's exactly what the README says up front, and it's why the independent checker exists as
  a second layer. Structural gaming (the overwhelmingly common case in practice) is fully
  caught, deterministically.
- "AgentProof 25/25 is self-graded." Correct, said plainly in agentproof/README.md. It is a
  regression suite against known patterns, not a certification. The ask in the launch post is
  for the community to try to break it, which is how a self-graded score becomes credible.
- "Solo project, is this maintained." Answer with SUPPORT.md's honest framing (no SLA, real
  triage priorities) rather than overselling responsiveness the team cannot back up.
