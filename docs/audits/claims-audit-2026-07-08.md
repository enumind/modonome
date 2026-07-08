---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-08
supersedes: docs/audits/claims-audit-2026-07-01.md
---

# Claims audit, 2026-07-08

A re-verification focused on the branch of work that produced it: truth reconciliation
(README, walkthrough, AgentProof framing), watchable gate-integrity evidence, ratchet
hardening, documentation restructuring, and a CLI-permission change to the maker/checker
loop. This is a differential audit, same convention as the prior two: a row either cites new
evidence that closes it, carries forward a still-open row unchanged, or reports a new finding.
Rows outside this session's scope are not re-verified and say so, rather than implying a full
sweep. Verdicts are deliberately uncharitable.

## Verdict legend

Same as prior audits: **DELIVERED**, **PARTIAL**, **ASPIRATIONAL**, **MISLABELED**, **BUG**.

## Verified this pass

| Claim | Evidence | Verdict |
|---|---|---|
| The demo walkthrough describes what actually happened | `examples/demo-app/WALKTHROUGH.md` now describes one dry-run and one recorded, unapplied maker/checker cycle, plus a deterministic ratchet-block-and-pass pair. Every sentence links to a committed file under `examples/demo-app/runs/`. | **DELIVERED** |
| The gate-rejection evidence is real, not staged prose | `examples/demo-app/runs/2026-07-08T05-30-00Z/` contains the actual patches (`gaming.patch`, `clean.patch`) and verbatim `guard-ratchet.mjs` output including exit codes and SARIF. Reproduced independently during this audit: `node scripts/guard-ratchet.mjs 192b590` against the committed scratch state reproduces `ratchet-block.txt` and `ratchet-clean.txt` byte-for-byte. | **DELIVERED** |
| AgentProof is described as self-graded, not third-party certified | `agentproof/README.md`, the root README, and all three `site/` surfaces (`index.html`, `agentproof/index.html`) now state the scenarios are authored alongside the enforcement code, and that the Sigstore attestation proves provenance, not independent validation. | **DELIVERED** |
| One primary AgentProof number, not two competing headlines | Prose and metadata across README, `agentproof/README.md`, and `site/` now lead with 25/25 exclusively. The three remaining `35/35` strings in the repo (`agentproof/README.md:77`, `site/agentproof/index.html:82,140`) are verbatim transcripts of the runner's actual stdout, re-run and confirmed to match exactly during this audit (`node agentproof/runner.mjs` still prints `Score: 25/25 normative \| 10/10 extended (35/35 total)`), not marketing claims. | **DELIVERED** |
| The tagline claims what the ratchet can prove, not more | `package.json` description and the README hero now describe catching "known structural patterns," and a new README section, "What it catches, and what it cannot," names the semantic gap explicitly and routes it to the independent checker and the Gauntlet. | **DELIVERED** |
| The gitignore-dropped evidence directory was actually fixed, and the fix was verified, not asserted | Verified independently: `git ls-files examples/demo-app/runs/2026-07-08T05-30-00Z/` lists all 8 files as tracked; `.gitignore` carries a scoped `!examples/demo-app/runs/` exception with a comment explaining why, and a plain `git add` (no `-f`) now tracks new files under that path (re-tested during this audit, beyond the original commit message's claim). | **DELIVERED** |
| The ratchet's string/comment stripping is false-positive-only | `stripLineLocalNoise` in `scripts/guard-ratchet.mjs` bails to the raw line on any unclosed quote, unclosed block comment, or a bare slash ahead of a quote. The full existing gaming corpus (12 fixtures) still blocks; two new fixtures (`ts-any-in-string-and-comment.diff`, `ts-any-behind-string-decoy.diff`) prove both the FP fix and that a real cast hidden behind a string decoy on the same line still triggers rejection. Re-run during this audit: all pass. | **DELIVERED** |
| The Node built-in assert-module coverage fix is real, not cosmetic | Before the fix, the committed demo evidence undercounted the gaming diff's assertion removal (`+0 / -1`); after, it correctly reports `+0 / -2` because `assert.match(...)` is now recognized. Re-verified: `grep -c "assert\.\w\+("  tests/*.test.mjs` still shows 2000+ occurrences of this style in the project's own suite, confirming the fix addresses a real, high-frequency gap rather than a hypothetical one. | **DELIVERED** |
| The advisory assertion tally makes no detection claim it cannot support | The code comment in `guard-ratchet.mjs` states plainly that a repo-level sum of per-file deltas cannot go negative without an already-blocking per-file delta, so the tally is informational only. Verified by construction: no test asserts the tally blocks anything, and `printAssertionTallyAdvisory` never touches the exit code. | **DELIVERED** |
| The CLI-permission change is an actual improvement, not a relabeled bypass | Verified empirically during the original work and re-checked here: `--permission-mode manual` plus a scoped `--allowedTools` list denies an out-of-allowlist `rm` cleanly (no hang) while permitting `Edit` and `Bash(git *)`/`Bash(npm *)` operations. This is recorded as a finding, not asserted from `--help` text: an earlier attempt with `--permission-mode acceptEdits` was tested and found to **not** confine execution to the allowlist, so that path was correctly abandoned rather than shipped. | **DELIVERED** |
| The checker rubric addition does not silently break existing behavioral anchors | `scripts/test-prompt-behavior.mjs`'s five fixtures anchor on `prompts/modules/*.md` text, not `checker.txt` content; re-run during this audit, all five still pass. The rubric addition is confirmed purely additive by diff inspection: no existing sentence in `checker.txt` was altered or removed. | **DELIVERED** |
| Present-tense claims about unshipped capabilities were swept | Re-checked the specific files touched: `docs/enterprise.md`, `docs/versioning.md`, `prompts/modules/network.md`, `docs/compliance/compliance.md`, `site/repo-data.js`. Each now carries an explicit roadmap-tense marker ("not shipped," "Milestone 2," "is designed to support"). This closes the 2026-07-01 audit's open row for these five surfaces specifically. | **DELIVERED, narrower scope than the original claim** |
| SUPPORT.md's no-SLA framing does not contradict CONTRIBUTING.md | Found and fixed during this pass: `CONTRIBUTING.md` previously promised triage "within 5 business days," directly contradicting the new SUPPORT.md's honest "no guaranteed response time." `CONTRIBUTING.md` now points to SUPPORT.md instead of carrying its own, likely unkeepable, specific promise. Recorded here because it is exactly the kind of internal-consistency gap this audit exists to catch, and it was introduced by this session's own new file before being caught. | **BUG, found and fixed in the same pass** |

## Carried forward, unchanged (not re-checked this pass)

| Claim | Status |
|---|---|
| Security/compliance controls described as code | OPEN (not re-checked this pass; carried from 2026-07-01) |
| Level 3 conformance overstated | OPEN (not re-checked this pass; carried from 2026-07-01) |

## Still open, and now more precisely scoped

| Claim | What this session did | What remains |
|---|---|---|
| The maker/checker loop has run in armed mode on a live repository | Unchanged: still has not. This session added a scoped `--permission-mode manual` CLI invocation and a deterministic gate-rejection evidence pair, neither of which exercises the armed loop end to end. `OWNER-ACTIONS.md` now states this as a hard gate before any public launch push, not a nice-to-have. | An owner needs to actually arm the loop on this repository for a real period and publish the transcript. |
| The bus-factor-1 characterization | Found during this pass that `.github/CODEOWNERS` already lists two owners (`@nateshpp @techseek4vr`), which the prior skeptical framing (from the review that produced this branch's plan) did not account for since only one has authored commits to date. `OWNER-ACTIONS.md` reframes this as "confirm engagement," not "recruit," but this audit cannot itself verify which is true. | An owner confirms whether the second CODEOWNER is actively reviewing. |
| GitHub Marketplace listing | Not verified in this or any prior audit; `action.yml` carries the branding metadata Marketplace requires, but nothing in the repository can confirm the listing is live. | Owner verification only; added to `OWNER-ACTIONS.md` as a launch gate. |

## Source

Produced by re-running the specific commands and diffs this session's commits claim, not from
memory of what was written: `node scripts/guard-ratchet.mjs`, `node agentproof/runner.mjs`,
`node scripts/test-prompt-behavior.mjs`, `git ls-files`, and direct inspection of the commit
diffs for `docs/adr/ADR-045-scope-focus.md` through the Phase 6 commit. It deliberately narrows
scope to what this session touched rather than re-asserting the full prior audits from memory;
rows outside that scope are marked as such above instead of silently carried over as verified.
