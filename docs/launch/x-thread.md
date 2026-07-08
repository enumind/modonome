# X thread skeleton (@ModonomeLab)

Post at launch, alongside the Show HN submission (do not post before it goes live). Five posts,
each stands alone as a screenshot. Replace the terminal capture and diagram references with the
actual exported images before posting (`docs/assets/ratchet-demo.svg`, rasterized).

**1/5 (hook + visual)**
> An AI coding agent asked to "make the tests pass" will sometimes just delete the assertion
> instead of fixing the code. Here's that exact move, caught and blocked, in real output.
> [terminal capture: the gate rejecting the skip + assertion removal]

**2/5 (mechanism)**
> The trick: the gate that judges a pull request runs from a pinned copy of the base branch,
> not from the PR itself. The PR cannot weaken the check that grades it, structurally, not by
> asking nicely.
> [diagram: the trust boundary]

**3/5 (try it, zero risk)**
> Try it on your own repo, read-only, no arming:
> `npx modonome dry-run .`
> `npx modonome gauntlet .` scores your CI's actual gate against 25 known gaming patterns.
> [terminal capture: a real Gauntlet score]

**4/5 (honesty as the hook)**
> It's a deterministic line-based diff analyzer: fast, dependency-free, immune to prompt
> injection, and it has real limits. We wrote down exactly what it cannot catch instead of
> hoping no one asks. Link to the README section.

**5/5 (the challenge)**
> If you can build a diff that weakens a gate and slips past ours, we want it. File it and it
> becomes a named, credited scenario in the benchmark. MIT licensed, no service, runs in your
> own CI. [repo link]

## Rule

Same as the Show HN and article seeds: every number or claim in a post must trace to a
committed file. Do not round a Gauntlet score or restate the AgentProof score as anything other
than what `agentproof/README.md` says it means.
