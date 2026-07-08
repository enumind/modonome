# Owner actions

Everything below requires access, credentials, or a judgment call an agent session cannot make.
Compiled across the truth-reconciliation, evidence, hardening, and launch-prep work in this
branch. Nothing here is launch-blocking by default except where marked **[GATE]**.

## Before any Show HN or public launch push

- **[GATE] Run the loop in armed mode on this repo for at least a week, then publish the real
  evidence.** Every piece of copy in this branch is honest about the current state: the
  maker/checker loop is wired and exercised once (`examples/demo-app/runs/2026-06-26T11-46-00Z/`),
  never armed on a live repo. A skeptical reader will find this in about the time it takes to
  read `docs/audits/`. Close it before launch, not after someone else points it out.
- **[GATE] Verify the GitHub Marketplace listing is live and installable.** The README sells
  `uses: enumind/modonome@v1` as a drop-in Action; `action.yml` has the branding metadata
  Marketplace requires, but nothing in this repo can confirm the listing is actually published
  and searchable. A reader who clicks through to a missing listing is a lost install.
- **[GATE] Confirm the second CODEOWNER is actively reviewing, beyond being named on paper.**
  `.github/CODEOWNERS` already names two owners (`@nateshpp @techseek4vr`), so this may already
  be true rather than a recruiting task, worth confirming rather than assuming either way. A
  bus-factor of two, both reviewing, is a real answer to the "solo project" line of attack; a
  bus-factor of one with a second name on paper is not.
- Register the project at bestpractices.dev for the OpenSSF Best Practices badge (the
  placeholder was removed from the README rather than shipped broken, see the truth-audit
  commit). Add the real badge back once a `PROJECT_ID` exists.
- Enable GitHub Discussions and file the good-first-issues below with labels.
- Post the Show HN draft (`docs/launch/show-hn.md`) and the X thread
  (`docs/launch/x-thread.md`), in that order, only after the two gates above are cleared.

## Infrastructure and DNS (cannot be verified from this environment)

- `site/CNAME` contains `www.modonome.com`; every canonical/OG URL in `site/index.html` is the
  apex `https://modonome.com/`. Confirm at the DNS/GitHub Pages level that the apex redirects to
  or serves identically to the `www` host, so there is no redirect hop or Pages custom-domain
  warning for a visitor landing on the canonical URL.
- The real Content-Security-Policy served to site visitors lives in a Cloudflare Transform Rule,
  not in this repo (see the comment at the top of `site/index.html` and `site/_headers`).
  Confirm the live rule still matches `site/_headers`' reference values; this cannot be audited
  from source.

## Release timing (the pipeline itself needs no setup, it already works)

- `modonome@0.1.0-alpha` is live on npm (`latest`/`alpha` dist-tags), with an active `next`
  edge channel. `publish.yml`/`publish-edge.yml` are OIDC trusted-publishing, already exercised.
  **Do not treat this as unfinished plumbing.** The only owner decision is *when* to cut the
  next tagged release and what the CHANGELOG highlights section should say at that point
  (`CHANGELOG.md` already has an `## [0.1.0-alpha]` highlights digest ready to extend).

## Good first issues to file

Each of these is scoped, has clear acceptance criteria, and does not require deep context to
start:

1. **New AgentProof false-positive fixture.** Find a real code pattern that trips the ratchet's
   type-escape or coverage checks incorrectly, add a `fixtures/ratchet-diffs/clean/` fixture and
   a test proving it now passes. Template: `fixtures/ratchet-diffs/clean/ts-any-in-string-and-comment.diff`.
2. **Ratchet language coverage gap.** Pick a common assertion or skip idiom in a supported
   language (JS/TS, Python, Java, .NET) not yet recognized, add fixtures and a test. Template:
   the `node-assert-member-call-removal.diff` fix in `scripts/guard-ratchet.mjs`.
3. **A second adapter registration.** Implement the contract in `docs/adapters.md` for a
   different agentic CLI (aider, codex-cli, or similar), register it in `adapters.json`, and
   attach a transcript demonstrating the checklist in that doc. This is also the natural trigger
   for building the deferred `adapter-verify` command (see below).
4. **Gauntlet output polish.** The share line and badge snippet
   (`scripts/gauntlet.mjs`) are new; propose refinements based on real usage (a `--quiet` flag,
   a machine-readable summary line, whatever real users ask for).
5. **Docs nits.** `docs/README.md` still flags `docs/workflow-fixes.md` as unlinked from the
   index (advisory, `check-md-governance`); link it or fold it into a linked doc.
6. **CheckerProof corpus entries** (once the benchmark exists, see below): seeded-defect maker
   diffs matching the categories in the hardened `prompts/roles/checker.txt` rubric (expected-
   value drift, cross-file assertion migration, vacuous-in-spirit assertions).

## Deferred, demand-gated work (ADR-045; do not build ahead of real demand)

Each of these was scoped out of this branch on purpose, with the rationale recorded in
`docs/adr/ADR-045-scope-focus.md`. Build them when the trigger condition is real, not on a
schedule:

- **`adapter-verify` conformance command.** Trigger: a second adapter is proposed (good first
  issue 3 above). Until then, `docs/adapters.md` is the specification a reviewer checks by hand.
- **CheckerProof seeded-defect benchmark.** Trigger: bandwidth for a benchmark that needs
  recurring, owner-run model calls (it cannot be a CI gate: nondeterministic, requires model
  access). When built, it must SKIP with an explicit status in any environment without model
  access, never report a fake zero score, and stay advisory, never a merge gate.
- **Break-the-Ratchet public challenge harness.** Trigger: enough external interest that a
  standing submissions queue has someone to triage it. Until then, the invitation lives in the
  README and routes through the existing AgentProof scenario issue form, which already has a
  human triaging it.
- **A second host-adoption example** (governing a real repo that is not modonome). Trigger: the
  armed-week gate above clears and produces evidence worth generalizing into a second example.

## Notes on what NOT to do

- Do not bump the npm version, cut a git tag, or edit `publish.yml`/`publish-edge.yml` without
  reading this section first: the pipeline works, and version timing is a business decision, not
  a technical one.
- Do not silently widen the `.gitignore` `!examples/demo-app/runs/` exception to other `runs/`
  directories; it was scoped narrowly on purpose after a real evidence-commit was silently
  dropped by the bare `runs/` rule during this work (see the "fix: harden the ratchet" commit).
