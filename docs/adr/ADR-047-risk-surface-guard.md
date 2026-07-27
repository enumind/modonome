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

9. **Suppression allowlist realizes decision 8's design note.** A base-branch-loaded
   allowlist, never PR-head-loaded, exactly like the detector itself is base-pinned per
   decision 4. `.modonome/risk-surface-allowlist.json` and its loader
   `scripts/lib/risk-surface-allowlist.mjs` are both base-pinned in `ci.yml`'s `ratchet`
   job and registered in `check-self-application.mjs`'s `BASE_PINNED`. A pull request
   that adds a suppression entry is judged by the OLD (base-branch) allowlist on that
   same pull request; the new entry only takes effect starting with the next pull
   request opened after this one merges. No inline suppression comments were added; the
   concern decision 8 raised (an agent adding one to silence a real finding, in the same
   diff, with no review cycle) is exactly what base-pinning the allowlist avoids.
10. **Entry shape and glob reuse.** Every allowlist entry requires all seven fields
    (`id`, `rule`, `file`, `reason`, `added_by`, `added_at`, `expires_at`); none are
    optional, since each is structurally necessary for auditability, who, why, what,
    and until when. Matching is rule-id-only, with no category-level suppression, so
    suppression breadth stays proportional to review cost: one entry silences one rule
    against one file or glob, never a whole category. `file` reuses `globToRegExp`,
    exported from `risk-surface-rules.mjs` for this purpose, the same glob syntax
    `PROTECTED_PATH_GLOBS` already uses, so one matching implementation serves both a
    literal path and a wildcard pattern. There is no `line` field: pinning to a line
    number would make an entry brittle against unrelated edits that shift line numbers
    elsewhere in the same file.
11. **Output visibility rules.** A suppressed finding stays visible, marked, in human
    and `--json` output (a `[SUPPRESSED]` marker, the entry id, and its reason), so a
    reviewer or an audit can see what was suppressed and why without cross-referencing
    the allowlist file separately. It is excluded entirely from `--sarif` output, since
    SARIF feeds the GitHub Security tab, which should only ever list findings still
    awaiting review, not ones already reviewed and time-boxed. A suppressed finding
    never counts toward the exit code, the pass/warn/fail result, or the finding count
    in the summary line, in any mode, including fail mode: that is the entire point of
    suppression, and doing it selectively (hidden from SARIF but still counted toward
    the exit code) would leave the noise problem half-solved.
12. **`scripts/check-risk-surface-allowlist.mjs` is an author-feedback gate, not the
    trust boundary.** It runs pre-base-checkout, against the pull request's own
    proposed allowlist edits, so a malformed entry is caught on the pull request that
    introduces it rather than a review cycle later. It is blocking, registered in
    `REQUIRED_GATES` without the "(advisory)" qualifier decision 5 gives the scanner
    itself, because it is pure structural validation with no false-positive rate to
    prove out first, unlike the scanner's pattern-matching rules. Making it blocking
    cannot let a bad diff through by itself, since the actual trust boundary is
    decision 9's base-pinning; the gate only ever improves feedback latency for the
    pull request's author.
13. **Fail-closed is enforced at two independent layers, deliberately redundant.**
    First, `parseAllowlist` guarantees `entries: []` whenever validation produces any
    error, so a malformed allowlist file suppresses nothing rather than something
    unpredictable. Second, `isSuppressed` independently re-validates each entry's
    `expires_at` shape at match time rather than trusting `parseAllowlist` already ran:
    `scripts/lib/jsonschema.mjs` is a generic, non-base-pinned utility shared by other
    gates (`check-work-items.mjs` among them), so if it were ever weakened by a pull
    request and a malformed no-`expires_at` entry slipped past
    `check-risk-surface-allowlist.mjs` in the same pull request, a naive
    `entry.expires_at < today` comparison would evaluate `undefined < "2026-..."` as
    `false`, silently treating a missing expiry as permanent. Re-validating inside
    `isSuppressed` closes this without needing to base-pin the generic schema validator
    itself, a disproportionate change for what it buys.
14. **SARIF upload wiring.** Risk Surface Guard's `--sarif` output is now uploaded to
    the GitHub Security tab by `action.yml`, reusing the ratchet's own `upload-sarif`
    toggle rather than adding a second boolean input, gated additionally on
    `risk-surface` not being `off`. Results land under a distinct `modonome-risk-surface`
    category, separate from the ratchet's `modonome-gate-integrity` category, so both
    uploads coexist in the same run without overwriting each other.

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

RS106 (benign environment variable names), RS703 (Python `verify=False` co-occurrence
window), and RS707 (network egress structural match) were tuned after initial shipping
against more realistic code shapes (a `process.env.NODE_ENV` read in a file merely named
after auth, a `black`-wrapped multi-line `requests` call, prose that mentions "egress"
near an unrelated `0.0.0.0/0`). This reduces, but does not eliminate, the false-positive
risk the paragraph above already discloses; it remains a heuristic, not a guarantee.
