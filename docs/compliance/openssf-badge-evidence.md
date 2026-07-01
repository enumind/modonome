# OpenSSF Best Practices badge evidence

This document maps the OpenSSF Best Practices badge criteria to concrete artifacts in
this repository. It is the working record used to fill the questionnaire at
https://www.bestpractices.dev and to track the criteria that are not met yet. It is a
transparency document, not a certification.

Status keys: **Met** (an artifact satisfies the criterion today), **Partial** (some
evidence exists, work remains), **Gap** (not satisfied yet, with the remediation named).

## Passing level

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Project description and home | Met | `README.md`, `homepage` in `package.json` |
| FLOSS license (OSI) | Met | `LICENSE` (MIT), `license` in `package.json` |
| Project documentation | Met | `README.md`, `ARCHITECTURE.md`, `ADOPTION-GUIDE.md`, `QUICKSTART.md` |
| Public version-controlled source | Met | `github.com/enumind/modonome` |
| Unique versioned releases | Met | semver, `scripts/release.mjs`, npm `modonome` |
| Release notes | Met | `CHANGELOG.md` |
| Bug reporting process | Met | `.github/ISSUE_TEMPLATE/`, `CONTRIBUTING.md` |
| Vulnerability report process | Met | `SECURITY.md` (private GitHub security advisory) |
| Working build from source | Met | `npm ci`, zero runtime dependencies |
| Automated test suite | Met | `tests/` (Node test runner), `ci.yml` |
| New-functionality testing policy | Met | `CONTRIBUTING.md`, PR template |
| Warning flags and clean style | Met | `scripts/check-style.mjs`, `scripts/check-drift.mjs` |
| Secure development knowledge | Met | `SECURITY.md` threat model, ADRs |
| Use of basic good crypto practices | N/A | no cryptography shipped yet (see follow-up PR on signing) |
| Delivered over HTTPS | Met | npm and GitHub over HTTPS |
| Static analysis | Met | `.github/workflows/codeql.yml` (security-and-quality) |
| Automated tests run on PRs | Met | `.github/workflows/ci.yml` (ratchet and verify jobs) |

## Silver level (selected)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| DCO or CLA | Partial | sign-off note in `CONTRIBUTING.md`; enforce in a later PR |
| Governance and roles documented | Met | `GOVERNANCE.md`, `.github/CODEOWNERS` |
| Code of conduct | Met | `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) |
| Statement coverage 80% or higher | Met | `npm run test:coverage`, CI floor 80% lines (current 80.79%) |
| Static analysis for common vulnerabilities | Met | CodeQL `security-and-quality` query suite |
| Dependencies monitored for vulnerabilities | Met | `.github/dependabot.yml` (npm and github-actions) |
| Signed releases | Partial | npm provenance via `--provenance` in `publish.yml`; key-based release signing tracked in the signing PR |
| Hardening | Met | off-by-default arming, base-branch ratchet, `agentproof/` 25/25 |
| Two-person review continuity | Gap | see gap ledger |

## Gold level (selected)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Branch coverage 80% or higher | Gap | measured branch coverage 68.4%, CI floor 66%; see gap ledger |
| Two unassociated significant contributors | Gap | see gap ledger |
| Bus factor of two or more | Gap | see gap ledger |
| Code review before merge for most changes | Partial | CODEOWNERS plus required checks; two-person review pending a second maintainer |
| Reproducible build | Partial | `npm ci` from a committed lockfile; no independent attestation service |
| Cryptographic signing of releases | Gap | Ed25519 signing designed in ADR-017, implementation tracked in the signing PR |
| Continuous integration | Met | `ci.yml`, `codeql.yml`, `scorecard.yml` |

## Gap ledger

These criteria are not met today. They are recorded here rather than claimed.

1. **Branch coverage 80% (gold).** Measured branch coverage is 68.4% over library and
   CLI code (lines 81.5%, functions 85.2%), with the CI branch floor ratcheted to 66%.
   Two factors keep the measured number below 80%: many CLI scripts are
   integration-tested through subprocesses, which in-process coverage does not count, and
   the `agentproof/` scenarios (exercised by the AgentProof gate) are excluded as test
   assets. Remediation toward gold: expose pure functions from the larger CLI scripts so
   their branches are measured in process, then raise the floor. Tracked. The floor is
   held below the line floor on purpose so the gap stays visible and ratcheted.
2. **Two unassociated significant contributors and bus factor of two (gold).** The
   project is single-maintainer today (`@nateshpp` in `.github/CODEOWNERS`). This is a
   people criterion that code cannot satisfy. Remediation: add a second maintainer, then
   update `GOVERNANCE.md` and `CODEOWNERS` to require two-person review on protected paths.
3. **Two-person review of changes (silver and gold).** Depends on item 2. The branch
   protection and CODEOWNERS structure is ready to require it once a second reviewer exists.
4. **Cryptographic release and artifact signing (gold).** npm provenance is in place.
   Ed25519 signing of work items, knowledge packets, and release evidence is designed in
   `docs/adr/ADR-017-knowledge-network-packet-signing.md` and tracked as a dedicated PR.
5. **DCO enforcement (silver).** A sign-off note exists in `CONTRIBUTING.md`. Enforcing it
   in CI is tracked.

## Notes

- The repository adds a deterministic guard against agent identity leaking into git
  history: `scripts/check-repo-hygiene.mjs` rejects branch names that lead with a
  model-identifier prefix and commits authored or committed by a coding-agent identity.
- OpenSSF Scorecard runs in `.github/workflows/scorecard.yml` and publishes to the
  Security tab and the public Scorecard API.
