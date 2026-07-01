# Claims audit, 2026-07-01

A re-verification of [claims-audit-2026-06-25.md](claims-audit-2026-06-25.md) against
current code, six days later, plus one new defect found and fixed in the same pass. This
is a differential audit: every row below either cites new evidence that closes it, carries
forward a still-open row from the prior audit unchanged, or reports a new finding. Rows not
mentioned here retain their 2026-06-25 verdict; this pass did not re-verify every claim in
the prior audit, and says so rather than implying a full re-sweep.

## Verdict legend

Same as the prior audit: **DELIVERED**, **PARTIAL**, **ASPIRATIONAL**, **MISLABELED**,
**BUG**. Verdicts are deliberately uncharitable.

## New finding: ADR numbering collision (this pass)

`docs/adr/ADR-032-oss-adapter-boundary.md` (PR #75) and `docs/adr/ADR-032-repo-snapshot.md`
(PR #85) both claimed ADR-032, added twelve hours apart on the same day. Root cause:
`scripts/check-md-governance.mjs`'s ADR-number-uniqueness check only ever compared
`docs/adr/` against `docs/research/`; `adrNumbers()` built a `Map` keyed by number inside
a single directory, so a same-directory duplicate silently overwrote its own entry and
never reached the violation check. The gate that `docs/guidelines/markdown-governance.md`
advertises as machine-enforced ("no `ADR-NNN` reused") could not, in fact, catch the one
class of collision most likely in practice: two same-day PRs each picking the same "next
free number" without seeing each other's uncommitted file.

**Status: CLOSED in this pass.** `adrNumbers()` now collects all files per number and
flags any count greater than one, before the existing cross-directory comparison.
`docs/adr/ADR-032-repo-snapshot.md` is renamed to `docs/adr/ADR-033-repo-snapshot.md`
(zero code references, versus five for the oss-adapter-boundary file, so it was the
lower-blast-radius file to move). A regression test
(`tests/check-md-governance.test.mjs`) and a permanent adversarial scenario
(`agentproof/scenarios/ap-36-adr-number-uniqueness.mjs`, now part of the extended
AgentProof suite) both assert the fixed behavior so this class of bug cannot silently
regress. See `CHANGELOG.md` for the release-facing entry.

## Rows closed in this pass

| Prior claim (2026-06-25) | Current evidence | Verdict |
|---|---|---|
| "CI runs 'the config and packet validators'... Only drift/style/ratchet/AgentProof run in `ci.yml`" | `.github/workflows/ci.yml`'s `ratchet` job runs 16 sequential steps: snapshot freshness, governance-relevant-change assertion, drift guard, style check, repo hygiene, markdown governance, license/adapter-boundary, prompt behavioral regression, learning traceability, promotion readiness, work-item validation, checker engagement, tests, AgentProof, and the ratchet itself. `scripts/check-work-items.mjs` (CI-wired) imports and calls `validateWorkItem` from `validate-work-item.mjs` directly, so that named validator runs in CI, beyond being merely defined. | CLOSED |
| "AgentProof harness (16 scenarios)" / "'16/16 GOVERNED' label... rename to '16/16 HARDENED'" | The suite grew past this twice since the prior audit: ADR-027 expanded it to 25 normative scenarios (AP-01 through AP-26, AP-20 intentionally unassigned) and relabeled to HARDENED; nine more (AP-27 through AP-35) were added as an extended suite. `agentproof/README.md` and the npm badge already read "25/25 HARDENED", not "16/16 GOVERNED" or "16/16 anything" as of this audit. This pass adds a 36th (10th extended) scenario, so current state is 25/25 normative plus 10/10 extended, 35 total. The prior audit's suggested remediation (rename to "16/16 HARDENED") was overtaken by events and never updated. | CLOSED |
| "ADR-022/024/025/026 scripts missing (implement `audit-learnings.mjs`, `check-learning-traceability.mjs`, `check-promotion-readiness.mjs`...)" | All exist on disk and are CI-wired: `scripts/audit-learnings.mjs`, `scripts/check-learning-traceability.mjs`, `scripts/check-promotion-readiness.mjs`, `scripts/check-checker-engagement.mjs`. | CLOSED |
| "`main` is unprotected (`\"protected\": false`)" | Verified live via GitHub API (`list_branches`, 2026-07-01): `main` reports `"protected": true`. | CLOSED |
| "About 30 stale branches exist" | Verified live via GitHub API (2026-07-01): 9 branches total in the repository. | CLOSED |
| "Six consecutive pushes to `main` completed failure and merged anyway" | Verified live via GitHub Actions API (2026-07-01): the 30 most recent CI runs on `main` all report `"conclusion": "success"`. | CLOSED |

## Row improved, not fully closed

**"Maker, checker, merge authority distinct" (prior verdict: PARTIAL, "enforced in
`validate-work-item.mjs` only; never invoked by CI or the live loop").**
`.github/workflows/modonome-auto.yml` now runs a workflow-level fast-fail step ("Guard
against same model for both roles") that exits 1 if `MAKER_MODEL` equals `CHECKER_MODEL`
before either role runs, and its header comment states CI additionally checks
`maker_id`/`checker_id` distinctness via `check-work-items.mjs` on the resulting pull
request. This is real, machine-checked separation of duties at the workflow level, an
improvement over "validator-only." It is not verified end to end in this pass: the loop
requires `MODONOME_ARMED=true` to run for real, this repository does not appear to have
armed it yet (the most recent commits are human-authored, not maker/checker-attributed),
and this audit did not trace a live run through to a merged, checker-reviewed pull
request. **Verdict: PARTIAL, improved.** A future audit should verify a real armed run
rather than the workflow definition alone.

## Rows intentionally not re-verified in this pass (carried forward from 2026-06-25)

These keep their prior verdict because this pass was scoped to documentation and ADR
governance sync, not a full capability re-audit:

- "There is no autonomous engine in this repository": worth flagging that
  `scripts/agent/run-cycle.mjs`, `scripts/agent/openai-client.mjs`, and
  `scripts/agent/tool-loop-adapter.mjs` now exist where the 2026-06-25 audit found only a
  prompt-bundler and validators. Whether this now constitutes a real, exercised engine
  (as opposed to unarmed code that has never produced a live merged PR) needs its own
  dedicated audit; this pass does not have the evidence to call it either way.
- Learning loop, market-researcher role, cross-repo knowledge network, enterprise
  multi-stack, "writes PRs" present-tense marketing language: unchanged. One correction
  to the prior audit's framing, not the claims themselves: ARCHITECTURE.md already states
  outright ("The cross-repo knowledge network is roadmap, not shipped, see ADRs 014
  through 019") and ADRs 014-019 already carry `Status: Proposed`, not `Accepted`, so the
  narrative documentation is honest here. `scripts/poll-network.mjs` is still absent
  (confirmed this pass), so the underlying feature gap the prior audit found is real and
  still open. It is a feature gap now, not also a documentation-accuracy problem.
- Security/compliance controls described as code versus prompt-enforced: unchanged.
- Conformance "Level 3" self-assessment: unchanged.

## Also fixed in this pass (documentation accuracy, not audit scorecard rows)

- **ARCHITECTURE.md claimed "three execution contexts"; a fourth already existed.**
  `scripts/mcp-server.mjs` is a fully implemented stdio MCP server (its own ADR-009, its
  own test file) exposing seven governance tools. It was absent from "The pieces," the
  "Where Modonome runs" diagram, and the four-questions framing. Corrected to four
  contexts with the MCP server added to both.
- **The agent-loop diagram omitted real state-machine states.** `rework`→`making` was
  shown as an edge label only; `escalated` and lease-expiry reversion to `queued`
  (`prompts/modules/state-machine.md`) were not represented at all. Added.
- **ADR-002 and ADR-025 used "shadow mode" inconsistently.** ADR-002 (2026-06-24) removed
  shadow-mode references from docs as unimplemented and filed WI-011 for v0.2. ADR-025
  (2026-06-25, the next day) reintroduced the term as a settled activation-ladder rung
  with no cross-reference. ADR-025 now links back to ADR-002 and marks that rung as
  contingent on WI-011 shipping, not a claim that shadow mode exists today.
- **Stale ADR-032 references.** Four files (`ROADMAP.md`, `CHANGELOG.md`, `ARCHITECTURE.md`,
  `scripts/check-self-application.mjs`) referenced the repo-snapshot decision by the bare
  number "ADR-032" in prose; these now correctly say "ADR-033" after the renumbering.
- **`docs/README.md`'s ADR count** said "32 accepted ADRs" while 33 files already existed
  (the duplicate ADR-032 pair made the count technically match the file count by
  coincidence). Now says 33, correctly, post-renumbering.

## Remediation map (updated)

| Gap | Action | Status |
|---|---|---|
| ADR-uniqueness gate could not catch same-directory collisions | Fixed `check-md-governance.mjs`; added regression test and AgentProof scenario AP-36 | **CLOSED this pass** |
| `report`/metrics field mismatch, synthetic metrics, `bin/` protection mismatch | n/a | CLOSED 2026-06-27 (per prior audit; not re-verified this pass) |
| "16/16 GOVERNED" label | Suite expanded to 25/25 HARDENED plus extended scenarios; badge already correct | **CLOSED, overtaken by events** |
| `main` unprotected, red CI merged, stale branches | Branch protection enabled, CI green, branches pruned | **CLOSED this pass (verified live)** |
| ADR-022/024/025/026 scripts missing | All exist and are CI-wired | **CLOSED this pass (verified on disk and in `ci.yml`)** |
| Maker and checker not distinct in the loop | Workflow-level model-distinctness gate added to `modonome-auto.yml` | **PARTIAL, improved: live armed run still unverified** |
| Learning loop, market-researcher, knowledge-network, multi-stack present-tense claims | ARCHITECTURE.md already correctly labels network as roadmap; other surfaces not re-checked this pass | OPEN (narrower scope than before) |
| Security/compliance controls described as code | n/a | OPEN (not re-checked this pass) |
| Level 3 conformance overstated | n/a | OPEN (not re-checked this pass) |
| ARCHITECTURE.md "three execution contexts" omitted the MCP server | Corrected to four contexts, MCP server documented | **CLOSED this pass** |
| Agent-loop diagram omitted `rework`/`escalated`/lease-expiry states | Diagram updated to match `prompts/modules/state-machine.md` | **CLOSED this pass** |
| ADR-002/ADR-025 "shadow mode" terminology conflict | ADR-025 cross-references ADR-002 | **CLOSED this pass** |

## Source

This audit was produced by a direct, file-and-line-cited re-verification against the
running repository and live GitHub state on 2026-07-01, cross-reviewed by a five-person
panel (documentation quality, software architecture, CI automation, governance and
compliance, and adopter experience) before the fixes above were implemented. It
deliberately narrows scope rather than re-asserting the full prior audit from memory;
rows outside that scope are marked as such above instead of silently carried over.
