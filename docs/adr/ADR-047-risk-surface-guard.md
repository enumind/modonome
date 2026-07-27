# ADR-047: Risk Surface Guard, a second deterministic PR-diff scanner

**Status:** Accepted
**Date:** 2026-07-27

## Context

The anti-gaming ratchet (`scripts/guard-ratchet.mjs`, ADR-045) catches one threat: a
diff that makes gates pass by weakening the gates themselves, through removed
assertions, skip injection, coverage lowering, or type escapes. It says nothing about a
diff that leaves every gate intact but expands what the repository's execution,
credential, workflow, or container surface can do once merged: a new `eval()` call, a
`pull_request_target` trigger, a privileged container, a `curl | bash` install step.
This is a different threat model. Blast radius and infrastructure exposure are not test
gate integrity, and conflating the two would widen a dense, single-purpose file into two
threat models sharing one set of regexes, one message-catalog namespace, and one set of
false-positive constraints that do not actually overlap.

Risk Surface Guard ships as a fully separate script and rule catalog for this reason:
`scripts/risk-surface-guard.mjs` and `scripts/lib/risk-surface-rules.mjs` do not import
from or modify `guard-ratchet.mjs`.

## Decision

1. **Deterministic, line-based diff scanning, not AST-based.** Same family as the
   ratchet, for the same reason ADR-045 gives: an AST tier means vendoring a parser,
   which contradicts the zero-runtime-dependency guarantee (ADR-032). The limits stay
   documented rather than implied away: in `docs/risk-surface-guard.md`, and again in
   every rule's own `limitation` field.
2. **File-scope gating on every content rule, for two reasons.** First, false-positive
   discipline: a rule scoped to `.py` files does not fire on a `.md` doc example, a
   fixture file, or a rename. Second, and specific to this repository: its own CI runs
   Risk Surface Guard against its own pull requests, including the one that introduces
   `fixtures/risk-surface/should-flag/*.diff`. Those fixtures carry risky-looking text
   as fixture data. Every content rule is scoped to real source or config extensions and
   excludes `.md`, `.mdx`, `.txt`, `.rst`, `.diff`, and `.patch` universally, and every
   fixture in this feature uses a `.diff` extension, so the fixtures cannot trigger the
   scanner that ships beside them, on this pull request or any later one that adds more.
   The same trap applies a second way: the rule catalog, the CLI, and the test file are
   real `.mjs` source and necessarily contain the detection vocabulary itself as literal
   text (a regex for `--privileged`, a reason string naming `KUBECONFIG`, a test fixture
   quoting `169.254.169.254`), so `scripts/risk-surface-guard.mjs`,
   `scripts/lib/risk-surface-rules.mjs`,
   `scripts/lib/message-catalog/gate/risk-surface-guard.mjs`, and
   `tests/risk-surface-guard.test.mjs` are exempted from content rules by path, the same
   way fixtures are exempted by extension. This does not weaken review for the first
   three: each is also an exact match in the protected-path list, so RS801 (path-based,
   content-independent) fires whenever any of them is touched, regardless of the content
   exemption. The test file is not itself a protected path, matching every other test
   file in this repository, so it gets neither signal, the same as a fixture would.
3. **Warn-default posture.** The CLI defaults to `--mode warn` (exit 0 even with
   findings), and `action.yml`'s new `risk-surface` input defaults to `warn`. A tool
   positioned as "flags what expands risk surface, for a reviewer to notice" earns a
   fail default only after real-world use shows the false-positive rate is low enough to
   block on. That is an adopter's decision to opt into, not this repository's decision
   to impose.
4. **Both `scripts/risk-surface-guard.mjs` and `scripts/lib/risk-surface-rules.mjs` are
   base-pinned**, registered in `check-self-application.mjs`'s `BASE_PINNED` and checked
   out from the base branch in `ci.yml` before use. The tool's value is catching
   pull-request-introduced risk; a pull request must not be able to neuter the detector
   in the same diff that adds the risky pattern. This holds even though this
   repository's own CI runs the tool in warn mode: a neutered detector cannot fail the
   build in warn mode either way, but it can still hide a real risk-surface expansion
   from the reviewer reading the job summary, which is the actual backstop warn-mode
   findings depend on. This mirrors the ratchet's own trust model (ADR-006, ADR-045).
5. **Registered in `check-self-application.mjs`'s `REQUIRED_GATES` as advisory, not
   blocking**, matching the existing near-miss-widener entry: the entry proves the step
   is wired into CI and never fails the build by itself.
6. **Not added to `package.json`'s `verify` chain.** Like the ratchet, it needs a real
   base ref that a bare local `npm run verify` invocation cannot reliably supply: the
   working checkout may already be on `main`, or `origin/main` may not be fetched. It
   gets its own `ci.yml` step instead, in the same position and for the same reason the
   ratchet does.
7. **Message-catalog boundary.** `AGENTS.md` requires operator-facing output to go
   through the message catalog. For this tool that means the CLI's own status, summary,
   and usage-error strings, defined in
   `scripts/lib/message-catalog/gate/risk-surface-guard.mjs`. Each finding's `reason`,
   `reviewer_guidance`, and `limitation` text is authored content that belongs to the
   rule that produced it, not an operator-tunable template, and lives as a plain string
   field on the rule object in `risk-surface-rules.mjs`.
8. **Explicit non-goals**, stated here so they can be cited rather than re-litigated:
   this tool does not detect live infrastructure compromise, does not replace SAST,
   secret scanning, dependency review, cloud security posture management, or sandboxing,
   and is never described as breach prevention. Inline suppression comments are out of
   scope for this version, since an agent could add one to silence a real finding. If
   suppression is ever needed, the design note for later is a base-branch-loaded
   allowlist, never a PR-head-loaded one, for the same reason point 4 requires
   base-pinning the detector itself.

## What this does not change

- The zero-runtime-dependency guarantee (ADR-032) is untouched.
- `guard-ratchet.mjs`'s own detection logic, message catalog entries, and CI position
  are untouched. Existing Modonome Guard behavior is unchanged by this ADR.
- `package.json`'s `verify` chain keeps its no-network, no-real-base-ref-required
  property; Risk Surface Guard follows the same carve-out the ratchet already has.

## Consequences

Reviewers get a second, independent signal on pull requests, positioned conservatively:
it flags repository changes that expand risk surface and helps a reviewer notice them
before merge, nothing stronger. The residual risk is stated plainly, matching this
repository's evidence-first norm: regex-based detection can be evaded by determined
obfuscation, there is no semantic or AST analysis, per-finding line-number accuracy
depends on well-formed `@@` hunk headers in the diff, and the broad-scope credential and
network and TLS rules trade some false-positive risk for coverage deliberately, since a
missed expansion is worse than an extra reviewer glance. None of this is marketed as
breach prevention or as a replacement for the security tooling named in point 8.
