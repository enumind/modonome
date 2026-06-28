# Roadmap

Modonome is in public alpha. The core loop (adopt, dry-run, make, check, gate, merge, learn)
is stable. The items below are planned for future milestones. Dates are targets and may
shift. Each item lands only when its own gates are green.

## Milestone 1 · Public alpha (current)

- Core prompt, schemas, scripts, and templates at schema version 1.
- Anti-gaming ratchet, config and packet validators, drift guard.
- Two runnable examples with captured dry-run transcripts.
- Safe defaults throughout. Cross-repo network ships off and advisory.

## Milestone 2 · Cross-repo knowledge network GA

- Knowledge packet publish and import pipeline out of advisory mode.
- Central catalog design (opt-in, hash-only identity, no ranking).
- Network-level ratchet: imported patterns require local gate validation before adoption.
- Stack-normalized packet taxonomy covering the ten estate types in docs/enterprise.md.

## Milestone 3 · Control panel and metrics dashboard

- Rendered control panel for any repo with a docs or app surface.
- Queue board, lease table, gate panel, cost panel, learning queue, and decision queue.
- Metrics schema at version 1 with cost and quality trend views.
- Accessibility-first, host design system tokens, responsive from 375px.

## Milestone 4 · Enterprise estate adapters

- Mirror mode adapters for mainframe, SAP, Oracle, Salesforce, and ServiceNow estates.
- Platform-specific gate evidence: transport-aware proposals, ACL risk review, metadata diff.
- Owner-gated write-back path for platforms with no ordinary Git change flow.

## Milestone 5 · Market researcher and envisioner roles (stable)

- Market scan available behind a flag (default off; opt-in) with sourced, paraphrased findings only.
- Envisioner produces scoped issue proposals from owner-approved direction.
- Proposal priority score surfaces the highest-value, lowest-risk improvements per week.
- Owner-controlled promotion of proposals into the work queue.

## Milestone 6 · Self-governance hardening

Modonome must govern its own evolution under the same controls it asks a host repo to
adopt. These items turn the soft risks in the current design: prompt drift, prompt
complexity creep, checker rubber-stamping, schema churn, and uncontrolled capability
rollout, into deterministic gates the project runs on itself. The capability promotion
gate (ADR-024) is a prerequisite for shipping Milestone 2 and Milestone 5, since both
expand the engine's authority and attack surface.

- Prompt complexity budget (ADR-020). A `check-prompt-budget.mjs` gate fails CI when the
  core prompt or any module exceeds a token and decision-depth budget, forcing
  modularization before the prompt stops being auditable. Self-applied to `prompts/`.
- Prompt behavioral regression suite (ADR-021). Frozen golden fixtures pin the engine's
  expected decision on a set of canonical scenarios (tier classification, arming refusal,
  untrusted-input handling). CI replays them on every `prompts/` change to catch silent
  behavioral drift, beyond the textual drift that `check-drift.mjs` already covers.
- Anti-rubber-stamp checker telemetry (ADR-022). Metrics capture the checker's
  change-request and diff-modification rate. A ratchet flags a checker that approves a run
  of changes with no findings, closing the checker-gaming gap the maker-checker contract
  leaves open today.
- Config schema migration contract (ADR-023). Every `schema_version` bump must ship a
  migration in `migrate-config.mjs` plus a backward-compatibility fixture proving an
  existing `.modonome/config.yaml` upgrades cleanly. CI blocks a version bump that lacks
  both. Formalizes and gates the migration path the schema evolution risk exposed.
- Capability promotion gate (ADR-024). New roles, the cross-repo network, and market scan
  ship behind flags defaulting off. Promotion to default-on requires an owner ADR plus
  evidence of a fixed observation window in shadow or advisory mode. Prevents an
  expanding-authority feature from becoming default behavior without earned trust.
- Self-application conformance (ADR-025). Modonome runs its own loop on this repo and
  publishes the governed-mode transcript and metrics as release evidence. Dogfooding
  becomes a gate: the tool cannot claim a guarantee it does not demonstrate on itself.
- Learning promotion audit trail (ADR-026). Every promoted learning links to its
  originating correction signal and the deterministic gate it produced, so the
  rule set cannot accumulate unprovenanced entries through silent creep.

---

## Research Direction: Agentic Governance Mesh (Milestones 7+)

**Status:** Exploratory research, not a committed roadmap. See `docs/research/agentic-governance-mesh/`
for full details and research plan.

**Hypothesis:** If we define an open standard for governance packets and validate it on
Modonome's own repo, repositories worldwide could safely share governance knowledge without
a central authority.

**Key research phases (subject to proof-of-concept results):**

- **Phase 1 (Q4 2026):** Governance Packet Protocol (RD-027): Define an open,
  implementation-agnostic format for governance packets. Validate that a third-party tool
  can read and verify packets without Modonome code.

- **Phase 2 (Q1-Q2 2027):** Proof-of-concept on Modonome's own repo. Import learnings
  as GPP packets and validate import/export fidelity.

- **Phase 3 (if Phase 1-2 succeed):** Trust networks and decentralized discovery
  (RD-028), packet lifecycle management (RD-029), and cross-repo feedback loops (RD-030).

- **Phase 4 (future):** Network-level safety mechanisms (RD-031, RD-032).

**Decision gate:** Q2 2027. If the v0.1 experiment succeeds and user feedback supports the
direction, commit to a full mesh roadmap. If it fails, the research informs future strategy
or is deprioritized.

**Why separate from committed roadmap:** Milestones 1-6 ship regardless. Research happens
in parallel and informs 2027+ direction. No dependency; no blocking.
