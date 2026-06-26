# Plan: Make modonome's autonomy real — runnable agent, robust samples, captured data, CI-proven assurance

## Context

Modonome markets itself as "the autonomous engineering loop" that "writes bounded pull requests" and "proves it cannot merge low-quality work." After multiple build sessions and panel audits, the headline still outruns the code. This plan was produced after five **adversarial, cross-branch expert panels** (autonomy, security, CI/assurance, honesty, sample-apps/data) audited `main`, `origin/claude/practical-tesla-asy9ga`, and current HEAD — with every high-impact finding re-verified by direct file inspection (the prior audits' failure mode was over-charitable review).

The intended outcome: the loop genuinely runs end-to-end, every showcased number/transcript is real and reproducible, the sample apps are runnable enough to exercise a real agent, and the repo's own CI demonstrates the headline claim — completing ADR-025 (self-application conformance).

### Decisions taken (from the user)
- **Agent scope: Both** — a runnable in-repo harness AND a proven, captured end-to-end run.
- **Fabricated data: Replace with real captured.**
- **Sample apps: Expand existing** `examples/`.
- **Deliverable this session: Plan only.**
- **Explicit constraint: avoid conflict/duplication with the `practical-tesla` branch.**

## Relationship to tesla — now merged into `main` (the base for this work)

UPDATE: `practical-tesla-asy9ga` has been **squash-merged into `main`** (commit `173ef22`, "Self-application audit…") and its branch deleted; the remote is now just `origin/main`. So **the base is `origin/main`** — rebase the working branch onto it. All references below to "tesla" mean "the tesla work now living in `main`." Three buckets:

**(1) Tesla already did it — REUSE, do NOT redo:**
- Reworked `modonome-auto.yml` into a two-job maker/checker pipeline (maker=`claude-sonnet-4-6`, checker=`claude-opus-4-8`, distinct identities/models).
- Emptied the fabricated `.modonome/metrics.jsonl`; added `metrics.example.jsonl` (schema-conformant template).
- `build-release-evidence.mjs` -> `RELEASE-EVIDENCE.md` (`--check` gate); `check-self-application.mjs`, `check-checker-engagement.mjs`, `check-work-items.mjs`, learning automation (`audit-learnings.mjs`, `check-learning-traceability.mjs`, `check-promotion-readiness.mjs`).
- Ratchet hardening: **CRLF-bypass, `/dev/null` test-file-deletion bypass, coverage-lowering, `execSync`->`spawnSync`+ref-validation** — all fixed on tesla (real CRITICAL bypasses still live on `main`).
- `validate-work-item.mjs` fail-open fix (merge_ready with no checker_id); truth-pass labeling; `docs/CLAIMS-AUDIT-2026-06-25.md` (verified accurate).

**(2) Tesla left it open — THIS PLAN'S CORE:** it never *runs* the loop (`RELEASE-EVIDENCE.md` states "the engine has not run in armed mode"); no on-demand/local runner exists; sample apps were not expanded; no real transcripts/metrics captured.

**(3) Tesla introduced NEW defects that block a real run — THIS PLAN MUST FIX (verified):**
- **Ordering bug (CRITICAL):** maker sets `state=checking` and is told "Do NOT set checker_id" (`modonome-auto.yml:67-68`), but `validate-work-item.mjs:23` requires `checker_id` when `state in {checking, merge_ready}`, and `ci.yml` runs `check-work-items.mjs` on the maker's PR -> fails before the checker acts. The loop cannot complete.
- **Empty-queue hard-fail (CRITICAL):** maker exports `branch=RUN_BRANCH` unconditionally but pushes it only when there is work; checker `needs: maker` checks out a non-existent ref -> infra failure instead of graceful idle no-op.
- **Checker trust boundary (HIGH):** checker checks out the maker's branch and runs `npm run verify` — gate code the maker could have edited on a protected-path item; base-branch isolation covers only `guard-ratchet.mjs` + `check-style.mjs`, not drift/tests/agentproof/the new gates or the maker/checker prompts.

**Reconciliation where user choice differs from tesla:** tesla *labeled* the simulated transcripts/WALKTHROUGH illustrative; the user chose *replace with real captured*. This plan supersedes tesla's labeling for those specific artifacts by regenerating them from a real run.

## Merge governance: full autonomy without maker = merger

Principle: the agent that authors a change (maker) must never be the authority that merges it — yet the pipeline stays hands-off. Autonomy is preserved by making the **merger a deterministic rule set, not a person and not the maker**:

- **Maker = build agent.** It only pushes a wave branch and opens a PR. It never runs a merge command; its token has no direct-push access to `main`.
- **Merger = GitHub branch protection + auto-merge.** `main` requires the `ci` status checks (verify + ratchet, with gate scripts loaded from the base branch so a PR cannot weaken what judges it). Auto-merge is enabled on each wave PR; GitHub performs the merge the moment required checks pass. No human approval is required (that would break autonomy) and the maker cannot self-merge (merge authority is the ruleset, outside its write scope).
- **Checker = a full independent checker agent on EVERY wave PR (decided).** A distinct-model subagent that did **not** author the diff reviews it against the wave's work item and records `checker_id`/`checker_model` distinct from the maker. To stay cheap it runs **in the loop session** (API tokens only, inside the 250k budget — not as an extra GitHub Actions agent job), scoped to the **PR diff only**, on the **cheapest model that differs from the wave's maker** (e.g. Sonnet checker over a Haiku/Sonnet maker; Opus checker only on governance-touching waves WS-0/WS-D/WS-F). Its pass is posted as a required status (`modonome/independent-checker`). Crucially, the deterministic gate `check-work-items.mjs` (loaded from base, inside `ci/verify`) independently enforces `maker_id != checker_id` and `maker_model != checker_model`, so a forged checker pass cannot merge — the separation is enforced by base-branch code the maker cannot alter, not by trust in the poster.
- **Prune.** "Automatically delete head branch" on merge keeps the remote lean (matches the existing pattern: tesla merged and was deleted; remote is just `main`).

**Guardrail setup (free, at execution start, authorized):** enable branch protection on `main` requiring status checks `ci/verify` + `ci/ratchet` + `modonome/independent-checker` with **no human-review requirement** (human review would break autonomy), and enable "automatically delete head branches." These are GitHub config changes with zero compute/token cost.

**Cost controls (the "no cost" constraint):** branch protection + auto-delete are free config. The only spend is the in-loop checker (bounded: diff-only, distinct-minimal model) which is already inside the 250k backstop. The WS-D dogfood job that runs an agent *in CI* stays on push-to-main / nightly, never on PRs, so per-PR CI is fast and cheap. No always-on agent cost is introduced.

This dogfoods modonome's own maker/checker/merger separation on the build itself, while staying fully autonomous: maker (build agent) proposes, an independent distinct-model checker signs off, and GitHub's ruleset merges — three separate authorities, no human in the loop.

## Model-assignment scheme (token & schedule efficiency)

Two distinct decisions:
- **Build models** (who executes a workstream): **Haiku 4.5** = mechanical/bulk; **Sonnet 4.6** = standard implementation; **Opus 4.8** = high-judgment design, agent-harness logic, assurance-gate/security semantics, adversarial verification.
- **Runtime models** (the agent roles): tesla set maker=Sonnet 4.6, checker=Opus 4.8. For the *deterministic dogfood demo*, use a **Haiku 4.5 maker** with a **Sonnet 4.6 checker** to keep CI cheap while preserving `require_distinct_maker_checker_model`.

## Workstreams

### WS-0 — Guardrails + rebase onto `main` + fix the run-blocking defects (sequential prerequisite) · **Opus 4.8** (semantics) + **Haiku 4.5** (mechanical)
First, set up the free merge guardrails (see "Merge governance"): enable branch protection on `main` (required checks `ci/verify` + `ci/ratchet` + `modonome/independent-checker`, no human-review requirement) and "automatically delete head branches" via the GitHub API. Rebase the working branch onto `origin/main` (which now contains tesla, squashed at `173ef22`); confirm main's gates pass. Then fix bucket-(3) defects so a real cycle can complete:
- **Lifecycle ordering (Opus):** decide and implement the correct contract — `checker_id` required only at `merge_ready`, not `checking` (a `checking` item legitimately has no checker yet). Update `scripts/validate-work-item.mjs` + `check-work-items.mjs` accordingly; this is a governance-semantics call, not a mechanical edit.
- **Empty-queue graceful no-op (Haiku):** maker emits a `has_work` output; gate the checker job on `if: needs.maker.outputs.has_work == 'true'`.
- **State enum (Haiku):** confirm tesla's `completed`->`done` fix is carried; assert no invalid enums remain.
Files: `scripts/validate-work-item.mjs`, `scripts/check-work-items.mjs`, `.github/workflows/modonome-auto.yml`.

### WS-H — Runner & model configuration layer (cost control; runs right after WS-0) · **Sonnet 4.6** (schema/resolution) + **Haiku 4.5** (docs/templating)
Goal: every **cost-bearing** agent run — build maker, per-wave checker, WS-C capture, WS-D dogfood, and the runtime `modonome-auto` maker/checker — reads **where it runs** and **which model** from one intuitive config with safe defaults, so an operator can move spend onto their own hardware/local models without editing code.
- Extend `.modonome/config.yaml` (reuse `scripts/validate-config.mjs` + schema; it already has `local_model_only_by_default`, `remote_model_budget_usd_per_day`, `require_distinct_maker_checker_model`) with a `roles`/`runners`/`models` map:
  - `roles.{maker,checker,dogfood}.runner`: `local` | `container`
  - `roles.{maker,checker,dogfood}.model`: a model id or a local-model alias
  - `runners.local`: a self-hosted runner label (e.g. `[self-hosted, mac-mini]`) and/or the local CLI path
  - `runners.container`: GitHub-hosted (`ubuntu-latest`) / Claude Code container
  - `models`: registry of hosted Claude ids + optional local endpoints (provider/base_url) for Mac-mini-hosted models
- `scripts/agent/run-cycle.mjs` (WS-B) resolves role -> `{runner, model}`; CLI flags `--runner`/`--model` override.
- Workflows template `runs-on` and the model env from config, so a role flips container<->mac-mini and hosted<->local without hand-editing YAML (a small generator or a documented matrix kept in drift-check).
- Enforce `require_distinct_maker_checker_model` at config load (maker.model != checker.model).
- Docs: a one-glance table — "to run role X on the Mac mini with model Y, set …".
Consumed by WS-B, WS-C, WS-D, and `modonome-auto.yml`. **Decided scope:** (1) **Models = hosted Claude ids AND local/open models** — the `models` registry carries a local endpoint (Ollama/LM Studio on the Mac mini) so any cost-sensitive role can run on a free local model; `require_distinct_maker_checker_model` is enforced across hosted and local alike. (2) **Runners = Mac mini is usable both ways** — as a GitHub **self-hosted runner** for cost-bearing CI jobs (`runs-on: [self-hosted, mac-mini]`) and as the **host for the local `npm run demo:agent` harness**; `container` means GitHub-hosted / the Claude Code container. Every cost-bearing item (build maker, per-wave checker, WS-C capture, WS-D dogfood, runtime maker/checker) is thus flippable between Mac mini and container, and between local and hosted models, from one config with safe defaults.

### WS-A — Make the sample apps actually runnable + plant real, detectable debt (Pillar 2) · **Sonnet 4.6** (debt design) + **Haiku 4.5** (boilerplate)
Verified problem: demo-app has **zero test files** (declares `node --test tests/*.test.js`), node-typescript references **vitest** and python-service references **pytest** — neither installed; the tech debt is narrated in comments, not detectable. Expand the three existing stacks so gates genuinely run:
- **demo-app:** add `tests/` (real `node --test` suite + dev deps), an `index.js` entry, and 2–3 more services; plant debt that a gate or `dry-run` can actually detect (untested high-churn `OrderService.refund` branches with a thin strengthenable test; a reachable dead `ENABLE_LEGACY_CHECKOUT` branch; a null-guard gap with a failing-input test). **Remove the fiction comments** ("Modonome's PR removed it").
- **node-typescript / python-service:** add the missing dev deps (vitest / pytest+ruff) so `lint`/`typecheck`/`test` run; expand to a real but small failing/weak test the agent can strengthen without tripping the ratchet.
Each debt item must be **bounded, gate-fenced, and ratchet-safe** (net assertions >= 0). Haiku scaffolds configs/harness; Sonnet designs the realistic debt. **Parallel across the 3 stacks.**

### WS-B — In-repo runnable agent harness (Pillar 1: the "harness" half) · **Opus 4.8** (core) + **Sonnet 4.6** (IO)
Add an on-demand, deterministic, non-cron runner so a developer and the dogfood CI job can run a full maker->checker cycle without armed cron secrets — the missing piece tesla left open:
- `scripts/agent/run-cycle.mjs` driving Claude Code CLI in both roles, **reading the maker/checker prompts from versioned files** `prompts/roles/{maker,checker}.txt` (extracted from `modonome-auto.yml` so the CI workflow and this script share one CODEOWNER-protected source — also closes the prompt-tampering half of the trust-boundary finding).
- Targets a sample app (`--target examples/demo-app`); enforces turn cap, `remote_model_budget_usd_per_day`, distinct maker/checker models, pinned model ids; writes a real transcript to `examples/<app>/runs/<ts>/` and appends real metrics.
- `npm run demo:agent`.
Opus owns orchestration, separation-of-duties wiring, determinism + cost controls (security-sensitive); Sonnet does arg parsing, IO, transcript capture. Sequential after WS-A; Opus design can start in Wave 1.

### WS-C — Capture real proof artifacts (Pillar 1 "proof" + Pillar 3 data + honesty replace) · **Sonnet 4.6** (curate) + **Opus 4.8** (verify) · runtime: **Haiku maker / Sonnet checker**
Run WS-B against expanded `examples/demo-app`, then commit the **real** outputs:
- Replace each `examples/*/dry-run-transcript.txt` with a captured real transcript; regenerate `WALKTHROUGH.md` from the real run (or reduce it to a pointer to `runs/<ts>/`).
- Seed a real Tier-1 work item + a real `metrics.jsonl` produced by the cycle (using the correct `event` field — note tesla standardized the schema on `event`, fixing the old `report.mjs` `e.event` vs `e.type` bug).
- Have `build-release-evidence.mjs` ingest the captured run so `RELEASE-EVIDENCE.md` upgrades from "has not run" to a real diff/transcript/metrics summary.
- Opus verifies artifacts are genuinely reproducible (re-run determinism; no hand-editing). Sequential after WS-B.

### WS-D — Dogfood CI assurance job + close the trust boundary (Pillar 4: ADR-025) · **Opus 4.8** (gate/security semantics) + **Sonnet 4.6** (YAML)
A CI job that runs WS-B on `examples/demo-app` under a hard budget and **proves the headline non-vacuously** (verified gap: today a README typo passes every gate). Opus designs:
- **Non-vacuous assertion** `scripts/agent/assert-governed-change.mjs`: fail unless the produced change is governance-relevant — touches a test file with net assertions >= 0 *and* a real gate was exercised, or a protected path with an escalation. Fail if the diff is empty/trivial.
- **Negative control:** a CI step that mutates the app so no valid fix is possible and asserts the job **goes red** (proves the check has teeth).
- **Trust-boundary fix:** in the checker job, load *all* deterministic gates and the role prompts from the base branch (`git checkout origin/<base> -- scripts/check-*.mjs prompts/roles/ package.json`) before `npm run verify`, extending tesla's ratchet/style isolation to the whole suite.
- Determinism/cost: pinned Haiku maker, max-turns, budget cap, timeout; publish transcript+metrics via `actions/upload-artifact`.
Sonnet writes the YAML + artifact wiring. Files: `.github/workflows/ci.yml` (new `dogfood` job), `.github/workflows/modonome-auto.yml` (base-branch gate/prompt load), `scripts/agent/assert-governed-change.mjs`. Sequential after WS-B/WS-C.

### WS-E — Quality data corpus, golden outputs, and empty-state bite (Pillar 3) · **Sonnet 4.6** (curate) + **Haiku 4.5** (bulk)
Build data that serves both testing and showcase, asserted **deterministically without model calls**:
- `fixtures/scenarios/<id>/` — tech-debt scenario specs (stack, detect-pattern, agent task, gates, expected outcome) reusing AgentProof style.
- `fixtures/agent-runs/<id>/` — **real** captured maker->ratchet->checker traces (from WS-C), including at least one ratchet-reject-then-retry trace.
- Fill ratchet-attack language gaps (`fixtures/` covers only JS clean/gaming; agentproof covers more) and add **negative-control fixtures that prove the empty-vacuous tesla gates fire**: a ghost-checker `metrics` fixture that makes `check-checker-engagement.mjs` FAIL, a bootstrap learnings fixture, and work-item identity/edit-set fixtures. Add `node --test` suites replaying all of the above.
Sonnet curates + authors goldens/negative controls; Haiku generates bulk fixture files. **Parallel with WS-A.**

### WS-F — Website honesty + new-attack-surface hardening · **Sonnet 4.6** + **Haiku 4.5**
- **Site (verified):** `site/index.html:613` hardcodes `{lessons:4, rules:9, gates:7, queue:5}` and `:240/:909` still say `GOVERNED`. Drive these from real `RELEASE-EVIDENCE`/`report` output via `sync-site-data.mjs`, finish tesla's `GOVERNED`->`HARDENED` relabel on every surface (`site/repo-data.js`, `site/content/features.json`, `site/index.html`, `agentproof/README.md`), and gate site deploy on "no synthetic data / data matches HEAD."
- **Edit-set enforcement (Opus-reviewed, Sonnet-built):** `scripts/check-edit-set-compliance.mjs` — fail a PR whose changed files fall outside the work item's `allowed_edit_set` (today prompt-enforced only; the maker runs `--dangerously-skip-permissions`). Add as a CI gate.
Haiku does mechanical relabels; Sonnet builds the sync + gate.

### WS-G — Final adversarial cross-verification · **Opus 4.8**
A skeptical pass that re-audits every claim this plan touches against code, confirms **no new simulated artifact** was introduced, runs the WS-D negative control to prove non-vacuity, verifies the trust-boundary and edit-set gates actually block a crafted attack, and updates `docs/CLAIMS-AUDIT-2026-06-25.md` verdicts (PARTIAL/ASPIRATIONAL -> DELIVERED only where now genuinely code-backed). Opus, because over-charitable verification is the exact failure history. Sequential, last.

## Schedule (parallel vs sequential)

- **Wave 1:** WS-0 first (guardrails + rebase + run-blocker fixes), then **WS-H** (runner/model config — it shapes every cost-bearing wiring), then in parallel WS-A (apps) || WS-E (corpus) || WS-B design (Opus).
- **Wave 2 (sequential):** WS-B implement -> WS-C capture.
- **Wave 3:** WS-D dogfood CI + trust-boundary fix || WS-F site/edit-set.
- **Wave 4:** WS-G adversarial verify.

Token economy: Haiku absorbs all boilerplate/bulk/relabels; Sonnet does standard implementation and the runtime demo maker; Opus is reserved for the four places a wrong call reintroduces the gap — lifecycle semantics (WS-0), harness logic (WS-B), assurance/trust-boundary semantics (WS-D), and the final audit (WS-G).

## Critical files

- **Create:** `scripts/agent/run-cycle.mjs`, `scripts/agent/assert-governed-change.mjs`, `scripts/check-edit-set-compliance.mjs`, `prompts/roles/{maker,checker}.txt`, `examples/*/tests|test/*`, `examples/demo-app/{index.js,runs/<ts>/*}`, `fixtures/scenarios/*`, `fixtures/agent-runs/*`, new `tests/*.test.mjs`.
- **Modify:** `scripts/validate-work-item.mjs`, `scripts/check-work-items.mjs`, `.github/workflows/{ci.yml,modonome-auto.yml}`, `examples/*/src|app/*`, `examples/*/dry-run-transcript.txt`, `examples/demo-app/WALKTHROUGH.md`, `examples/*/package.json`/`pyproject.toml`, `.modonome/metrics.jsonl`, `.modonome/work-items/`, `package.json`, `site/{index.html,repo-data.js,content/features.json}`, `scripts/sync-site-data.mjs`, `docs/CLAIMS-AUDIT-2026-06-25.md`.
- **Reuse unchanged (tesla):** `build-release-evidence.mjs`, `check-self-application.mjs`, `check-checker-engagement.mjs`, `guard-ratchet.mjs` (hardened), learning scripts, `agentproof/runner.mjs`.

## Verification (end-to-end)

1. **Base + blockers:** on the tesla-rebased branch, `npm run verify` + tesla's gates pass; a work item in `state=checking` with no `checker_id` validates; an empty queue makes the autonomous workflow a clean no-op (no infra failure).
2. **Apps run for real:** in each `examples/*`, `lint`/`typecheck`/`test` execute and pass with deps installed; the planted debt is detectable by a gate or `dry-run`, not just narrated.
3. **Harness runs:** `npm run demo:agent -- --target examples/demo-app` produces a non-empty diff, a transcript under `runs/<ts>/`, and appended `metrics.jsonl`; maker and checker models differ; budget/turn caps honored.
4. **Artifacts real:** every value in `WALKTHROUGH.md`/`RELEASE-EVIDENCE.md`/`metrics.jsonl` traces to a captured run; re-running reproduces equivalent artifacts; `build-release-evidence.mjs --check` and the no-synthetic-data site gate are green.
5. **CI proves the claim (non-vacuously):** the `dogfood` job runs the agent, asserts a governance-relevant change + all gates + ratchet-from-base + separation + edit-set compliance, uploads artifacts, and **goes red under the negative-control mutation**. The checker job runs gates+prompts loaded from base.
6. **Corpus has bite:** `node --test` golden + negative-control suites pass with no model calls, including a fixture that makes `check-checker-engagement.mjs` fail.
7. **Audit:** `CLAIMS-AUDIT-2026-06-25.md` updated; WS-G confirms no new fiction and that upgraded verdicts are genuinely code-backed.
