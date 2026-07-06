# Repo snapshot: modonome

Modonome snapshot. Read this before reading the repo. Tier 0 (signature.json) is the fingerprint: if merkle_root matches your last read, nothing changed. Tier 1 (map.json / map.md) lists modules, public API signatures, import edges, and attention ranking. Cite anchors (F: for files, S: for symbols); each resolves to a path and line so you can act without re-reading the whole repo.

Merkle root: sha256:bd7b14e7b7143e5a3b3409bb76331e570e721a7e144672ee8918c7b5774972fe
Files: 884  Bytes: 3307902  Map tokens: 115479/120000

## Modules

- .design-sync/NOTES.md [F:94b941cbd6]: Design-sync notes for @modonome/design-system
- .design-sync/conventions.md [F:e146bc5acb]: Modonome control-panel design system
- .design-sync/previews/ActivationLadder.tsx [F:2207a6ebce]: @dsCard group="Governance"
- .design-sync/previews/AppShell.tsx [F:2470e60179]: function Dashboard
- .design-sync/previews/ArmingStateBadge.tsx [F:28b7af3c53]: @dsCard group="Governance"
- .design-sync/previews/AuditTimeline.tsx [F:9c9edea0c9]: @dsCard group="Governance"
- .design-sync/previews/Button.tsx [F:f6e100ab45]: @dsCard group="Governance"
- .design-sync/previews/Card.tsx [F:3d505706cd]: @dsCard group="Governance"
- .design-sync/previews/Checkbox.tsx [F:3b4065b679]: @dsCard group="Governance"
- .design-sync/previews/ConfirmDialog.tsx [F:0a6a758e7d]: function ArmEngine
- .design-sync/previews/CostPanel.tsx [F:c63a71fb57]: @dsCard group="Governance"
- .design-sync/previews/DecisionCard.tsx [F:3ce0fd77eb]: @dsCard group="Governance"
- .design-sync/previews/Drawer.tsx [F:41f5ffe77a]: function ItemDetail
- .design-sync/previews/EmptyState.tsx [F:7a43bf4ce5]: function Queue
- .design-sync/previews/ErrorState.tsx [F:79467a3153]: function Unreachable
- .design-sync/previews/GatePanel.tsx [F:bb6a874d58]: @dsCard group="Governance"
- .design-sync/previews/HelpHint.tsx [F:e19aab09cb]: @dsCard group="Governance"
- .design-sync/previews/Icon.tsx [F:6bef3f93ab]: function Set
- .design-sync/previews/IconButton.tsx [F:8972d37045]: function Row
- .design-sync/previews/IdentityChip.tsx [F:7008a20b1c]: @dsCard group="Governance"
- .design-sync/previews/Input.tsx [F:5e207f73c7]: @dsCard group="Governance"
- .design-sync/previews/LearningCard.tsx [F:250c8a0d4a]: @dsCard group="Governance"
- .design-sync/previews/LeaseTable.tsx [F:31658eff0b]: @dsCard group="Governance"
- .design-sync/previews/LoadingState.tsx [F:eecc78e7e8]: function Reading
- .design-sync/previews/MetricTile.tsx [F:e5e519f441]: @dsCard group="Governance"
- .design-sync/previews/Modal.tsx [F:4387a44284]: function RaiseCap
- .design-sync/previews/ModeSwitcher.tsx [F:545c0ccfeb]: @dsCard group="Governance"
- .design-sync/previews/NumberField.tsx [F:84a5c32a4c]: @dsCard group="Governance"
- .design-sync/previews/PermissionDeniedState.tsx [F:d590ca62b9]: function OwnerOnly
- .design-sync/previews/ProgressMeter.tsx [F:a0abaf6a25]: @dsCard group="Governance"
- .design-sync/previews/ProtectedPathRow.tsx [F:13d31b33ea]: @dsCard group="Governance"
- .design-sync/previews/QueueBoard.tsx [F:dd1be2cd7b]: @dsCard group="Governance"
- .design-sync/previews/RoleBadge.tsx [F:973aaa9d86]: @dsCard group="Governance"
- .design-sync/previews/SafetyStrip.tsx [F:3319e5c923]: @dsCard group="Governance"
- .design-sync/previews/Select.tsx [F:08577063d4]: @dsCard group="Governance"
- .design-sync/previews/Slider.tsx [F:1f40b6eb6e]: @dsCard group="Governance"
- .design-sync/previews/Sparkline.tsx [F:ca13fe2a5b]: @dsCard group="Governance"
- .design-sync/previews/StatusPill.tsx [F:10e76cfcd3]: @dsCard group="Governance"
- .design-sync/previews/Table.tsx [F:1aa7cf650d]: @dsCard group="Governance"
- .design-sync/previews/Tabs.tsx [F:6c0919b64e]: @dsCard group="Governance"
- .design-sync/previews/TierBadge.tsx [F:fe5ec971f8]: @dsCard group="Governance"
- .design-sync/previews/Toast.tsx [F:7832db450f]: @dsCard group="Governance"
- .design-sync/previews/Toggle.tsx [F:a0068c8817]: @dsCard group="Governance"
- .design-sync/previews/Tooltip.tsx [F:dca643f34b]: @dsCard group="Governance"
- .design-sync/previews/WorkItemCard.tsx [F:f9c98a8642]: @dsCard group="Governance"
- .design-sync/previews/WorkItemDrawer.tsx [F:f0fbd8716f]: function Detail
- .github/pull_request_template.md [F:b2496e8029]: What this PR does
- .modonome/DECISIONS.md [F:88c38fbc0f]: Modonome decisions
- .modonome/LESSONS.md [F:0f284c134c]: Learnings, staged candidate conventions
- .modonome/NETWORK.md [F:8930a72be2]: Cross-repo network
- .modonome/STATUS.md [F:cac320dd97]: Modonome Status
- .modonome/control-panel.md [F:76f802c3ce]: Modonome control panel
- ADOPTION-GUIDE.md [F:7479c14986]: Adoption guide
- AGENTS.md [F:a54ff182c7]: Agent instructions for modonome
- ARCHITECTURE.md [F:8f6366fd8e]: Architecture
- CHANGELOG.md [F:06572a96a5]: Changelog
- CODEX.md [F:2f41a784d9]: Codex instructions for modonome
- CODE_OF_CONDUCT.md [F:ffdbe3a1e7]: Contributor Covenant Code of Conduct
- CONTRIBUTING.md [F:eca12c0a30]: Contributing to Modonome
- GOVERNANCE.md [F:b60c6a93e9]: Governance
- QUICKSTART.md [F:147873af8b]: Quickstart
- README.md [F:b335630551]: Why businesses adopt Modonome
- RELEASE-EVIDENCE.md [F:705a3ca9b3]: Release evidence
- ROADMAP.md [F:683343bdf9]: Roadmap
- SECURITY.md [F:f6ed156e4b]: Security model
- agentproof/CONFORMANCE-INTERFACE.md [F:cf2908e0f2]: AgentProof Conformance Interface
- agentproof/CONTRIBUTING.md [F:69ddfa4ff4]: Contributing to AgentProof
- agentproof/README.md [F:5621bc51b3]: AgentProof
- agentproof/SPEC.md [F:2ec4f6540b]: AgentProof Specification
- agentproof/scenarios/ap-33-config-env-override-inert.mjs [F:02a5f8fc55]: !/usr/bin/env node
- agentproof/scenarios/ap-36-adr-number-uniqueness.mjs [F:a6d2bd3021]: A minimal repo that satisfies every check other than the one under test, so a failure can only come from the ADR-number logic being exercised.
- apps/control-panel/README.md [F:3211d524ad]: Modonome control panel
- apps/control-panel/server/api.mjs [F:08b7435c86]: The single source of truth for "may a write to this dir proceed", used both to decide a 403 and to set source.writable, so the two can never drift. Returns the 
- apps/control-panel/server/learningsFormat.mjs [F:54df44aadd]: Shared parsing for the "## Staged" bullet lines in .modonome/LESSONS.md, so the
- apps/control-panel/server/modonomeReader.mjs [F:8a3dd6ccff]: A gate's status is implied by the state of every work item that declares it, never by a fabricated pass. A repo that has only ever run dry-run sweeps shows ever
- apps/control-panel/server/modonomeWriter.mjs [F:22566cb46e]: A line-level patch, not a full YAML re-serialize, so every hand-written comment in config.yaml survives an edit made from the panel. Only top-level, zero-indent
- apps/control-panel/server/ownership.mjs [F:fd4b8473fa]: Parse CODEOWNERS "pattern @owner @owner" lines into ordered rules. Comments and blank lines are dropped; each owner handle is lowercased with its leading @ remo
- apps/control-panel/server/remediationView.mjs [F:5daab9894d]: Builds the read-only remediation view-model for the panel. Pure: it takes already
- apps/control-panel/src/App.tsx [F:113387361d]: function App
- apps/control-panel/src/content/concepts.ts [F:f83d1100e9]: interface ConceptEntry
- apps/control-panel/src/lib/confirm.tsx [F:3c479cac6e]: Provides an imperative confirm() that resolves true when the operator approves. * Every destructive control in the panel awaits this before it fires, satisfying
- apps/control-panel/src/screens/ArmingScreen.tsx [F:e40ce1af48]: The control screen. Three tabs keep one conceptual area on screen at a time: the * activation ladder (the primary daily view), caps and budget, and the separati
- apps/control-panel/src/screens/GatesScreen.tsx [F:304fa8ef33]: The integrity surface: the deterministic CI gates every change must pass, the * protected paths that require explicit owner approval, and the separation-of-duti
- apps/control-panel/src/screens/LearningsScreen.tsx [F:757a70680a]: Where the engine's judgment surfaces for a human to check. Open decisions ask an * explicit question before the engine proceeds; the learning queue shows the le
- apps/control-panel/src/screens/OverviewScreen.tsx [F:6627655633]: Mission control: the "is it safe, is it working" glance. Arming posture, the safety * strip, the live queue, spend to date, gate health, and the most recent act
- apps/control-panel/src/screens/SettingsScreen.tsx [F:4ebf08705b]: The advanced-configuration screen, one conceptual area per tab so nothing forces an * operator to scroll past unrelated subsystems to reach the one they came fo
- apps/control-panel/src/screens/WorkQueueScreen.tsx [F:9b3f18856e]: The durable work-item state machine, laid out as a board: queued, claimed, making, * checking, merge ready, done, and escalated. Selecting a card opens a read-o
- apps/control-panel/src/state/adapter.ts [F:95d4304133]: function finalizeState
- apps/control-panel/src/state/arming.ts [F:0da05a2a05]: function deriveMode
- apps/control-panel/src/state/configDiff.ts [F:25e649633c]: function nestedMapChanged
- apps/control-panel/src/state/fixtures/host.ts [F:7d236c9aa6]: const hostState
- apps/control-panel/src/state/fixtures/product.ts [F:89aee72994]: function titleFromId
- apps/control-panel/src/state/liveClient.ts [F:ec52ca3820]: Read-only reachability probe for an OpenAI-compatible base URL (LM Studio, Ollama, a gateway).
- apps/control-panel/src/state/types.ts [F:0a85f3b8e5]: The subject a mode points at: which repo the panel is reading.
- bin/modonome.mjs [F:f90930c3c3]: The authoritative arming gate. A config file the agent can write can never arm the engine on its own: arming requires the MODONOME_ARMED=true environment variab
- design-system/README.md [F:5253743405]: @modonome/design-system
- design-system/src/components/ActivationLadder/ActivationLadder.tsx [F:14edab923f]: The activation ladder: the three-rung progression from Disabled to Dry-run to Armed, * paired with the armed-mode gate checklist. Arming is only allowed when ev
- design-system/src/components/AppShell/AppShell.tsx [F:268769c4a6]: The Modonome brand mark: a teal ring with a check on the dark ground.
- design-system/src/components/ArmingStateBadge/ArmingStateBadge.tsx [F:7a1f7d680b]: The single most important status in the panel: which of the three activation-ladder * rungs the engine is on right now. Disabled is gray, dry-run is CI blue, ar
- design-system/src/components/AuditTimeline/AuditTimeline.tsx [F:76da13a8f7]: The kind of event recorded in the audit trail.
- design-system/src/components/Button/Button.tsx [F:8b122c449e]: The standard action control. Use `primary` for the main action on a screen, * `secondary` for supporting actions, `ghost` for low-emphasis inline actions, and *
- design-system/src/components/Card/Card.tsx [F:40eb542a82]: The standard container surface for the control panel. Renders an optional header * row (eyebrow, title, help hint, and right-aligned actions) above a divider, t
- design-system/src/components/Carousel/Carousel.tsx [F:d20e4b6b91]: A horizontally scrolling row with scroll-snap and prev/next nav buttons. Items stay * in normal tab order (each is independently focusable, and the browser scro
- design-system/src/components/Checkbox/Checkbox.tsx [F:7054844360]: A labeled checkbox for boolean choices in lists and forms, such as opting * into a rule or selecting an item in a batch action. Renders a native * `<input type=
- design-system/src/components/ConceptTile/ConceptTile.tsx [F:1a137480ae]: A compact, focusable tile naming one engine concept: an icon, its name, and a short * category tag. Renders as a real button so it is keyboard-reachable on its 
- design-system/src/components/ConfirmDialog/ConfirmDialog.tsx [F:63c1c23ccb]: A confirmation dialog for destructive or high-consequence controls. Every control * that arms the engine, releases a lease, approves a protected path, or prunes
- design-system/src/components/CostPanel/CostPanel.tsx [F:ce1173e176]: A summary of model spend and call volume for a period: a budget meter for remote * USD spend, a small stat row of local calls, remote calls, and cache saves (fr
- design-system/src/components/DecisionCard/DecisionCard.tsx [F:583edef643]: Lifecycle status of a decision: still open for input, or already resolved.
- design-system/src/components/Drawer/Drawer.tsx [F:71f0bfb455]: A right-side sheet that slides in over a scrim, for focused tasks that need more * room than a popover but should not leave the current page's context (inspecti
- design-system/src/components/GatePanel/GatePanel.tsx [F:8c6234a8cb]: A vertical list of CI gate rows, used to visualize the merge-blocking checks and * the anti-gaming ratchet on a work item or pipeline. Each row pairs an icon, a
- design-system/src/components/HelpHint/HelpHint.tsx [F:d5b496b125]: A tiny circular help affordance: a `help` icon button that reveals its text in a * Tooltip on hover or keyboard focus. This is the pervasive "hover for context"
- design-system/src/components/HoverCard/HoverCard.tsx [F:66264a042c]: A richer sibling of Tooltip: a small card (heading, body copy, source citation) for * reference content pulled from real documentation, rather than a one-line h
- design-system/src/components/Icon/Icon.tsx [F:deab644e60]: The curated Modonome icon set. Every glyph is a stroke path on a 24x24 grid and * inherits `currentColor`, so an icon takes the color of whatever text or contro
- design-system/src/components/IconButton/IconButton.tsx [F:a8cfe45d27]: A square, icon-only button. Always carries an `aria-label` built from the required * `label` prop so the control has an accessible name even though no text is v
- design-system/src/components/IdentityChip/IdentityChip.tsx [F:f942e88a8f]: A compact identity marker: an initials avatar plus a name, with an optional model * string in muted mono beneath. When `role` is set the avatar ring is tinted (
- design-system/src/components/Input/Input.tsx [F:763efdd51c]: A labeled single-line text input. Shares the labeled-field frame used by every * form control in the panel: an optional label, an optional hint bubble, and an *
- design-system/src/components/LearningCard/LearningCard.tsx [F:1d03291691]: Lifecycle status of a learning: staged for review, or promoted into a permanent gate.
- design-system/src/components/LeaseTable/LeaseTable.tsx [F:956332d4b5]: A single active claim lease on a work item, as shown in the lease table.
- design-system/src/components/MdnRoot/MdnRoot.tsx [F:90fc20ddd8]: The design-system root. Establishes the dark ground, the body font, and the token * scope that every component inherits. Wrap an app or a screen in this (AppShe
- design-system/src/components/MetricTile/MetricTile.tsx [F:9f0fb6ed8b]: A dashboard stat tile: an eyebrow label (with an optional HelpHint), a large value * with unit, and optional icon, trend slot, and sub text. This is the core bu
- design-system/src/components/Modal/Modal.tsx [F:63351e350b]: The generic centered dialog: a panel over a scrim, closable by Escape, a scrim * click, or its own close button. Moves focus into the dialog on open. This is th
- design-system/src/components/ModeSwitcher/ModeSwitcher.tsx [F:b3a2ad52bb]: The global context switch. Host mode reads the engine as installed in a customer * repo; product mode reads modonome governing its own repository (self-applicat
- design-system/src/components/NumberField/NumberField.tsx [F:db651caf76]: A numeric field with decrement and increment stepper buttons and an optional * unit suffix. Used for caps and budget editors such as max open PRs, max diff * li
- design-system/src/components/ProgressMeter/ProgressMeter.tsx [F:9deac13db0]: A horizontal meter for bounded quantities such as budget consumed or checker * coverage. Renders a label row (with a mono value/max readout) above a track, * wi
- design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx [F:d8fb8339ce]: A single row describing one protected path's guard state: a lock icon, the path in * mono, and a status readout. When a change is awaiting approval, shows an * 
- design-system/src/components/QueueBoard/QueueBoard.tsx [F:f8609bae0b]: The work queue as a board. Items are grouped into the columns of the durable state * machine (queued, claimed, making, checking, merge ready, done, escalated), 
- design-system/src/components/RoleBadge/RoleBadge.tsx [F:35c6d59157]: A labeled chip identifying a governance actor or role, pairing an icon with the * human-readable name. The four core review actors (maker, checker, merge author
- design-system/src/components/SafetyStrip/SafetyStrip.tsx [F:57ca5f1716]: A horizontal, wrapping strip of small labeled cells summarizing the safety-relevant * levers for a project at a glance: whether autonomy and auto-merge are on, 
- design-system/src/components/Select/Select.tsx [F:819f72edf6]: A styled native `<select>` with a custom chevron. Keeps the real `<select>` * element for full assistive-tech and keyboard support while matching the dark * sur
- design-system/src/components/Slider/Slider.tsx [F:81c495717c]: A styled range input. Keeps the native `<input type="range">` for full * keyboard and assistive-tech support (arrow keys, Home/End, screen reader * value announ
- design-system/src/components/Sparkline/Sparkline.tsx [F:c0e80ca327]: A minimal inline trend chart: a single line normalized to fit the box, with an * optional soft area fill beneath it. No axes or gridlines, intended to sit inlin
- design-system/src/components/States/States.tsx [F:2f6c42c5ee]: Calm, muted placeholder for a screen or panel that has no content yet. Use for * empty queues, empty search results, or a fresh workspace before any work items 
- design-system/src/components/StatusPill/StatusPill.tsx [F:2fc610bd94]: A compact rounded status indicator. Pairs a tinted background and border with the * tone's color, and always renders its label text (plus an optional icon or do
- design-system/src/components/Table/Table.tsx [F:a402d2f9ed]: A generic, semantic data table. Renders a real `<table>` with `<thead>`/`<tbody>` * so screen readers and browser table navigation work as expected. Rows highli
- design-system/src/components/Tabs/Tabs.tsx [F:1db369d970]: An accessible horizontal tab list. Implements the WAI-ARIA tabs pattern: the * container carries `role="tablist"`, each tab carries `role="tab"` and * `aria-sel
- design-system/src/components/TierBadge/TierBadge.tsx [F:da42f69531]: A small pill identifying a risk tier (1-4) by its dedicated tier color, with a * title tooltip summarizing what the tier permits. Used on work items, policies, 
- design-system/src/components/Toast/Toast.tsx [F:ab334f34df]: A single notification card with a tone-colored left accent, an icon, a title and * optional message, and an optional dismiss control. Not a stacking provider: m
- design-system/src/components/Toggle/Toggle.tsx [F:214cc0a5f4]: An accessible switch for boolean config such as dry_run, auto_merge, or * local_model_only_by_default. Implemented as a `role="switch"` button rather * than a c
- design-system/src/components/Tooltip/Tooltip.tsx [F:8a9aff1529]: A small dark hint bubble anchored to a trigger element. Opens on mouse hover and on * keyboard focus of the trigger (never hover-only, so keyboard users see the
- design-system/src/components/WorkItemCard/WorkItemCard.tsx [F:b5ae6ee133]: Plain data shape for a single work item as shown in a compact card. Components in * this package define their own shape rather than importing app-level types, s
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx [F:08064e0c53]: Full detail for a single work item, as shown in the read-only inspector drawer. * Extends the card summary shape with the fields only needed once someone opens 
- design-system/src/lib/cx.ts [F:7c8d518693]: Join class names, dropping falsy values. A tiny classnames helper.
- design-system/src/lib/format.ts [F:86838d35ac]: Format an ISO timestamp as a short relative string, for example "3m ago" or "in 12m".
- design-system/src/tokens/tokens.ts [F:c64c042051]: CSS custom-property name for an arming mode color.
- docs/LEXICON.md [F:e5e9ec402f]: Lexicon
- docs/README.md [F:0b5ca119d2]: Modonome documentation
- docs/adr/ADR-001-self-governance-pipeline.md [F:6e4b629d3c]: ADR-001: Self-Governance Pipeline
- docs/adr/ADR-002-shadow-mode.md [F:64c5acf802]: ADR-002: Shadow Mode
- docs/adr/ADR-003-agentproof-portability.md [F:14812742da]: ADR-003: AgentProof Portability
- docs/adr/ADR-004-arming-isolation-enforcement.md [F:6dd88cde1c]: ADR-004: Arming Isolation Enforcement
- docs/adr/ADR-005-run-observability.md [F:d4ead22b1b]: ADR-005: Run Observability
- docs/adr/ADR-006-checker-independence.md [F:dc00dfe394]: ADR-006: Checker Independence
- docs/adr/ADR-007-claim-atomicity.md [F:0526aab88e]: ADR-007: Claim Atomicity
- docs/adr/ADR-008-trusted-author-allowlist.md [F:8c2e08ed12]: ADR-008: Trusted Author Allowlist
- docs/adr/ADR-009-mcp-tool-auth-scope.md [F:00a0cb4ee4]: ADR-009: MCP Tool Authentication and Scope
- docs/adr/ADR-010-knowledge-packet-trust.md [F:de4538fe53]: ADR-010: Knowledge Packet Trust and Promotion
- docs/adr/ADR-011-ci-env-var-trust-scope.md [F:d2b14b5b34]: ADR-011: CI Environment Variable Trust Scope
- docs/adr/ADR-012-harness-prompt-integrity.md [F:6f5b5f0bc4]: ADR-012: Harness Prompt Integrity
- docs/adr/ADR-013-config-downgrade-and-migration.md [F:e844676be4]: ADR-013: Config Downgrade and State Migration
- docs/adr/ADR-014-knowledge-network-transport.md [F:1a58c06540]: ADR-014: Knowledge Network Transport and Sync Model
- docs/adr/ADR-015-knowledge-network-catalog.md [F:cbaff08a46]: ADR-015: Knowledge Network Catalog Design
- docs/adr/ADR-016-knowledge-network-packet-identity.md [F:c077d16aeb]: ADR-016: Knowledge Network Packet Identity, Lineage, and Dedup
- docs/adr/ADR-017-knowledge-network-packet-signing.md [F:72b7ab4c3e]: ADR-017: Knowledge Network Packet Signing and Key Management
- docs/adr/ADR-018-knowledge-network-import-ratchet.md [F:0a6b452f14]: ADR-018: Knowledge Network Import Pipeline and Local Re-Validation Ratchet
- docs/adr/ADR-019-knowledge-network-execution-scope.md [F:28d4e1ad3d]: ADR-019: Knowledge Network Scripts Run in Base-Branch CI Scope
- docs/adr/ADR-020-prompt-complexity-budget.md [F:4aaece5252]: ADR-020: Prompt Complexity Budget
- docs/adr/ADR-021-prompt-behavioral-regression-suite.md [F:24f28ae0fa]: ADR-021: Prompt Behavioral Regression Suite
- docs/adr/ADR-022-anti-rubber-stamp-checker-telemetry.md [F:35002ba3fe]: ADR-022: Anti-Rubber-Stamp Checker Telemetry
- docs/adr/ADR-023-config-schema-migration-contract.md [F:b4279e0af6]: ADR-023: Config Schema Migration Contract
- docs/adr/ADR-024-capability-promotion-gate.md [F:a70145dc77]: ADR-024: Capability Promotion Gate
- docs/adr/ADR-025-self-application-conformance.md [F:dc0cc6d551]: ADR-025: Self-Application Conformance
- docs/adr/ADR-026-learning-promotion-audit-trail.md [F:094efaca92]: ADR-026: Learning Promotion Audit Trail
- docs/adr/ADR-027-agentproof-25-scenario-expansion.md [F:d783999e16]: ADR-027: AgentProof Suite Expansion to 25 Scenarios
- docs/adr/ADR-028-portability.md [F:514a79560d]: ADR-028: Portability Validation Strategy
- docs/adr/ADR-029-adversarial-test-design.md [F:d66f93d7b7]: ADR-029: Adversarial Test Design Principles
- docs/adr/ADR-030-embedding-safety.md [F:5a04bfa7a4]: ADR-030: Embedding Safety Framework
- docs/adr/ADR-031-markdown-governance.md [F:627afb27fd]: ADR-031: Markdown governance
- docs/adr/ADR-032-oss-adapter-boundary.md [F:3a70dc66ea]: ADR-032: OSS adapter boundary
- docs/adr/ADR-033-repo-snapshot.md [F:b5f5700e4d]: ADR-033: Repo snapshot
- docs/adr/ADR-034-compliance-audit-staleness-gate.md [F:21752cf61a]: ADR-034: Compliance and audit doc staleness gate
- docs/adr/ADR-035-metadata-remediator.md [F:c3588d683e]: ADR-035: Metadata-only Commit-History Remediator
- docs/adr/ADR-036-policy-attestation.md [F:750436d8c1]: ADR-036: Policy-Pack Manifest and Disclosure Attestation
- docs/adr/ADR-037-policy-pack-adoption.md [F:01a7edaeba]: ADR-037: Policy-Pack Adoption Tooling
- docs/adr/ADR-038-checker-as-review-service.md [F:1a368a7935]: ADR-038: Checker as an Author-Agnostic Review Service
- docs/adr/ADR-039-agent-capability-profiles.md [F:56a132aaca]: ADR-039: Agent Capability Profiles and the Always-Run Crew
- docs/adr/ADR-040-end-to-end-operating-model.md [F:25fdf1f8f6]: ADR-040: The End-to-End Governed Operating Model
- docs/adr/ADR-042-agentproof-verified.md [F:27086b6de3]: ADR-042: AgentProof Verified and the Hardened Registry
- docs/adr/ADR-043-terraform-module.md [F:c7326495ec]: ADR-043: Terraform module for org-level provisioning
- docs/audits/claims-audit-2026-06-25.md [F:8a7591db62]: Claims audit, 2026-06-25
- docs/audits/claims-audit-2026-07-01.md [F:6a3a98df8c]: Claims audit, 2026-07-01
- docs/autonomy-plan.md [F:3dcdfa18c0]: Autonomy plan: governed autonomy on free models
- docs/compliance/compliance.md [F:95e51a604d]: Compliance
- docs/compliance/eu-ai-act-classification.md [F:5fa0ad758b]: EU AI Act Classification
- docs/compliance/openssf-badge-evidence.md [F:7983a5dd39]: OpenSSF Best Practices badge evidence
- docs/control-panel-modes.md [F:83d4d07afc]: Control panel: modes, and what you can and cannot do
- docs/enterprise.md [F:191a17b151]: Enterprise estates
- docs/guidelines/markdown-governance.md [F:b81cf7567f]: Markdown governance policy
- docs/knowledge-network-architecture.md [F:5e3214eb0f]: Cross-Repo Knowledge Network: v0.2 Architecture
- docs/ops/merge-governance-setup.md [F:1339474d8c]: Merge governance setup (owner action)
- docs/ops/runner-model-config.md [F:f1f2b57403]: Runner and Model Configuration (WS-H)
- docs/research/README.md [F:0a640a72f9]: Modonome Research Directions
- docs/research/agentic-governance-mesh/00-RESEARCH-PLAN.md [F:83ecac7524]: Agentic Governance Mesh: Research Direction
- docs/research/agentic-governance-mesh/RD-027-governance-packet-protocol.md [F:492786871a]: RD-027: Governance Packet Protocol
- docs/research/agentic-governance-mesh/RD-028-trust-network-and-discovery.md [F:0e78eb22ec]: RD-028: Trust Network & Discovery
- docs/research/agentic-governance-mesh/RD-029-packet-lifecycle-and-versioning.md [F:ff644711e7]: RD-029: Packet Lifecycle & Versioning
- docs/research/agentic-governance-mesh/RD-030-cross-repo-governance-feedback.md [F:cb8c4aadaf]: RD-030: Cross-Repo Governance Feedback
- docs/research/agentic-governance-mesh/RD-031-semantic-compatibility-and-conflicts.md [F:0c07096c4e]: RD-031: Semantic Compatibility & Conflicts
- docs/research/agentic-governance-mesh/RD-032-network-level-ratchet.md [F:79cec3a152]: RD-032: Network-Level Ratchet
- docs/research/agentic-governance-mesh/governance-mesh-vision.md [F:acd892d4a0]: The Governance Mesh Vision: Modonome as a WWW for Repositories
- docs/specs/governed-autonomy-spec.md [F:55673172df]: Governed Autonomy: A Specification for Safe Autonomous Software Engineering Agents
- docs/specs/ratchet-spec.md [F:4d5cfa3611]: Anti-Gaming Ratchet Specification
- docs/versioning.md [F:c1cc304e56]: Versioning and embedding
- docs/vscode-workflow.md [F:88244532e4]: VS Code manual trigger workflow
- docs/workflow-fixes.md [F:91a7efa0ba]: Workflow Push Event Fix
- examples/demo-app/README.md [F:fcc5f4b906]: modonome-demo
- examples/demo-app/WALKTHROUGH.md [F:9666ca7f0d]: Modonome on this demo app: captured dry-run + maker/checker cycle
- examples/demo-app/src/CartService.js [F:599f5b2f28]: CartService: manages user shopping carts stored in memory.
- examples/demo-app/src/CheckoutService.js [F:54c6928de9]: CheckoutService: drives the checkout flow from cart to order.
- examples/demo-app/src/InventoryService.js [F:bd02b28f17]: InventoryService: tracks stock levels for products in memory.
- examples/demo-app/src/NotificationService.js [F:b9d806ba4d]: NotificationService: records notifications sent to users.
- examples/demo-app/src/OrderService.js [F:1ecd18c4b9]: OrderService: creates and manages orders.
- examples/demo-app/src/PaymentProcessor.js [F:ff3aef693f]: PaymentProcessor: wraps a payment gateway with amount conversion.
- examples/demo-app/src/index.js [F:8bb1b57470]: Composition root for the demo app.
- examples/demo-app/tests/CartService.test.js [F:3c53926ecd]: function makeDb
- examples/demo-app/tests/CheckoutService.test.js [F:52caf3b287]: function makeCartService
- examples/demo-app/tests/InventoryService.test.js [F:f8168b956f]: function makeDb
- examples/demo-app/tests/OrderService.test.js [F:044b762a79]: Tests for OrderService.
- examples/demo-app/tests/PaymentProcessor.test.js [F:373a946d5c]: function makeGateway
- examples/node-typescript/README.md [F:d52b08ebeb]: Example: Node and TypeScript service
- examples/node-typescript/src/checkout.ts [F:93f0f5d3de]: type Card
- examples/python-service/README.md [F:ae227d695d]: Example: Python service
- examples/python-service/app/orders.py [F:7ccad64380]: Apply a percentage discount to a list of items. Args: items: List of dicts with "price" key discount_percent: Discount percentage (0-100) Returns: Total after d
- examples/python-service/tests/test_orders.py [F:2c2cc77861]: Test discount with 0% - should return full amount. Note: This covers only the zero-discount case. The function should be tested with non-zero discounts (10%, 50
- fixtures/evidence-tampered.md [F:fdaf1308e4]: RELEASE-EVIDENCE
- fixtures/negative-controls/app-syntax-error.js [F:a1411f1423]: Negative control: intentional syntax error in example app
- fixtures/portability/prompt-injection-host/docs/guide.md [F:6fdd929a92]: Host Documentation
- fixtures/portability/prompt-injection-host/src/main.js [F:90f0999521]: This file contains adversarial content in comments that should not affect Modonome.
- fixtures/portability/schema-collision/README.md [F:7fcbf6b32d]: Schema Collision Fixture
- prompts/modonome.bundle.md [F:c0714e4bf0]: Modonome Master Prompt (core)
- prompts/modonome.core.md [F:1c3b1b469e]: Modonome Master Prompt (core)
- prompts/modules/adoption.md [F:41623f0bcd]: Adoption pass
- prompts/modules/control-panel.md [F:36693b0d8b]: Operator control panel
- prompts/modules/gates.md [F:02359d48d5]: Deterministic gates
- prompts/modules/network.md [F:c98f6b55e3]: Cross-repo knowledge network
- prompts/modules/roles.md [F:8f62475ebe]: Agent roles
- prompts/modules/snapshot.md [F:c324fab0cc]: Repo snapshot
- prompts/modules/state-machine.md [F:9a28b4e90e]: Durable state machine
- scripts/agent/action-queue.mjs [F:5b113a0914]: Validate a record against the action-queue schema. Throws with the collected errors so a malformed action can never be enqueued.
- scripts/agent/apply-patch.mjs [F:872221b1da]: A body looks like a unified diff when it has a "diff --git" header, or a paired "--- "/"+++ " file header, or an "@@ " hunk marker.
- scripts/agent/openai-client.mjs [F:8d2cb93236]: Join a base URL with the chat-completions path, tolerating a trailing slash * or a base URL that already ends in "/chat/completions". * * @param {string} baseUr
- scripts/agent/parse-checker-telemetry.mjs [F:851f776227]: Case-insensitive signal phrases that mean the checker withheld approval or asked for changes. Matching any one sets checker_requested_changes = true.
- scripts/agent/providers.mjs [F:8b5a1f94c4]: Built-in providers. A config's `providers` map (see resolveProvider) is merged on top, so a host repo can add or override entries without a code change here.
- scripts/agent/render-prompt.mjs [F:fd660a117b]: Build a compact repository-snapshot context block from the committed Tier 0 signature, so every rendered role prompt starts pre-oriented and an agent can read t
- scripts/agent/resolve-role.mjs [F:304ce7b89d]: The role's primary model: an explicit `model`, else the head of its prioritized `models` fallback list, else the role default. Keeping `model` authoritative whe
- scripts/agent/review-diff.mjs [F:2d6ef08990]: Build the review prompt. The diff is fenced and explicitly framed as untrusted data, never as instructions, so a change cannot prompt-inject the checker into ap
- scripts/agent/review-proposals.mjs [F:2127a8caca]: The proposal text is fenced and framed as untrusted data, so a proposal cannot prompt-inject the checker into approving itself. Same hardening as review-diff.mj
- scripts/agent/route-action.mjs [F:37f4a5c04e]: Classify a role's model endpoint into a coarse reachability descriptor: kind: "local" self-hosted / private-host endpoint (Ollama, llama.cpp) kind: "github" the
- scripts/agent/run-cycle.mjs [F:ddeb486c49]: Derive the ordered list of roles the cycle executes. An explicit cfg.role_sequence (a non-empty array of role names) is honored so a crew role added in config r
- scripts/agent/tool-loop-adapter.mjs [F:aa77f227a6]: Resolve the command the external adapter is invoked as. Precedence: an explicit * adapterEntry.command, then adapterEntry.name, then a bare fallback. The value 
- scripts/agentproof-attestation.mjs [F:af6de66499]: !/usr/bin/env node
- scripts/arm.mjs [F:5f7910375b]: !/usr/bin/env node
- scripts/assert-governed-change.mjs [F:fa49930755]: function gitDiff
- scripts/audit-learnings.mjs [F:c9493b5275]: !/usr/bin/env node
- scripts/build-compliance-evidence.mjs [F:2e327963ed]: Observe concrete facts about a repository. Pure with respect to its inputs: it only reads the filesystem under root and returns a plain object.
- scripts/build-policy-attestation.mjs [F:780c791407]: Domain separation binds a signature to this artifact type so it cannot be replayed as a knowledge packet or any other signed structure.
- scripts/build-prompt.mjs [F:c4395c3023]: !/usr/bin/env node
- scripts/build-release-evidence.mjs [F:9344d335a6]: Sample-app captures: real maker and checker runs recorded under examples/<app>/runs/. These directories are committed (unlike the gitignored .modonome/runs/), s
- scripts/check-agentproof-registry.mjs [F:b16afebae9]: Core check. Takes the parsed registry and schema and returns a list of human-readable problem strings. Pure: no filesystem or network.
- scripts/check-architecture-drift.mjs [F:4749cc43a0]: Escape regex metacharacters so an unexpected schema value (e.g. containing "." or "+") cannot produce an invalid pattern or change what the word-boundary match 
- scripts/check-attribution-fp-corpus.mjs [F:e8676a18b7]: Run the corpus through the two layers. The detector predicates are injected so the * gate's own logic is testable with a deliberately over-broad matcher (provin
- scripts/check-checker-engagement.mjs [F:fc5d887ff6]: !/usr/bin/env node
- scripts/check-decisions-authority.mjs [F:92d6903b5f]: Parse DECISIONS.md text into heading violations and Resolved-section entries.
- scripts/check-drift.mjs [F:87c30bdb4c]: !/usr/bin/env node
- scripts/check-edit-set-compliance.mjs [F:9427d264e6]: !/usr/bin/env node
- scripts/check-evidence-secrets.mjs [F:ace169adc4]: Resolve the list of files to scan. If a path argument is supplied use it directly; otherwise walk examples/runs/metrics.jsonl via readdirSync.
- scripts/check-gate-dag.mjs [F:fc21812307]: Extract the relative import specifiers from one module's source: static `from "..."`, side-effect `import "..."`, and dynamic `import("...")`. A regex scan (no 
- scripts/check-licenses.mjs [F:cc361bd05a]: Core check. Takes the parsed package.json and (optional) adapters manifest and returns a list of human-readable problem strings. Pure: no filesystem or network.
- scripts/check-md-governance.mjs [F:fd08562f92]: 4. ADR number uniqueness within docs/adr, and across docs/adr and docs/research.
- scripts/check-portability.mjs [F:2d4c555ba1]: !/usr/bin/env node
- scripts/check-promotion-readiness.mjs [F:c5938c33fd]: Check that a section appears as a Markdown heading (h1-h6), so a one-line ADR with the section words buried in prose cannot game the gate.
- scripts/check-regex-safety.mjs [F:e7380d1444]: Remove character classes [...] so a literal + or * inside a class ("[a+]") is not read as a quantifier. Escaped chars are skipped.
- scripts/check-repo-hygiene.mjs [F:61296e720c]: Helper
- scripts/check-self-application.mjs [F:4096620673]: 4. The two protected-path surfaces must agree. CODEOWNERS is what GitHub enforces; protected_paths_extra is what the engine reads. If they disagree, a path is p
- scripts/check-state-machine-acyclic.mjs [F:8b8d3c46b3]: Build the adjacency map { state: [to, ...] } from the transition list. When includeCapGuard is false, cap_guard edges are dropped: those are the sanctioned boun
- scripts/check-style.mjs [F:ca0833ac73]: Escape a literal phrase for use inside a RegExp, then require a word boundary on each side so "workpacket" (no space) can't false-positive on the banned phrase 
- scripts/connect.mjs [F:d6401dd73e]: !/usr/bin/env node
- scripts/detect-near-miss.mjs [F:09ba331878]: Gather every near-miss across the branch name, commit identities, and commit bodies unique to this branch.
- scripts/dry-run-sweep.mjs [F:6f247eb514]: Only fires when the swept repo actually has a control panel at apps/control-panel (auditCoverage/auditCoherence report `skipped: true` and this returns nothing 
- scripts/fleet-ledger.mjs [F:128b647d9a]: Pull "owner/repo" out of a repository URL such as https://github.com/enumind/modonome(.git). Returns "" when it does not parse.
- scripts/guard-ratchet.mjs [F:8a10462927]: Each problem message is "<file>: <detail>". Recover the file path for a location.
- scripts/hygiene.mjs [F:90e1fd2fd9]: Collect findings for the current branch, the commits unique to it, and the PR-body-shaped surfaces we can see locally (the commit bodies themselves).
- scripts/install-hooks.mjs [F:a7ce0f6452]: True when targetRoot is modonome's own repo (not a host that merely depends on it or vendored a copy of these scripts). Checked by package.json name rather than
- scripts/lib/attribution-fp-corpus.mjs [F:5a3543606b]: Branch names no layer may flag. These include descriptive names that merely contain a denylisted token as a substring of a longer word.
- scripts/lib/branch-name.mjs [F:6e0bd62fa3]: True when the first path segment of a branch name equals a denylisted token. * Matching is case-insensitive. "feature/ai-adapter" is allowed because the * first
- scripts/lib/canonical-json.mjs [F:245efb551c]: Domain separation tag binds a signature to this packet type and version so a signature over one structure cannot be replayed as another.
- scripts/lib/capability-flags.mjs [F:98529ba7ea]: The capability flags that expand the engine's authority and trust boundary (ADR-024). A single source of truth shared by the promotion-readiness gate (scripts/c
- scripts/lib/cli-args.mjs [F:2d93cea2d4]: Minimal argv helper shared by scripts that take `--flag value` pairs.
- scripts/lib/commit-identity.mjs [F:e4ff19bbe2]: True when a name or email belongs to a denylisted agent or vendor identity. * Real automation such as dependabot is allowed; only coding-agent and model * vendo
- scripts/lib/config-validate.mjs [F:d480e40c97]: Safety rules beyond structural validation. These keep a config from claiming an armed posture without the controls that make arming safe. Note on arming levers:
- scripts/lib/control-panel-audit.mjs [F:1a19f02364]: Today's real high-water mark is 7 (Arming & Safety, Caps & budget tab). The budget is set a few above that: a real ratchet against regression, not an arbitrary 
- scripts/lib/detect-attribution.mjs [F:4a7eaceb5c]: True when any path segment of a branch name exactly equals a denylisted token. * This is a strict superset of isModelIdentifierBranch (which checks only the fir
- scripts/lib/ed25519.mjs [F:0cacf66a3b]: Raw 32-byte public key as base64, accepting either a public or private KeyObject.
- scripts/lib/git-scope.mjs [F:ff2c4a08a4]: The commit range unique to this branch: origin/main..HEAD, falling back to the * last 20 commits when origin/main is not available (a fresh clone or local repo)
- scripts/lib/github-api.mjs [F:cdbe769ed3]: Resolve the owner/repo, preferring the GITHUB_REPOSITORY env, then git origin.
- scripts/lib/graph.mjs [F:f51cba9beb]: isCyclic(adjacency) -> { cyclic: bool, cycle: [...] } Detects whether the graph contains a cycle. When a cycle is found, `cycle` holds the nodes involved in the
- scripts/lib/jsonschema.mjs [F:34cb2b6c48]: A small, dependency-free JSON Schema validator.
- scripts/lib/lang-adapters/generic.mjs [F:594f505f11]: Fallback extractor for languages without a dedicated adapter. It captures common
- scripts/lib/lang-adapters/go.mjs [F:ffe5c1269b]: Dependency-free signature extractor for Go. It captures top-level func (including methods with a receiver), type, const, and var declarations, their preceding l
- scripts/lib/lang-adapters/index.mjs [F:2554ddd30c]: Resolve the adapter for a path by extension, defaulting to the generic fallback.
- scripts/lib/lang-adapters/java.mjs [F:c598a2d684]: Dependency-free signature extractor for Java. It captures type declarations
- scripts/lib/lang-adapters/js-ts.mjs [F:36419aa427]: Dependency-free signature extractor for JavaScript and TypeScript. It scans top
- scripts/lib/lang-adapters/python.mjs [F:3213d03b72]: Dependency-free signature extractor for Python. It captures top-level def and class declarations (async included), their leading triple-quoted docstring, and im
- scripts/lib/lang-adapters/tree-sitter.mjs [F:cecdb96382]: Attempt to register tree-sitter adapters. `register` is the registry's registerAdapter. Returns true when at least one grammar was registered.
- scripts/lib/learnings.mjs [F:4ebb5aa8a0]: The Staged section is capped so it stays a short review queue, never a dumping ground. LESSONS.md documents this as "Cap at 20 staged entries... Never auto-evic
- scripts/lib/merkle.mjs [F:2b9c43b0ca]: Hash raw file bytes (Buffer or string) into a prefixed digest.
- scripts/lib/near-miss.mjs [F:9a3e8ed7d2]: Tier 1: distinctive vendor/product tokens with no ordinary-English or in-repo collision, so separator-normalized SUBSTRING matching on branch names and identiti
- scripts/lib/packet-id.mjs [F:12c7a4e461]: Content-addressed packet identity (ADR-016). The id is sha256 over the JCS of the
- scripts/lib/policy-manifest.mjs [F:4db1101024]: v2 adds the required `generator` credit block (Phase 4: policy-pack adoption tooling, ADR-037). Because `generator` is required and content-digested, a vendored
- scripts/lib/remediate.mjs [F:8ffb11f281]: Remove every line carrying an AI-authorship signature from a commit message, then * drop the trailing blank lines the removal leaves behind. Pure and determinis
- scripts/lib/repo-detect.mjs [F:ae46bbab81]: Build the small file helpers a detector needs, bound to one target directory.
- scripts/lib/run-gate-capped.mjs [F:b014028f57]: Thin wrapper around spawnSync with a hard timeout and output-size cap.
- scripts/lib/secret-patterns.mjs [F:68c4da7fe8]: Returns an array of { name } objects for every pattern that matches text.
- scripts/lib/snapshot-anchors.mjs [F:1cf31c4792]: A short, stable id from a string. Hex keeps it deterministic across platforms.
- scripts/lib/snapshot-cache.mjs [F:119e3c0fce]: A value safe to pass as a git revision argument: a short-to-full hex SHA. Rejects anything else, in particular a leading "-", which git would parse as an option
- scripts/lib/snapshot-core.mjs [F:dbb9c92ca1]: Detect binary content by scanning a prefix for a null byte.
- scripts/lib/snapshot-graph.mjs [F:015261eab0]: Normalize a relative import against the importing file's directory, resolving "." and ".." segments. Returns a posix path with no leading "./".
- scripts/lib/snapshot-redact.mjs [F:4b91a9f65b]: Mask every matching secret in `text`. Returns { text, redactions } where each redaction records the pattern name and how many matches it masked.
- scripts/lib/snapshot-walk.mjs [F:cb66095cb4]: Compile one gitignore-style pattern into a tester over a posix relative path. Supported: comments, negation (!), leading / (anchored), trailing / (directory), *
- scripts/lib/token-estimate.mjs [F:7944059823]: Dependency-free token accounting for snapshot tiers. The estimate is a heuristic (about four characters per token) that needs no tokenizer and no network, which
- scripts/lib/work-item-staleness.mjs [F:a1baa3f01d]: States where a real actor could plausibly still be working the item. An item past this point (merge_ready, merging, done, escalated) is either already closing o
- scripts/lib/work-item-validate.mjs [F:cb3c5f7715]: Resolve a model name to its family by longest-matching prefix. Returns null when no prefix matches, so unrecognized models are treated as distinct families (the
- scripts/lib/yaml-lite.mjs [F:1575110130]: Parse a raw value string from after the colon, handling inline comments and quoted strings. Returns the trimmed scalar text or empty string.
- scripts/mcp-server.mjs [F:ab5077147a]: !/usr/bin/env node
- scripts/migrate-config.mjs [F:9d69a6b766]: Safe defaults for every lever. Migration fills any missing key from here.
- scripts/preflight-embedding.mjs [F:7232ada2da]: Minimal, dependency-free scan for top-level YAML job names under `jobs:`.
- scripts/promote-learning.mjs [F:ac11b5379f]: Slugify a lesson into a deterministic ID.
- scripts/ratchet-attestation.mjs [F:e9479e1a3b]: !/usr/bin/env node
- scripts/release.mjs [F:edf42fb1af]: !/usr/bin/env node
- scripts/remediate.mjs [F:1e5ef6ba70]: Resolve the full arming posture. Config values are advisory; the MODONOME_ARMED environment variable is authoritative (ADR-004). The capability flag layers ADR-
- scripts/report.mjs [F:3b382f95c0]: A source module counts as "documented" if its first non-shebang line is a `//` comment, or the file contains a ` ... ` JSDoc block anywhere. This is a simple he
- scripts/run-gate-pipeline.mjs [F:edb11415f0]: parseArgs(argv) -> { diff, "work-item" } map of fixture paths by gate arg name.
- scripts/scaffold.mjs [F:5e450ff82c]: Turn snapshot consumption on during adoption: generate the first snapshot, install a host pre-commit hook, and drop an AGENTS.md pointer when none exists. Skipp
- scripts/score-proposals.mjs [F:e11f907cba]: Fill in missing signal fields with the documented neutral value and clamp every field to the [SIGNAL_MIN, SIGNAL_MAX] scale.
- scripts/sign-packet.mjs [F:7b3e38c9a6]: Pure: attach a signature object to a packet using the given private key.
- scripts/snapshot.mjs [F:a0d489df6d]: Resolve incremental build inputs. --full forces a from-scratch rebuild. Otherwise load the cache and ask git what changed; a missing cache or unusable git yield
- scripts/sync-site-data.mjs [F:8abf9e432a]: Read a file, returning null if it does not exist. Reads directly instead of checking existsSync first, so there is no window between the check and the read wher
- scripts/test-prompt-behavior.mjs [F:23917c6197]: Concatenate the committed prompt source files into one searchable string. * @param {string} root repository root that contains the prompts directory * @returns 
- scripts/transition-work-item.mjs [F:d135cffeaa]: A lease is "live" if it has an owner and an unexpired lease_expires_at. The lease holder is recorded as lease_owner (the field this swap writes) or, for older i
- scripts/tripwire-check.mjs [F:3b96b6dfed]: Format-agnostic: driven by which fields the payload actually has, not by --format. A Claude PreToolUse payload always carries tool_name/tool_input; a Cursor bef
- scripts/validate-knowledge-packet.mjs [F:65193a9799]: !/usr/bin/env node
- scripts/verify-packet.mjs [F:0c1c5ad5d9]: Resolve an alias to an active, in-window key entry in the allowlist.
- site/README.md [F:669d2a51f4]: Modonome landing page (modonome.com)
- site/index.html [F:aef9cf1e27]: class Component
- templates/.github/copilot-instructions.md [F:6a5934a79d]: Copilot review guidance: gate integrity
- templates/.modonome/DECISIONS.md [F:037178c793]: Modonome decisions
- templates/.modonome/LESSONS.md [F:26c8e3a19a]: Learnings, staged candidate conventions
- templates/.modonome/NETWORK.md [F:515a65a35b]: Cross-repo network
- templates/.modonome/STATUS.md [F:e27748d089]: Modonome status
- templates/.modonome/control-panel.md [F:75c1125713]: Modonome control panel
- terraform/README.md [F:2148814594]: Modonome org-provisioning module
- tests/action-queue.test.mjs [F:195e9217ca]: function tmpQueue
- tests/agentproof-attestation.test.mjs [F:1bc6d1449f]: Tests for the AgentProof conformance attestation (ADR-042). The Statement shape and
- tests/arm-disarm.test.mjs [F:940d5f4399]: Tests for `modonome arm` and `modonome disarm`: the guided ceremony that flips
- tests/arming.test.mjs [F:60548316f5]: function tmpRepo
- tests/chaos.test.mjs [F:8fe56e5618]: Chaos test helper: any call must either return errors cleanly OR not throw. A crash or hang is a failure.
- tests/check-architecture-drift.test.mjs [F:564b053598]: function makeMinimalRepo
- tests/check-gate-dag.test.mjs [F:df4b55ecef]: Build a temp repo whose detect-attribution.mjs imports whatever `daImports` says.
- tests/check-md-governance.test.mjs [F:0391f3b249]: Build a minimal repo that satisfies the root allow-list, protected-file manifest, link integrity, and audit-naming checks, so only the ADR-number logic under te
- tests/check-style-lexicon.test.mjs [F:e359adb110]: Tests for the Lexicon Gate wired into scripts/check-style.mjs: a banned term from
- tests/cli-dispatch.test.mjs [F:40e4f39b59]: function cli
- tests/compliance-evidence.test.mjs [F:3ea503e7c0]: Helper reused by the mapping test.
- tests/config-key-parity.test.mjs [F:5eff4122c0]: Extract the string literals inside a named list/set declaration, regardless of whether it is `new Set([...])` or `[...] as const`.
- tests/connect.test.mjs [F:5956278014]: Tests for `modonome connect`, which registers the read-only MCP server with an agent
- tests/control-panel-ownership.test.mjs [F:d0da1cab80]: A scratch repo whose git email is faked through the injected `exec`, so the decision is tested without touching this repo's real git config.
- tests/control-panel-work-item-writer.test.mjs [F:e00aec45ce]: A minimal scratch .modonome dir: a config.yaml (read for governance validation, e.g. require_distinct_maker_checker_model) and an empty work-items/ directory.
- tests/control-panel-writer-nested.test.mjs [F:8b2f3dbcba]: Every test operates on a scratch copy of a real config.yaml, never the file itself, so a bug here can never corrupt real state.
- tests/decisions-authority.test.mjs [F:f921eecad7]: A repo with one commit (base: entry "a" only) and a second commit that adds a new Resolved entry "b" on top. Returns { dir, baseSha }.
- tests/dependency.test.mjs [F:b70824b13e]: Read all .mjs files in a directory (non-recursive by default).
- tests/dry-run.test.mjs [F:778c33cdc0]: function dryRun
- tests/e2e.test.mjs [F:9cbe9238f8]: function tmp
- tests/embedding-safety.test.mjs [F:cc65dd1342]: Run preflight in --json mode against a fixture. Returns { code, report, raw }. A clean environment is used so the host's own MODONOME_* shell does not leak into
- tests/fleet-ledger.test.mjs [F:571aa2f3ae]: Build a well-formed policy-attestation object (ADR-036 shape) via a helper, so the fixtures are constructed at runtime rather than pasted as large literals.
- tests/helpers/mock-github-server.mjs [F:4dabd020df]: Start a mock GitHub API server. * * @param {object} [options] * @param {object} [options.pr] - The PR object returned by the pulls endpoint (title, body). * @pa
- tests/helpers/mock-openai-server.mjs [F:eb14a0bdeb]: Start a mock OpenAI chat-completions server. * * @param {object} [options] * @param {"success"|"retry-then-success"|"delay"|"malformed"|"error"} [options.mode] 
- tests/hygiene.test.mjs [F:9bb94e1b40]: function cli
- tests/install-hooks.test.mjs [F:cba8f1d03b]: function tempRepo
- tests/learnings.test.mjs [F:54a3c626d9]: function run
- tests/maker-checker.test.mjs [F:5994385869]: function run
- tests/mcp-compliance.test.mjs [F:a167609a41]: Send requests to a fresh server process and resolve once every expected id has replied. The child is killed as soon as the responses arrive, which avoids the st
- tests/metrics.test.mjs [F:fadcf390da]: Schema-conformant event line using "event" field (not "type").
- tests/migrate-lessons-rename.test.mjs [F:55b3a4e2c0]: Tests for `modonome migrate --rename-lessons`: the file-rename half of the LEARNINGS ->
- tests/packet-signing.test.mjs [F:3de9042953]: function setup
- tests/performance.test.mjs [F:b28f13b600]: Build a synthetic 1000-line diff that is clean (no gaming patterns).
- tests/policy-attestation.test.mjs [F:137056535b]: Restore the committed (current, unsigned) artifact after any test that writes to it, so the suite leaves no drift behind.
- tests/portability.test.mjs [F:fd6ebce602]: Run validate-config.mjs against a given config path.
- tests/promote-learning.test.mjs [F:e540f7b669]: function run
- tests/promoted-learnings.test.mjs [F:ddd82fc886]: function withRoot
- tests/provenance.test.mjs [F:ba97282cf5]: Base valid packet factory: returns a fresh object each call.
- tests/providers.test.mjs [F:ee02e563c6]: function baseCfg
- tests/queue.test.mjs [F:9f6dd5e5a3]: Tests for `modonome queue`: converts scored dry-run proposals into schema-valid
- tests/ratchet-attestation.test.mjs [F:92dde817ee]: Tests for the gate-integrity in-toto receipt. The Statement shape and predicate type
- tests/ratchet-format.test.mjs [F:cede5f9fa2]: Tests for the machine-readable ratchet output (--json and --sarif). These lock in
- tests/ratchet.test.mjs [F:f238d164c9]: function ratchet
- tests/remediate.test.mjs [F:44a5987438]: Build a temp git repo whose origin/main is the base commit, then lay down a feature branch with one signature-in-message commit and one forbidden-identity commi
- tests/report-impact.test.mjs [F:8a3433b070]: function tmp
- tests/role-registry.test.mjs [F:e2f1b5ac07]: A single-environment config with no runner reachability declared, so routing stays inline for every role (matching the shipped default posture). Crew roles are 
- tests/rollback.test.mjs [F:0103cf3d56]: Recursively snapshot path -> "size:sha-like(content)" for every file.
- tests/route-action.test.mjs [F:704e42d42b]: A config where each runner declares its environment and reach.
- tests/run-cycle-openai.test.mjs [F:580d11b514]: Create a throwaway git repo with a single committed file, and return the repo dir plus a unified diff (produced by a real `git diff`, so it is guaranteed to be 
- tests/run-log.test.mjs [F:d7d4e8d2a9]: function tmp
- tests/scaffold-adoption.test.mjs [F:de5ebbf586]: function gitRepo
- tests/self-application.test.mjs [F:48355ccf4d]: Build a minimal passing temp repo and return the path. Caller must rmSync(tmp, {recursive:true}).
- tests/snapshot-cli.test.mjs [F:9f36b3ef29]: function run
- tests/snapshot-golden.test.mjs [F:2a74ae3f05]: function names
- tests/snapshot-incremental.test.mjs [F:4637e1fecb]: function repo
- tests/terraform-module-shape.test.mjs [F:ca05b6ba1c]: function tf
- tests/tick.test.mjs [F:baf7641a01]: function tmp
- tests/tool-loop-adapter.test.mjs [F:ed9c47feb2]: A scriptable fake child process. Captures the constructor call, emits the configured stdout/stderr, then closes (or hangs, when never told to close).
- tests/tripwire.test.mjs [F:61c2a29876]: Tripwires: the local, best-effort editor hook kernel (scripts/tripwire-check.mjs).
- tests/ws-b-harness.test.mjs [F:1bcaaff9eb]: A config fixture with distinct maker/checker models and a models registry.
- tests/ws-e-negative-controls.test.mjs [F:bbb6476d71]: WS-E: negative-control fixtures that prove governance gates have teeth.
- tests/ws-e-ratchet-languages.test.mjs [F:2b49c74e74]: function runRatchet

## Public API

### tests/rollback.test.mjs [F:0103cf3d56]
- S:c5854b8940 function snapshot `async function snapshot(dir)` L27 : Recursively snapshot path -> "size:sha-like(content)" for every file.
- S:44e7188c1d function hash `function hash(buf)` L50 : Tiny content hash (FNV-1a): avoids a crypto import and is deterministic.
- S:4ee042ed06 function makeHostRepo `async function makeHostRepo()` L59
- S:08df8d7472 function runPreflight `function runPreflight(target)` L70
### scripts/lib/snapshot-graph.mjs [F:015261eab0]
- S:c47beeac78 function normalizeRelative `function normalizeRelative(fromPath, module)` L11 : Normalize a relative import against the importing file's directory, resolving "." and ".." segments. Returns a posix path with no leading "./".
- S:0d7b0da50a function resolveImport `function resolveImport(fromPath, module, fileSet)` L24 : Resolve a relative import to a repo file, trying common extensions and index files. External and bare imports return null and become no edge.
- S:c732826ee5 function buildImportGraph `export function buildImportGraph(perFile, fileSet)` L41 : Build an adjacency map { relPath -> [relPath, ...] } from per-file imports. Only edges that resolve to another repo file are kept.
- S:79144070a6 function centrality `export function centrality(adj)` L55 : Degree centrality: out-edges of a node plus in-edges pointing at it.
- S:bb578790a3 function pagerank `export function pagerank(adj, { damping = 0.85, iterations = 40 } = {})` L67 : PageRank over the import graph. Fixed iteration count keeps it deterministic. Dangling nodes (no out-edges) redistribute their rank uniformly.
- S:4d0bae812e function round `function round(n, places = 6)` L91
- S:b88ce47ede function attentionRank `export function attentionRank(paths, { churn = new Map(), centralityMap = new Map(), pagerankMap = new Map() } = {})` L98 : Rank files by a normalized composite of churn, centrality, and PageRank. Returns a sorted list of { path, churn, centrality, pagerank, score }, highest first.
- S:5ad0c942a1 function findCycle `export function findCycle(adj)` L117 : Report whether the import graph has a cycle and one example cycle, reusing the shared cycle detector so the snapshot can warn about circular dependencies.
### agentproof/scenarios/ap-33-config-env-override-inert.mjs [F:02a5f8fc55]
- S:1e6749f65a function run `function run(env)` L31
### tests/check-md-governance.test.mjs [F:0391f3b249]
- S:c932c7339f function makeMinimalRepo `function makeMinimalRepo()` L15 : Build a minimal repo that satisfies the root allow-list, protected-file manifest, link integrity, and audit-naming checks, so only the ADR-number logic under test can make the run fail or pass.
- S:0ab594146c function runScript `function runScript(tmp)` L33
- S:689125598d function makeMinimalGitRepo `function makeMinimalGitRepo()` L43 : A git-init'd variant of makeMinimalRepo(), for the staleness check, which shells out to `git log` and needs a real repository to query.
- S:bac2ebbef5 function gitCommit `function gitCommit(tmp, message)` L53
- S:cd2e7eba8f function gitCommitAt `function gitCommitAt(tmp, message, isoDate)` L61 : Commit with an explicit, backdated timestamp, so staleness tests do not depend on same-day wall-clock ordering between setup commits and a `last_reviewed` stamp (git's `--since` treats a bare date as 
### examples/demo-app/tests/OrderService.test.js [F:044b762a79]
- S:949f988c9e function makeDb `function makeDb(orders = new Map())` L10
### design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx [F:08064e0c53]
- S:0a11409d06 interface WorkItemDetail `export interface WorkItemDetail extends WorkItemSummary` L14 : Full detail for a single work item, as shown in the read-only inspector drawer. * Extends the card summary shape with the fields only needed once someone opens the * item: identities, lease, allowed e
- S:6a4d8aa30d interface WorkItemDrawerProps `export interface WorkItemDrawerProps` L31
- S:1e67af68fc function Section `function Section({ label, children }: { label: string; children: ReactNode })` L52
- S:fff471613b function WorkItemDrawer `export function WorkItemDrawer({ item, open, onClose }: WorkItemDrawerProps)` L68 : A read-only inspector for a single work item, presented in the shared `Drawer` * primitive. Lays out status, the maker and checker identities, lease and branch * info, attempt count, the allowed edit 
### .design-sync/previews/Select.tsx [F:08577063d4]
- S:9f9c07db7d function Model `export const Model = () => (` L10
### apps/control-panel/server/api.mjs [F:08b7435c86]
- S:d3f17c584a function isSelfGovernance `function isSelfGovernance(dir)` L26
- S:02e2e85572 function resolveModonomeDir `function resolveModonomeDir(rawMode, dirParam)` L30
- S:8097fe47fc function readBody `function readBody(req)` L40
- S:a10a756308 function sendJson `function sendJson(res, status, body)` L59
- S:0e6240f5b7 function writeGate `function writeGate(baseWritable, dir)` L70 : The single source of truth for "may a write to this dir proceed", used both to decide a 403 and to set source.writable, so the two can never drift. Returns the base flag first (off => nothing is writa
- S:b06f3444be function stateWithSource `function stateWithSource(baseWritable, dir, mode)` L86
- S:62210684b4 function buildModelsUrl `function buildModelsUrl(baseUrl)` L98 : Best-effort reachability probe for an OpenAI-compatible endpoint (LM Studio, Ollama, a gateway). Read-only and network-only: it never touches config.yaml, so it needs no write guard. Always resolves (
- S:3f9e6b3a7b function testConnection `async function testConnection(baseUrl)` L104
- S:5092562c12 function modonomeApiPlugin `export function modonomeApiPlugin()` L130
### scripts/detect-near-miss.mjs [F:09ba331878]
- S:7078ce1661 function today `function today()` L38
- S:735c642c3a function collectNearMisses `export function collectNearMisses({ branch, commits })` L44 : Gather every near-miss across the branch name, commit identities, and commit bodies unique to this branch.
- S:4358d9c393 function proposalsFrom `export function proposalsFrom(findings)` L65 : A denylist proposal is per unique (tier, surface, token): the widener proposes adding a token, not fixing N occurrences. Keep the first occurrence as evidence.
- S:b89188d9e3 function main `function main(argv)` L74
### .design-sync/previews/ConfirmDialog.tsx [F:0a6a758e7d]
- S:b29fc4b0d5 function ArmEngine `export const ArmEngine = () => (` L3
### apps/control-panel/src/state/types.ts [F:0a85f3b8e5]
- S:8cd25e6f09 type PanelMode `export type PanelMode = "host" | "product";` L10
- S:40a4170626 type ArmingMode `export type ArmingMode = "disabled" | "dry-run" | "armed";` L11
- S:49f97badd7 type WorkState `export type WorkState =` L12
- S:3e9158c80b type RiskTier `export type RiskTier = 1 | 2 | 3 | 4;` L22
- S:86cb290127 interface Subject `export interface Subject` L25 : The subject a mode points at: which repo the panel is reading.
- S:a337ae8f0b interface ModonomeConfig `export interface ModonomeConfig` L37 : The engine configuration (schemas/config.schema.json), the levers the panel edits.
- S:d56c1854d7 interface ArmingCheck `export interface ArmingCheck` L86 : One prerequisite in the armed-mode gate checklist.
- S:6bc87187a8 interface ArmingStatus `export interface ArmingStatus` L94
- S:a4a9a79fbe type WorkItemType `export type WorkItemType = "fix-issue" | "develop-feature" | "create-article" | "create-plan" | "update-docs" | "chore";` L101
- S:3f93aaa307 const IN_FLIGHT_STATES `export const IN_FLIGHT_STATES: WorkState[] = ["claimed", "making", "checking", "rework", "merge_ready", "merging"];` L105 : True for any state where a real actor could be actively working the item: * mutating it destructively (delete) needs the lease released first.
- S:5a49db2766 interface WorkItemVM `export interface WorkItemVM` L107
- S:f3e5c99141 interface LeaseVM `export interface LeaseVM` L133
- S:dddb39652d type GateStatus `export type GateStatus = "pass" | "fail" | "flaky" | "running" | "pending";` L140
- S:9bc07de53c interface GateVM `export interface GateVM` L142
- S:126357e421 interface CostByModel `export interface CostByModel` L151
- S:ebe2964819 interface CostVM `export interface CostVM` L159
- S:72a5c214ac interface LearningVM `export interface LearningVM` L168
- S:e03cf612ca interface DecisionVM `export interface DecisionVM` L178
- S:6ef3b2f2e5 interface RemediationProposalVM `export interface RemediationProposalVM` L188 : One commit the metadata-only remediator would rewrite, and why.
- S:b41535d6e7 interface RemediationVM `export interface RemediationVM` L199 : The armed metadata-only remediator (ADR-035) as a read-only surface plus one owner * lever. `applyEnabled` mirrors the config flag; `ready` is true only when every arming * condition is met, and `bloc
- S:3ad2d564a8 type AuditKind `export type AuditKind =` L208
- S:7c6ba2a644 interface AuditEventVM `export interface AuditEventVM` L223
- S:19226d4902 interface ProtectedPathVM `export interface ProtectedPathVM` L230
- S:61e677ae40 interface TrendPoint `export interface TrendPoint` L237
- S:cefb8c3f64 interface PanelSource `export interface PanelSource` L243 : Where a loaded PanelState actually came from, so the UI never presents demo data as real.
- S:4a0171ecb5 interface PanelState `export interface PanelState` L256
- S:6dcad3cdf1 interface NewWorkItemInput `export interface NewWorkItemInput` L284 : Fields a new work item is created with. Always starts in state "queued".
- S:7934857ce3 interface WorkItemPatch `export interface WorkItemPatch` L296 : Safe-to-edit-anytime fields: never state, owner, or lease, since those change only * through the existing lease/transition machinery, never a generic metadata edit.
- S:a2d9480f78 interface WriteActions `export interface WriteActions` L305
### scripts/verify-packet.mjs [F:0c1c5ad5d9]
- S:6dd199eea1 function resolveActiveKey `export function resolveActiveKey(peerKeys, alias, now = new Date())` L19 : Resolve an alias to an active, in-window key entry in the allowlist.
- S:f3b8628cdb function verifyPacket `export function verifyPacket(packet, peerKeys, { now = new Date(), skipContentGate = false } = {})` L35 : Full ordered verification. options.skipContentGate runs only the signature checks (steps 3 to 5), used when the caller already ran the schema and redaction gate.
### scripts/lib/ed25519.mjs [F:0cacf66a3b]
- S:ee5246d16c function generateKeypair `export function generateKeypair()` L14
- S:842e875c5a function publicKeyB64 `export function publicKeyB64(keyObject)` L19 : Raw 32-byte public key as base64, accepting either a public or private KeyObject.
- S:8a971e3c54 function publicKeyFromB64 `export function publicKeyFromB64(b64)` L26 : Public KeyObject from a raw 32-byte base64 public key.
- S:380b82547c function privateKeyFromB64Pkcs8 `export function privateKeyFromB64Pkcs8(b64)` L32 : Private KeyObject from base64 PKCS8 DER (the env-secret format).
- S:19e5ddb185 function privateKeyToB64Pkcs8 `export function privateKeyToB64Pkcs8(keyObject)` L36
- S:1c7919b4ea function signMessage `export function signMessage(message, privateKeyObject)` L40
- S:fb81ef11a3 function verifyMessage `export function verifyMessage(message, sigB64, publicKeyObject)` L44
- S:4a08c48993 function fingerprint `export function fingerprint(pubB64)` L54 : Short fingerprint for out-of-band key comparison (ADR-017 enrollment): the first 16 hex characters of sha256 over the raw public key bytes.
### apps/control-panel/src/state/arming.ts [F:0da05a2a05]
- S:f2e1ea8458 function deriveMode `export function deriveMode(config: ModonomeConfig, envArmed: boolean): ArmingMode` L16
- S:97bc3f0eb4 function deriveArming `export function deriveArming(` L22
### .design-sync/previews/StatusPill.tsx [F:10e76cfcd3]
- S:a3fb13b441 function Tones `export const Tones = () => (` L4
### apps/control-panel/src/App.tsx [F:113387361d]
- S:a1d4334d94 function App `export function App()` L43
### scripts/lib/snapshot-cache.mjs [F:119e3c0fce]
- S:670e55d75a const CACHE_SCHEMA_VERSION `export const CACHE_SCHEMA_VERSION = 1;` L10
- S:31032f0509 function isPlausibleRevision `export function isPlausibleRevision(value)` L17 : A value safe to pass as a git revision argument: a short-to-full hex SHA. Rejects anything else, in particular a leading "-", which git would parse as an option (some git options can read or write fil
- S:7762c6d861 function cachePath `function cachePath(root)` L21
- S:59b9039619 function loadCache `export function loadCache(root)` L28 : Load the cache for a repo, or null when absent, unreadable, or a different version.
- S:ba5f7d1ffe function saveCache `export function saveCache(root, { built_at_head = null, entries = {} })` L41 : Persist the cache. entries is { relPath: { hash, symbols, imports, purposeRaw } }.
- S:ed24428ce0 function gitHead `export function gitHead(root)` L50 : The current git HEAD sha for the repo, or null when unavailable.
- S:236237bc1b function unquote `function unquote(p)` L56 : Strip git's optional quoting from a porcelain path.
- S:93d0a78f18 function changedPaths `export function changedPaths(root, cache)` L65 : The set of paths that changed since the cache was built: uncommitted work (git status) plus commits since cache.built_at_head. Returns null when git is not usable, which forces a full rebuild.
### scripts/fleet-ledger.mjs [F:128b647d9a]
- S:c3d94f0812 function parseRepoFromUrl `export function parseRepoFromUrl(url)` L32 : Pull "owner/repo" out of a repository URL such as https://github.com/enumind/modonome(.git). Returns "" when it does not parse.
- S:d1b03afffb function deriveRepoName `export function deriveRepoName(att, filename)` L41 : Derive a stable repo label. The generator block credits the tool (generator.name is always "modonome"), so the per-repo identity lives in generator.repository. Prefer that, then fall back to the filen
- S:3a57c07db5 function derivePosture `export function derivePosture(posture)` L48 : Three-way posture from the attestation posture block.
- S:26df582c22 function buildRow `export function buildRow(filename, text)` L57 : Build one row from a filename and its raw text. A parse or shape problem is recorded on the row and reported as a table cell; it never throws, so one bad file cannot crash the whole run.
- S:ba36fd17d6 function collectRows `export function collectRows(dir)` L100 : Read every *.json file in dir and build a row for each. Files are read once with readFileSync (no separate stat then read, so there is no check-to-use race window). Returns unsorted rows.
- S:c42dd60d39 function sortRows `export function sortRows(rows)` L126 : Deterministic order: by repo label, then by filename as a tie-break.
- S:7619cf060d function escapeHtml `function escapeHtml(s)` L133
- S:7bcf8115de function capabilitiesCell `function capabilitiesCell(caps)` L141
- S:b366c411d2 function renderHtml `export function renderHtml(rows, options = {})` L150 : Render the sorted rows to a self-contained HTML document. Pure: given the same rows and options it returns the same string.
- S:5afb2ca954 function renderLedgerFromDir `export function renderLedgerFromDir(dir, options = {})` L225 : Full pipeline: directory to HTML string. Exported for tests.
- S:0255163ba3 function parseArgs `function parseArgs(argv)` L229
- S:cecb0a4a33 function main `function main(argv)` L248
### scripts/lib/packet-id.mjs [F:12c7a4e461]
- S:3968554637 const VOLATILE_FIELDS `export const VOLATILE_FIELDS = ['id', 'signature'];` L8
- S:9f7fa8d585 function packetContent `export function packetContent(packet)` L10
- S:a0ea4d9d0f function computePacketId `export function computePacketId(packet)` L18
- S:d2ef86c19f function packetIdMatches `export function packetIdMatches(packet)` L23
### tests/policy-attestation.test.mjs [F:137056535b]
- S:4700befa2a function run `function run(args = [], env = {})` L16
- S:bc56c13940 function preservingArtifact `function preservingArtifact(fn)` L22 : Restore the committed (current, unsigned) artifact after any test that writes to it, so the suite leaves no drift behind.
- S:2cd4d9571d function withTempFile `function withTempFile(name, content, fn)` L189
### .design-sync/previews/ProtectedPathRow.tsx [F:13d31b33ea]
- S:5708b6bd2b function PendingApproval `export const PendingApproval = () => (` L4
- S:4f265e8008 function Approved `export const Approved = () => (` L8
- S:93e0292f30 function Protected `export const Protected = () => <ProtectedPathRow path="prompts/" approvalNeeded={false} />;` L12
### design-system/src/components/ActivationLadder/ActivationLadder.tsx [F:14edab923f]
- S:e80517f20b interface ActivationCheck `export interface ActivationCheck` L6
- S:30eded078f interface ActivationLadderProps `export interface ActivationLadderProps` L17
- S:73a3da9f65 function ActivationLadder `export function ActivationLadder(` L46 : The activation ladder: the three-rung progression from Disabled to Dry-run to Armed, * paired with the armed-mode gate checklist. Arming is only allowed when every * prerequisite holds. Items marked o
### scripts/lib/yaml-lite.mjs [F:1575110130]
- S:237d74cadf function parseScalar `function parseScalar(raw)` L21
- S:299c43d83e function stripQuotes `function stripQuotes(s)` L39
- S:0b7b39d873 function extractRawValue `function extractRawValue(afterColon)` L48 : Parse a raw value string from after the colon, handling inline comments and quoted strings. Returns the trimmed scalar text or empty string.
- S:b4a3093fe9 function indentOf `function indentOf(line)` L65 : Count leading spaces to determine nesting depth.
- S:bec355e18a function parseEntries `function parseEntries(entries, start, minIndent)` L74 : Parse an array of non-empty, non-comment lines into a nested object. Each entry is { indent, key, rawValue, isItem }, where a sequence-item line ("- value") has isItem: true and key: null.
- S:8990e6571f function parseFlatYaml `export function parseFlatYaml(text)` L117
- S:5bac9ae6d5 function formatScalarForYaml `function formatScalarForYaml(value)` L150
- S:efe9cb11d4 function patchTopLevelYaml `export function patchTopLevelYaml(text, patch)` L161 : Patch one or more top-level (zero-indent) scalar keys in a config.yaml's raw text, line by line. Every other line, including every comment, is left untouched, so a hand-written config file survives an
### tests/action-queue.test.mjs [F:195e9217ca]
- S:0064b473e6 function tmpQueue `function tmpQueue()` L14
- S:d240732a9d function sampleAction `function sampleAction(id, target = "ci")` L18
### design-system/src/components/ConceptTile/ConceptTile.tsx [F:1a137480ae]
- S:05a5299b28 interface ConceptTileProps `export interface ConceptTileProps extends ButtonHTMLAttributes<HTMLButtonElement>` L5
- S:14c08c7efc function ConceptTile `export function ConceptTile({ icon, label, tag, className, ...rest }: ConceptTileProps)` L20 : A compact, focusable tile naming one engine concept: an icon, its name, and a short * category tag. Renders as a real button so it is keyboard-reachable on its own, meant * to be wrapped in a HoverCar
### scripts/lib/control-panel-audit.mjs [F:1a19f02364]
- S:76d7b21daf const MAX_CONTROLS_PER_TAB `export const MAX_CONTROLS_PER_TAB = 10;` L18 : Today's real high-water mark is 7 (Arming & Safety, Caps & budget tab). The budget is set a few above that: a real ratchet against regression, not an arbitrary ceiling.
- S:b840cddd67 function readScreens `function readScreens(root)` L20
- S:7a05eaea5a function auditCoverage `export function auditCoverage(root)` L34 : Every field in config.schema.json must resolve to either a literal reference in a screen (a real control, or read-only display) or a documented exemption in exposure.json. A plain substring search, no
- S:da2f845458 function splitByTabs `function splitByTabs(text)` L57 : Splits a screen's source into one segment per tab (by source order, using the `{tab === "id" ?` marker this codebase's tabbed screens consistently use), or a single whole-file segment for screens with
- S:6a7737bb57 function extractTags `function extractTags(text, tagNames)` L66
- S:0ac24bec51 function auditCoherence `export function auditCoherence(root)` L76 : Two checks, both numeric: a screen/tab must not exceed the control-density budget, and every value-entry control (Toggle, NumberField, Slider, Select) must carry a hint. Input is excluded from the hin
### .design-sync/previews/Table.tsx [F:1aa7cf650d]
- S:762b3eaf4a function Models `export const Models = () => (` L17
### tests/agentproof-attestation.test.mjs [F:1bc6d1449f]
- S:8da618623d function headSha `function headSha()` L18
### tests/ws-b-harness.test.mjs [F:1bcaaff9eb]
- S:fc01241f03 function cfg `function cfg(overrides = {})` L13 : A config fixture with distinct maker/checker models and a models registry.
### scripts/lib/snapshot-anchors.mjs [F:1cf31c4792]
- S:55b15c0abb function short `function short(text, len = 10)` L9 : A short, stable id from a string. Hex keeps it deterministic across platforms.
- S:2e016b842d function fileAnchor `export function fileAnchor(relPath)` L13
- S:00db09c5a8 function symbolAnchor `export function symbolAnchor(relPath, name)` L17
- S:ab79b43633 function buildPathDictionary `export function buildPathDictionary(relPaths)` L24 : Build the path dictionary from walked files. Returns { paths, pathIdByPath } where `paths` is the serializable { id -> relPath } map and `pathIdByPath` is the reverse lookup callers use to reference p
- S:63613c3a63 function buildSymbolDictionary `export function buildSymbolDictionary(apiEntries)` L37 : Build the symbol dictionary from API entries. Each entry carries its anchor, owning path id, name, and line, so an anchor resolves to an exact location.
### design-system/src/components/LearningCard/LearningCard.tsx [F:1d03291691]
- S:a3ca73d34c type LearningStatus `export type LearningStatus = "staged" | "promoted";` L6 : Lifecycle status of a learning: staged for review, or promoted into a permanent gate.
- S:6cbed7ff26 interface LearningSummary `export interface LearningSummary` L13 : Plain data shape for a single learning surfaced by the system. Components in this * package define their own shape rather than importing app-level types, so this * interface is the contract a host app
- S:8b9971d92a interface LearningCardProps `export interface LearningCardProps` L30
- S:d293a69125 function LearningCard `export function LearningCard({ learning, onPromote, onPrune }: LearningCardProps)` L49 : A card summarizing a single learning the system has surfaced: the lesson learned, * how old it is, what signal or evidence produced it, and its lifecycle status. * Staged learnings offer Promote and P
### design-system/src/components/Tabs/Tabs.tsx [F:1db369d970]
- S:14850052c8 interface TabItem `export interface TabItem` L6
- S:c68bb17ca2 interface TabsProps `export interface TabsProps` L17
- S:bd1a0a35f8 function Tabs `export function Tabs({ tabs, active, onChange, className }: TabsProps)` L35 : An accessible horizontal tab list. Implements the WAI-ARIA tabs pattern: the * container carries `role="tablist"`, each tab carries `role="tab"` and * `aria-selected`, and only the active tab is in th
### scripts/remediate.mjs [F:1e5ef6ba70]
- S:d737cd7277 function flagValue `function flagValue(argv, name)` L51
- S:8f93f4689a function armState `function armState(root, env = process.env)` L59 : Resolve the full arming posture. Config values are advisory; the MODONOME_ARMED environment variable is authoritative (ADR-004). The capability flag layers ADR-024: even an armed engine will not rewri
- S:46d884501c function armingBlockers `function armingBlockers(arm)` L74
- S:baa16abe42 function targetIdentity `function targetIdentity(argv)` L83
- S:6140d7ae56 function identityUsable `function identityUsable(id)` L89
- S:edeb959111 function gatherRange `function gatherRange()` L96 : Gather the branch-unique commit range oldest-first with the fields the applier needs: tree object, first parent, author and committer identity and dates, and raw message. Enforces the protected-histor
- S:4bc9723575 function advisoryRange `function advisoryRange()` L120 : Advisory range for `plan`: tolerant of a missing origin/main so the proposal works in a fresh clone. Newest-first from git log; reversed to oldest-first for stable output.
- S:59807c1a98 function buildPlan `function buildPlan(branch, commits, identity)` L133
- S:2484ffb006 function printPlan `function printPlan(plan, identity)` L141
- S:e7f49cafe1 function isDirtyTracked `function isDirtyTracked()` L167
- S:e2861b1099 function rollback `function rollback(savedHead)` L172
- S:e8b27564c5 function applyPlan `function applyPlan(commits, plan)` L179 : Replay the range from the first changed commit forward, reusing each original tree object so the rewrite is metadata-only. Verifies tree-SHA invariance per commit and rolls back on any failure. Return
- S:b97efe3854 function cmdPlan `function cmdPlan(argv)` L231
- S:69db4ad7cc function cmdApply `function cmdApply(argv, root)` L243
- S:602e030d27 function main `function main(argv)` L294
### examples/demo-app/src/OrderService.js [F:1ecd18c4b9]
- S:5a6c3aef24 class OrderService `export class OrderService` L7
### .design-sync/previews/Slider.tsx [F:1f40b6eb6e]
- S:a2fef04067 function Budget `export const Budget = () => (` L4
### scripts/agent/review-proposals.mjs [F:2127a8caca]
- S:8c2cd9c54f function buildProposalReviewPrompt `export function buildProposalReviewPrompt(proposal, checkerModel, authorLabel)` L26 : The proposal text is fenced and framed as untrusted data, so a proposal cannot prompt-inject the checker into approving itself. Same hardening as review-diff.mjs.
- S:ebd259dfef function planProposalReview `export function planProposalReview(cfg, { proposal, authorLabel = "an external author" } = {})` L43 : Resolve the checker and plan its review of a proposal, without calling a model. * * @returns {{ checker: object, authorLabel: string, proposal: string, prompt: string }}
- S:a1cc5660fe function parseProposalVerdict `export function parseProposalVerdict(text)` L56 : A garbled review, or one with no explicit marker, must NOT read as an approval: a proposal is admitted to the backlog only on an explicit APPROVE: yes. Fail closed.
- S:3fc87c5f7e function reviewProposal `export async function reviewProposal(cfg, { proposal, authorLabel, execute = false } = {}, deps = {})` L73 : Plan the proposal review and, under execute:true, run the checker on its endpoint. * The live path supports the openai-http transport (a local or free/gateway model), * matching the local-first cost s
### design-system/src/components/Toggle/Toggle.tsx [F:214cc0a5f4]
- S:537ea4dfe0 type ToggleTone `export type ToggleTone = "primary" | "info" | "owner";` L5
- S:cd836c2fc7 interface ToggleProps `export interface ToggleProps` L7
- S:84b00e90de function Toggle `export function Toggle(` L28 : An accessible switch for boolean config such as dry_run, auto_merge, or * local_model_only_by_default. Implemented as a `role="switch"` button rather * than a checkbox so the on/off semantics are anno
### .design-sync/previews/ActivationLadder.tsx [F:2207a6ebce]
- S:b919653baa function DryRun `export const DryRun = () => (` L44
- S:ea5d04ea13 function Armed `export const Armed = () => (` L48
### apps/control-panel/server/modonomeWriter.mjs [F:22566cb46e]
- S:7cd45cbc03 function formatYamlScalar `function formatYamlScalar(value)` L57
- S:1c5d801590 function patchYamlText `function patchYamlText(text, patch)` L65 : A line-level patch, not a full YAML re-serialize, so every hand-written comment in config.yaml survives an edit made from the panel. Only top-level, zero-indent scalar or array keys are touched here; 
- S:15b3a95566 function findBlock `function findBlock(lines, key)` L95 : Locate a top-level `key:` block-opening line (a zero-indent key whose value is empty, meaning what follows is a nested map) and the half-open [start, end) line range it and its indented content occupy
- S:aa8f9a7b3d function captureSegments `function captureSegments(lines, start, end)` L117 : Split a block's interior lines into ordered segments: a real entry (a line at exactly ENTRY_INDENT spaces naming a key, plus every following line indented deeper than that), or "other" (blank lines, a
- S:c3a1d0f1a7 function serializeEntry `function serializeEntry(topKey, entryKey, value)` L146
- S:af28852c7f function deepEqualJson `function deepEqualJson(a, b)` L164
- S:2eef7d840d function rewriteBlock `function rewriteBlock(lines, topKey, oldValue, newValue)` L175 : Reconcile one nested map's block against its new value, entry by entry. An entry present in both, unchanged, is copied verbatim (comments and all); a changed entry is re-serialized (dropping any comme
- S:b06714d9c5 function patchConfig `export function patchConfig(modonomeDir, patch)` L220
- S:8b67ef3e8b function workItemFile `function workItemFile(modonomeDir, itemId)` L261
- S:fd9d32de9a function releaseLease `export function releaseLease(modonomeDir, itemId)` L267
- S:d7086f2a5b function loadConfigForValidation `function loadConfigForValidation(modonomeDir)` L295
- S:f22a53ac17 function createWorkItem `export function createWorkItem(modonomeDir, input)` L300
- S:a4e623c70b function updateWorkItem `export function updateWorkItem(modonomeDir, itemId, patch)` L349 : Metadata-only edit: type, assigned_role, allowed_edit_set, gates, max_attempts, and touches_protected_path are safe to change regardless of the item's current state, including in flight, since none of
- S:14cb0e8cbb function deleteWorkItem `export function deleteWorkItem(modonomeDir, itemId)` L372 : Refuses outright for any in-flight state, regardless of whether its lease has technically expired: an item past "queued" represents real record of what happened (a branch, a PR, attempts, a maker iden
- S:5b0e153cfb function pruneLearning `export function pruneLearning(modonomeDir, lesson)` L383
### scripts/test-prompt-behavior.mjs [F:23917c6197]
- S:a931ad2e62 function resolvePromptText `export function resolvePromptText(root)` L44 : Concatenate the committed prompt source files into one searchable string. * @param {string} root repository root that contains the prompts directory * @returns {string} the concatenated committed prom
- S:0a5fed1978 function loadFixtures `export function loadFixtures(dir)` L57 : Load every fixture JSON file from a directory. * @param {string} dir directory holding fixture *.json files * @returns {Array<object>} parsed fixture objects, sorted by file name for stable output
- S:407ded8730 function evaluateFixture `export function evaluateFixture(fixture, promptText)` L77 : Evaluate one fixture against the committed prompt text. A fixture is ok only when * every one of its anchors is present, meaning the governing rule that produces its * golden decision still exists in 
- S:c2e641f1c8 function runSuite `export function runSuite(root, fixturesDir)` L100 : Run the whole suite: load fixtures, resolve prompt text, evaluate each. * @param {string} root repository root * @param {string} fixturesDir directory holding fixtures * @returns {{ results: Array<{id
### scripts/lib/canonical-json.mjs [F:245efb551c]
- S:76171943e3 function canonicalize `export function canonicalize(value)` L7
- S:781c4112a2 const PACKET_DOMAIN `export const PACKET_DOMAIN = 'modonome.knowledge-packet.v1\n';` L22 : Domain separation tag binds a signature to this packet type and version so a signature over one structure cannot be replayed as another.
- S:210b0c6999 function signedBytes `export function signedBytes(packet)` L26 : The exact bytes a packet signature covers: the domain tag followed by the JCS of the packet with its signature object removed.
### .design-sync/previews/AppShell.tsx [F:2470e60179]
- S:c44da37a7d function Dashboard `export const Dashboard = () => (` L12
### .design-sync/previews/LearningCard.tsx [F:250c8a0d4a]
- S:7d5af2fca1 function Staged `export const Staged = () => (` L22
- S:dd05df51d3 function Promoted `export const Promoted = () => <LearningCard learning={promotedLearning} />;` L26
### scripts/lib/lang-adapters/index.mjs [F:2554ddd30c]
- S:4df7a92e8e function registerAdapter `export function registerAdapter(adapter)` L15
- S:a07487517b function getAdapter `export function getAdapter(relPath)` L25 : Resolve the adapter for a path by extension, defaulting to the generic fallback.
- S:ec18e42e1a function extractFile `export function extractFile(relPath, source)` L32 : Extract from one file, guarding against any adapter error so a single bad file never aborts a whole snapshot.
### apps/control-panel/src/state/configDiff.ts [F:25e649633c]
- S:2fbd29545b function nestedMapChanged `function nestedMapChanged(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean` L42
- S:ea841eb82d function diffConfig `export function diffConfig(base: ModonomeConfig, edited: ModonomeConfig): Partial<ModonomeConfig>` L49
### design-system/src/components/AppShell/AppShell.tsx [F:268769c4a6]
- S:4426823827 interface NavItem `export interface NavItem` L5
- S:a4155f5067 interface AppShellProps `export interface AppShellProps` L16
- S:24b854ce78 function BrandMark `function BrandMark()` L36 : The Modonome brand mark: a teal ring with a check on the dark ground.
- S:5154763a93 function AppShell `export function AppShell(` L60 : The application frame: a fixed sidebar of primary navigation, a sticky top bar for * the mode switch and arming status, and a scrollable content column. It establishes * the mdn-root wrapper (the dark
### .design-sync/previews/ArmingStateBadge.tsx [F:28b7af3c53]
- S:df7e6c1db0 function Disabled `export const Disabled = () => <ArmingStateBadge mode="disabled" size="md" />;` L4
- S:36be7c4ac5 function DryRun `export const DryRun = () => <ArmingStateBadge mode="dry-run" size="md" />;` L6
- S:813f68335e function Armed `export const Armed = () => <ArmingStateBadge mode="armed" envArmed size="md" />;` L8
- S:28578fa81a function Large `export const Large = () => <ArmingStateBadge mode="armed" envArmed size="lg" />;` L10
### tests/snapshot-golden.test.mjs [F:2a74ae3f05]
- S:d595535449 function names `function names(result)` L9
- S:a5baaff840 function modules `function modules(result)` L12
### tests/ws-e-ratchet-languages.test.mjs [F:2b49c74e74]
- S:b9942b1651 function runRatchet `function runRatchet(diffFile)` L11
### scripts/lib/merkle.mjs [F:2b9c43b0ca]
- S:015c572711 function hashFileContent `export function hashFileContent(bytes)` L9 : Hash raw file bytes (Buffer or string) into a prefixed digest.
- S:b926c18911 function hashString `export function hashString(text)` L15 : Hash an arbitrary string, used for oversized or unreadable files where content is represented by a stable stand-in rather than its bytes.
- S:a320bea4da function buildMerkleTree `export function buildMerkleTree(entries)` L21 : Build a Merkle tree from file leaves. `entries` is [{ relPath, hash }]. Returns { root, nodes } where nodes maps every directory path (root is ".") to its hash.
- S:85c852fd1a function diffMerkle `export function diffMerkle(prevFiles, nextFiles)` L52 : File-level diff between two { relPath -> hash } maps. Returns sorted lists of added, removed, and changed paths. Directory node hashes (from buildMerkleTree) let a caller skip re-extracting an unchang
### examples/python-service/tests/test_orders.py [F:2c2cc77861]
- S:ad4edf7e81 function test_total_sums_prices `def test_total_sums_prices()` L4
- S:54d2db3f99 function test_apply_discount_zero_percent `def test_apply_discount_zero_percent()` L8 : Test discount with 0% - should return full amount. Note: This covers only the zero-discount case. The function should be tested with non-zero discounts (10%, 50%, etc.) to verify correct discount calc
### scripts/check-portability.mjs [F:2d4c555ba1]
- S:93fa315ac7 function fail `function fail(code, message)` L41
- S:8252cf2ba8 function warn `function warn(code, message)` L45
- S:003e6c53c4 function info `function info(code, message)` L49
### scripts/agent/review-diff.mjs [F:2d6ef08990]
- S:5ef7e9a80c function buildReviewPrompt `export function buildReviewPrompt(diff, checkerModel, authorLabel)` L33 : Build the review prompt. The diff is fenced and explicitly framed as untrusted data, never as instructions, so a change cannot prompt-inject the checker into approving itself (the new attack surface a
- S:d5a9bb4227 function capDiff `function capDiff(diff)` L47
- S:fb6bf396bc function planReview `export function planReview(cfg, { diff, makerModel = null, authorLabel = "an external author" } = {})` L61 : Resolve the checker and plan its review of a diff, without calling any model. * Enforces checker independence: when the change's maker model is known and distinct * models are required, the checker mu
- S:9ab63d4bb2 function parseVerdict `export function parseVerdict(text)` L83 : Extract a coarse structured verdict from the checker's free text. Deliberately simple: the summary is the first line, REQUEST_CHANGES drives the requestChanges flag. A missing marker is treated as "no
- S:bca7722767 function reviewDiff `export async function reviewDiff(cfg, { diff, makerModel, authorLabel, execute = false } = {}, deps = {})` L100 : Plan the review and, under execute:true, run the checker on its configured endpoint. * The spike's live path supports the openai-http transport (a local or free/gateway * model, matching the local-fir
- S:568ac62670 function parseArgs `function parseArgs(argv)` L124 : --- CLI ---------------------------------------------------------------------
- S:f12376c7b1 function readDiff `function readDiff(path)` L136
- S:2d24ebcbdf function renderReport `function renderReport({ plan, executed, review })` L143 : A markdown block for a human, and for GitHub Actions the same block lands in the job summary when the workflow redirects stdout to $GITHUB_STEP_SUMMARY.
### scripts/lib/cli-args.mjs [F:2d93cea2d4]
- S:118e66be10 function flagValue `export function flagValue(argv, name)` L2 : Minimal argv helper shared by scripts that take `--flag value` pairs.
### scripts/build-compliance-evidence.mjs [F:2e327963ed]
- S:4bacff1244 function fileExists `function fileExists(root, ...candidates)` L15
- S:41050d03a4 function readIfExists `function readIfExists(root, rel)` L19
- S:1be3814c77 function listWorkflows `function listWorkflows(root)` L24
- S:8f1da92228 function detectRepoFacts `export function detectRepoFacts(root)` L32 : Observe concrete facts about a repository. Pure with respect to its inputs: it only reads the filesystem under root and returns a plain object.
- S:74bea9ecdf function criterion `function criterion(id, framework, level, met, evidence)` L59 : A criterion entry: a stable id, the framework and level, whether the observed facts satisfy it, and the evidence or remediation note.
- S:8e94f927e1 function mapToCriteria `export function mapToCriteria(facts)` L64 : Map observed facts to criteria across the supported frameworks. Pure.
- S:a0db477c6e function summarize `export function summarize(criteria)` L90
- S:f93b3b8c7c function buildEvidence `export function buildEvidence(root, generatedAt)` L95
- S:43f1c85009 function renderMarkdown `export function renderMarkdown(evidence)` L108
### design-system/src/components/States/States.tsx [F:2f6c42c5ee]
- S:c504685956 interface EmptyStateProps `export interface EmptyStateProps` L4
- S:80e9a1f555 function EmptyState `export function EmptyState({ title, message, icon = "queue", action }: EmptyStateProps)` L20 : Calm, muted placeholder for a screen or panel that has no content yet. Use for * empty queues, empty search results, or a fresh workspace before any work items * exist. Centered and low-emphasis so it
- S:baacff5701 interface LoadingStateProps `export interface LoadingStateProps` L33
- S:0a9b63cb4b function LoadingState `export function LoadingState({ label = "Loading" }: LoadingStateProps)` L44 : Centered spinner with a label, used while a screen or panel is fetching data. * The spinner is a decorative rotating ring; the label carries the accessible * status via `role="status"` so assistive te
- S:9382da6a24 interface ErrorStateProps `export interface ErrorStateProps` L53
- S:78e9af551d function ErrorState `export function ErrorState({ title = "Something went wrong", message, action }: ErrorStateProps)` L68 : Danger-toned placeholder for a screen or panel that failed to load. Pairs the * danger color with an alert icon and text so the failure is never color-only. * Use `role="alert"` semantics are carried 
- S:79676d74df interface PermissionDeniedStateProps `export interface PermissionDeniedStateProps` L81
- S:3800b0c645 function PermissionDeniedState `export function PermissionDeniedState(` L95 : Owner-toned placeholder shown when the current actor lacks the role needed to * view or act on a screen. Pairs the owner color with a lock icon and text so the * restriction is never color-only.
### design-system/src/components/StatusPill/StatusPill.tsx [F:2fc610bd94]
- S:fc6f0e771f type StatusPillTone `export type StatusPillTone = "neutral" | "ok" | "info" | "attention" | "blocked";` L5
- S:0518e5f603 type StatusPillSize `export type StatusPillSize = "sm" | "md";` L6
- S:c850118bb2 interface StatusPillProps `export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement>` L8
- S:eb647d4678 function StatusPill `export function StatusPill(` L27 : A compact rounded status indicator. Pairs a tinted background and border with the * tone's color, and always renders its label text (plus an optional icon or dot) so * the status reads correctly even 
### scripts/agent/resolve-role.mjs [F:304ce7b89d]
- S:35a01a919e function primaryModel `function primaryModel(roleCfg, roleDefaults)` L45 : The role's primary model: an explicit `model`, else the head of its prioritized `models` fallback list, else the role default. Keeping `model` authoritative when present preserves every existing confi
- S:0713a27a1f function resolveRole `export function resolveRole(cfg, role)` L51
- S:433f196465 function resolveRoleModelChain `export function resolveRoleModelChain(cfg, role)` L85 : Resolve a role's prioritized model list into an ordered array of fully-resolved model descriptors, highest priority first. Source is roleCfg.models when present, else the single primary model, so a ro
- S:5aed523637 function selectUsableModel `export function selectUsableModel(chain, { budgetUsdPerDay = 0 } = {})` L108 : Pick the first model in a chain that is affordable under the daily budget, so a prioritized list falls back from a paid frontier choice to a free or local one when no budget is set. A local or free mo
### apps/control-panel/src/screens/GatesScreen.tsx [F:304fa8ef33]
- S:a2d5fcb920 function GatesScreen `export function GatesScreen({ state }: { state: PanelState })` L12 : The integrity surface: the deterministic CI gates every change must pass, the * protected paths that require explicit owner approval, and the separation-of-duties * contract (distinct maker, checker, 
### .design-sync/previews/LeaseTable.tsx [F:31658eff0b]
- S:6425f5a6c7 function WithLeases `export const WithLeases = () => <LeaseTable leases={leases} onRelease={() => {}} />;` L10
### scripts/lib/lang-adapters/python.mjs [F:3213d03b72]
- S:618d055a7c function clean `function clean(text)` L5 : Dependency-free signature extractor for Python. It captures top-level def and class declarations (async included), their leading triple-quoted docstring, and import edges. Bodies are never included. e
- S:37c1996b57 function signature `function signature(line)` L10
- S:1bafda617f function docBelow `function docBelow(lines, defIndex)` L15 : The docstring is the first triple-quoted string on the line(s) after a def/class.
- S:82727ee8e7 function collectImports `function collectImports(trimmed, lineNo, out)` L35
- S:aaa1eac555 const adapter `export const adapter =` L47
### .design-sync/previews/SafetyStrip.tsx [F:3319e5c923]
- S:a63cef8ef8 function Armed `export const Armed = () => (` L4
- S:e25d17a09c function SafeDefaults `export const SafeDefaults = () => (` L17
### scripts/lib/jsonschema.mjs [F:34cb2b6c48]
- S:f794e6adf4 function typeOf `function typeOf(value)` L6
- S:0768a4cf0f function matchesType `function matchesType(value, type)` L13
- S:52913852e3 function validate `export function validate(schema, value, path = "$", errors = [])` L22
### design-system/src/components/RoleBadge/RoleBadge.tsx [F:35c6d59157]
- S:4b7a72e608 type Role `export type Role =` L4
- S:fdc2a33d21 type RoleBadgeSize `export type RoleBadgeSize = "sm" | "md";` L16
- S:e3f95000e0 interface RoleBadgeProps `export interface RoleBadgeProps` L60
- S:301cb496d5 function RoleBadge `export function RoleBadge({ role, size = "md" }: RoleBadgeProps)` L72 : A labeled chip identifying a governance actor or role, pairing an icon with the * human-readable name. The four core review actors (maker, checker, merge authority, * owner) get distinct accent colors
### scripts/lib/lang-adapters/js-ts.mjs [F:36419aa427]
- S:61ec9209fc function matchSymbol `function matchSymbol(trimmed)` L22
- S:500f4c1cd3 function cleanSignature `function cleanSignature(trimmed)` L30
- S:3602dcc44c function cleanDoc `function cleanDoc(text)` L37
- S:df1472b647 function docAbove `function docAbove(lines, index)` L47
- S:ac015d1f81 function collectImports `function collectImports(trimmed, lineNo)` L67
- S:70c4ff437c const adapter `export const adapter =` L80
- S:65d6e9b42e function dedupeImports `function dedupeImports(imports)` L112
### examples/demo-app/tests/PaymentProcessor.test.js [F:373a946d5c]
- S:442c9dff6c function makeGateway `function makeGateway()` L5
### scripts/agent/route-action.mjs [F:37f4a5c04e]
- S:af1450421c function classifyEndpoint `export function classifyEndpoint(role)` L19 : Classify a role's model endpoint into a coarse reachability descriptor: kind: "local" self-hosted / private-host endpoint (Ollama, llama.cpp) kind: "github" the github-models provider (needs models:re
- S:cbbe6a270b function isPrivateHost `function isPrivateHost(baseUrl)` L33 : A base_url points at a private/self-hosted host when its hostname is localhost, a loopback address, a *.local mDNS name, or an RFC1918 range.
- S:ff45c441d1 function canReach `export function canReach(target, roleEndpoint)` L62 : Decide whether a runner target can reach a role's endpoint. A target declares * its reach with optional fields on its config entry: * reachable_providers: provider names it can call (for example ["loc
- S:55ee648216 function resolveExecutionTarget `export function resolveExecutionTarget(role, cfg)` L91 : Resolve the required execution target (environment id) for a role's model * endpoint. Reads cfg.runners and returns the first target that both declares an * environment and can reach the endpoint, pre
### scripts/report.mjs [F:3b382f95c0]
- S:a9b3acb352 function writeRunLog `function writeRunLog(runsDir, command, payload)` L16
- S:4118076b3e function pad `function pad(s, n) { return String(s).padEnd(n); }` L29
- S:0ba2f17fcf function rpad `function rpad(s, n) { return String(s).padStart(n); }` L30
- S:02e9b6beea function parseMetrics `function parseMetrics()` L32
- S:5962011a99 function summarize `function summarize(events)` L41
- S:b288f69305 function agentproofScore `function agentproofScore()` L76
- S:145bc035b8 function listFilesRecursive `function listFilesRecursive(dir, matches, cap = IMPACT_SCAN_CAP)` L92
- S:5967648d07 function isDocumented `function isDocumented(filePath)` L116 : A source module counts as "documented" if its first non-shebang line is a `//` comment, or the file contains a ` ... ` JSDoc block anywhere. This is a simple heuristic, not a full doc-coverage analysi
- S:98d9caecec function findExportedSymbols `function findExportedSymbols(filePath)` L134 : Advisory, bounded heuristic: an exported symbol is a "dead code suspect" when its declared name never appears again (by plain text match) anywhere else under scripts/ or tests/. This is a name-collisi
- S:cab6ecab70 function computeDeadCodeSuspects `export function computeDeadCodeSuspects(sourceFiles, root, cap = IMPACT_SCAN_CAP)` L144
- S:62f42e9591 function computeImpactSnapshot `export function computeImpactSnapshot(root)` L175 : Computes a deterministic, offline snapshot of repo-impact metrics rooted at `root` (a directory containing scripts/, tests/, docs/). Pure aside from filesystem reads; never writes anything.
- S:882efb23a5 function findPriorImpactSnapshot `export function findPriorImpactSnapshot(runsDir)` L196 : Reads the newest run log under runsDir that carries an `impact` field. Returns null if none exists (first run, no baseline).
- S:d444b209b8 function computeImpactDelta `export function computeImpactDelta(current, prior)` L212 : Pure delta computation: current minus prior for each numeric field. When prior is null/undefined, returns a "first run, no baseline" marker instead of numeric deltas.
- S:bafcfbb33c function formatDelta `function formatDelta(n)` L224
### .design-sync/previews/Checkbox.tsx [F:3b4065b679]
- S:b6eeacb415 function Requirement `export const Requirement = () => (` L4
### scripts/tripwire-check.mjs [F:3b96b6dfed]
- S:35e362f448 function emit `function emit(format, decision, reason)` L79
- S:073124e2d8 function extractFromClaudeToolInput `function extractFromClaudeToolInput(toolName, input, cwd)` L106
- S:40cce153df function extractChange `function extractChange(payload)` L135 : Format-agnostic: driven by which fields the payload actually has, not by --format. A Claude PreToolUse payload always carries tool_name/tool_input; a Cursor beforeShellExecution payload carries `comma
- S:f2e55d9b4a function guessFileFromCommand `function guessFileFromCommand(cmd)` L158
- S:209a48ca7f function parseSedReplacement `function parseSedReplacement(cmd)` L181 : Best-effort parse of a `sed 's/PATTERN/REPLACEMENT/'` (or `#`, `|`, `,`, `@` delimited) substitution. This is the one shell idiom common enough, and structured enough, to reliably recover a real befor
- S:485d7c5e96 function unescapeSed `function unescapeSed(s)` L192
- S:4214f7fa01 function parseRedirectTarget `function parseRedirectTarget(cmd)` L198 : Best-effort parse of a shell redirect target (`> file`, `>> file`), which names the exact file the command is about to write, stronger than any token guess.
- S:2305f3725a function diffForCommand `function diffForCommand(cmd)` L206
- S:d761c7660a function diffForReplace `function diffForReplace(filePath, oldText, newText)` L231
- S:2df1658785 function diffForMultiEdit `function diffForMultiEdit(filePath, edits)` L239
- S:ae3c96ae84 function diffForWrite `function diffForWrite(filePath, content, cwd)` L249
- S:7d253ea6b0 function buildSyntheticDiff `function buildSyntheticDiff(change)` L264
- S:8761033dfb function runGuardRatchet `function runGuardRatchet(diffText)` L283
- S:12c1e0f104 function formatDenyReason `function formatDenyReason(findings)` L321
- S:745c98231d function main `function main()` L338
### apps/control-panel/src/lib/confirm.tsx [F:3c479cac6e]
- S:efea80af4e function ConfirmProvider `export function ConfirmProvider({ children }: { children: ReactNode })` L20 : Provides an imperative confirm() that resolves true when the operator approves. * Every destructive control in the panel awaits this before it fires, satisfying the * control-panel requirement of a co
- S:7989466d34 function useConfirm `export function useConfirm(): ConfirmFn` L59
### examples/demo-app/tests/CartService.test.js [F:3c53926ecd]
- S:b908c74a11 function makeDb `function makeDb()` L5
### .design-sync/previews/DecisionCard.tsx [F:3ce0fd77eb]
- S:225c7a7d84 function Open `export const Open = () => <DecisionCard decision={openDecision} onResolve={() => {}} />;` L21
- S:a2df9a5c24 function Resolved `export const Resolved = () => <DecisionCard decision={resolvedDecision} />;` L23
### .design-sync/previews/Card.tsx [F:3d505706cd]
- S:7c44412e8a function WithHeader `export const WithHeader = () => (` L4
### tests/packet-signing.test.mjs [F:3de9042953]
- S:72d4f657d5 function setup `function setup()` L91
### tests/compliance-evidence.test.mjs [F:3ea503e7c0]
- S:09a834e684 function makeRepo `function makeRepo(spec)` L14
- S:64de4c98b6 function makeRepoOnce `function makeRepoOnce()` L91 : Helper reused by the mapping test.
### scripts/check-self-application.mjs [F:4096620673]
- S:91c42b4f27 function read `function read(rel)` L21
- S:87c8d03eb8 function dirsFromCodeowners `function dirsFromCodeowners()` L110 : 4. The two protected-path surfaces must agree. CODEOWNERS is what GitHub enforces; protected_paths_extra is what the engine reads. If they disagree, a path is protected in name only (the bin/ gap that
### tests/cli-dispatch.test.mjs [F:40e4f39b59]
- S:daac1f172a function cli `function cli(...args)` L12
- S:1c82a73570 function tmp `function tmp()` L19
### design-system/src/components/Card/Card.tsx [F:40eb542a82]
- S:586705c7a0 type CardTone `export type CardTone = "default" | "raised";` L5
- S:1ae77ae47b interface CardProps `export interface CardProps extends HTMLAttributes<HTMLDivElement>` L7
- S:555c013724 function Card `export function Card(` L31 : The standard container surface for the control panel. Renders an optional header * row (eyebrow, title, help hint, and right-aligned actions) above a divider, then the * body. When no title, eyebrow, 
### .design-sync/previews/Drawer.tsx [F:41f5ffe77a]
- S:b6fce3a5a9 function ItemDetail `export const ItemDetail = () => (` L3
### .design-sync/previews/Modal.tsx [F:4387a44284]
- S:afe9763761 function RaiseCap `export const RaiseCap = () => (` L3
### tests/remediate.test.mjs [F:44a5987438]
- S:24f0960624 function runRemediate `function runRemediate(args, { cwd, env = {} })` L29
- S:c8ee4f2e2e function makePollutedRepo `function makePollutedRepo()` L40 : Build a temp git repo whose origin/main is the base commit, then lay down a feature branch with one signature-in-message commit and one forbidden-identity commit.
- S:3e43134e83 function arm `function arm(dir, overrides = {})` L69
### tests/snapshot-incremental.test.mjs [F:4637e1fecb]
- S:48356203e2 function repo `function repo()` L13
### scripts/check-architecture-drift.mjs [F:4749cc43a0]
- S:fd2e16186e function escapeRegExp `function escapeRegExp(s)` L67 : Escape regex metacharacters so an unexpected schema value (e.g. containing "." or "+") cannot produce an invalid pattern or change what the word-boundary match means. schemas/work-item.schema.json is 
### tests/self-application.test.mjs [F:48355ccf4d]
- S:e3c36060ec function makeMinimalRepo `function makeMinimalRepo()` L91 : Build a minimal passing temp repo and return the path. Caller must rmSync(tmp, {recursive:true}).
- S:7c9eb8f22d function runScript `function runScript(tmp)` L109
- S:43cc2b28a1 function withStubRunner `function withStubRunner(tmp, score, extendedScore, totalScore)` L223
### scripts/lib/detect-attribution.mjs [F:4a7eaceb5c]
- S:bb570e99d8 const AI_SIGNATURE_RE `export const AI_SIGNATURE_RE = new RegExp(P, "iu");` L40
- S:ba4cb77f9c function branchHasModelSegment `export function branchHasModelSegment(name)` L51 : True when any path segment of a branch name exactly equals a denylisted token. * This is a strict superset of isModelIdentifierBranch (which checks only the first * segment): it also catches evasions 
- S:4bfc88b9a8 function suggestBranchName `export function suggestBranchName(name)` L65 : Propose a compliant branch name by replacing any denylisted segment with a neutral * placeholder, preserving the rest of the path so the suggestion stays meaningful. * "claude/fix-config" -> "change/f
- S:38e44b5fa7 function detectBranch `export function detectBranch(name)` L79 : Scan a branch name and return a finding if it carries a model identifier.
- S:e0f397f4e1 function detectCommits `export function detectCommits(logOutput, bodies = [])` L103 : Scan commits for forbidden author/committer identity (reusing commit-identity.mjs) * AND for AI signatures inside commit-message bodies. The identity check and the body * check are complementary: the 
- S:099c6ccde0 function detectText `export function detectText(kind, where, text)` L132 : Scan a block of free text (PR body, a comment, a tracked file) for AI signatures. * Returns one finding per matching line so the remedy can point at the exact spot.
- S:6c21b6660b function firstMatch `function firstMatch(text)` L149
- S:af6abeace9 function formatRemedy `export function formatRemedy(findings)` L159 : Render a precomputed, actionable remedy so a blocked violation is never a dead end. * The message names the exact fix and, where applicable, the literal git commands to * apply it, so a reviewer paste
### scripts/lib/snapshot-redact.mjs [F:4b91a9f65b]
- S:3ef15e4c1b function redactText `export function redactText(text, { strict = false } = {})` L13 : Mask every matching secret in `text`. Returns { text, redactions } where each redaction records the pattern name and how many matches it masked.
### tests/helpers/mock-github-server.mjs [F:4dabd020df]
- S:5e08a11ce4 function startMockGitHubServer `export function startMockGitHubServer(options = {})` L19 : Start a mock GitHub API server. * * @param {object} [options] * @param {object} [options.pr] - The PR object returned by the pulls endpoint (title, body). * @param {Array<object>} [options.comments] -
- S:2ea6241ebd function writeJson `function writeJson(res, status, body)` L68
### scripts/lib/policy-manifest.mjs [F:4db1101024]
- S:a76a61b560 const MANIFEST_VERSION `export const MANIFEST_VERSION = 2;` L25 : v2 adds the required `generator` credit block (Phase 4: policy-pack adoption tooling, ADR-037). Because `generator` is required and content-digested, a vendored copy cannot silently drop credit to mod
- S:d4ed2d5fe7 const ATTESTATION_KIND `export const ATTESTATION_KIND = "policy-attestation";` L26
- S:78dd5bd63d function sha256Hex `function sha256Hex(bytes)` L52
- S:fc880b17bd function readOrNull `function readOrNull(root, rel)` L56
- S:262e039096 function extractSection `export function extractSection(markdown, heading)` L68 : Extract a Markdown section body: the heading whose text matches `heading` (case-insensitive) and the lines beneath it, up to the next heading of the same or higher level. Returns null when no such hea
- S:e6c1406727 function fingerprintDisclosureSources `function fingerprintDisclosureSources(root)` L91
- S:41514ae74b function fingerprintPolicyFiles `function fingerprintPolicyFiles(root)` L101
- S:cf9af1e29c function gatesFromVerify `export function gatesFromVerify(pkgJson)` L112 : The disclosed gate set is derived from the actual `verify` npm script so it cannot drift from what the project runs. One level of `npm run <name>` / `npm test` aliases is flattened so gates hidden beh
- S:5f317ed26b function capabilities `function capabilities(config)` L127
- S:44c14f3d19 function generator `function generator(pkgJson)` L135 : The credit block (ADR-037). Populated from package.json, never hardcoded twice, so a rename in package.json is what moves this, not a second literal to keep in sync. The repository URL is stripped of 
- S:f51dd29844 function normalizePaths `function normalizePaths(list)` L145
- S:a92333a9ea function buildPolicyManifestBody `export function buildPolicyManifestBody({ root, config, pkgJson })` L153 : Build the deterministic manifest body (without the content_digest) from repo state.
- S:c4e4845bcc function manifestDigest `export function manifestDigest(body)` L181 : Content digest over the canonical (RFC 8785 JCS) serialization of the body, so a re-serialized or key-reordered file yields the same digest and only a real policy change moves it.
- S:b29d404deb function buildPolicyManifest `export function buildPolicyManifest({ root, config, pkgJson })` L186 : The full manifest: the body plus its self-describing content_digest.
### scripts/lib/learnings.mjs [F:4ebb5aa8a0]
- S:72cb0b7406 const REQUIRED_FIELDS `export const REQUIRED_FIELDS = [` L9
- S:005abb5200 const MAX_STAGED_ENTRIES `export const MAX_STAGED_ENTRIES = 20;` L24 : The Staged section is capped so it stays a short review queue, never a dumping ground. LESSONS.md documents this as "Cap at 20 staged entries... Never auto-evict." Until now nothing enforced it; appen
- S:2064ebd573 const STAGED_LINE_RE `export const STAGED_LINE_RE =` L28 : A staged line, per LESSONS.md's own "Staged format": - [YYYY-MM-DD] (signal: gate|review|incident|rework) lesson - evidence: ref
- S:391a920cca function learningsPath `function learningsPath(root)` L31
- S:6831eb78e0 function readPromotedLearnings `export function readPromotedLearnings(root)` L36 : Extract the first fenced json block that appears after the "## Promoted" heading.
- S:dab0af7046 function readStagedEntries `export function readStagedEntries(root)` L51 : Return the staged bullet lines (the "- [date] ..." entries) between the "## Staged" and "## Promoted" headings. Lines that do not begin a bullet are ignored, so surrounding prose does not count agains
- S:30e8b022de function appendStagedEntry `export function appendStagedEntry(root, line)` L63 : Append one staged candidate line to LESSONS.md, enforcing the format and the cap. Never evicts: a full section throws so a human promotes or prunes first. Idempotent on an exact-duplicate line. Return
### apps/control-panel/src/screens/SettingsScreen.tsx [F:4ebf08705b]
- S:d49b633132 function isValidUrl `function isValidUrl(value: string): boolean` L54
- S:6d2334f815 function SettingsScreen `export function SettingsScreen({ state, write }: { state: PanelState; write: WriteActions })` L112 : The advanced-configuration screen, one conceptual area per tab so nothing forces an * operator to scroll past unrelated subsystems to reach the one they came for. Full * CRUD lives here for the model-
### examples/demo-app/tests/CheckoutService.test.js [F:52caf3b287]
- S:ad302fbf54 function makeCartService `function makeCartService(cart)` L5
- S:8d10c3ed6e function makeOrderService `function makeOrderService()` L13
### .design-sync/previews/ModeSwitcher.tsx [F:545c0ccfeb]
- S:2a04172292 function HostSelected `export const HostSelected = () => <ModeSwitcher mode="host" onModeChange={() => {}} />;` L4
- S:2bd0a26c48 function ProductSelected `export const ProductSelected = () => <ModeSwitcher mode="product" onModeChange={() => {}} />;` L6
### tests/learnings.test.mjs [F:54a3c626d9]
- S:5e3d6fa91f function run `function run(script, args = [], env = {})` L20
- S:2f1892a712 function makeStagedFixture `function makeStagedFixture(stagedLines = [])` L127
### examples/demo-app/src/CheckoutService.js [F:54c6928de9]
- S:5ea90f5e50 class CheckoutService `export class CheckoutService` L3
### apps/control-panel/server/learningsFormat.mjs [F:54df44aadd]
- S:712330cf3e function parseStagedLine `export function parseStagedLine(line)` L6
### tests/migrate-lessons-rename.test.mjs [F:55b3a4e2c0]
- S:041a6b87af function tmp `function tmp()` L14
- S:32c99a4337 function run `function run(...args)` L18
- S:05af4c96a8 function seedLearnings `function seedLearnings(dir)` L25
### tests/check-architecture-drift.test.mjs [F:564b053598]
- S:d8edda2d76 function makeMinimalRepo `function makeMinimalRepo()` L12
- S:7cd6925ad6 function runScript `function runScript(tmp)` L19
### tests/fleet-ledger.test.mjs [F:571aa2f3ae]
- S:634b7012be function makeAtt `function makeAtt(repoUrl, autonomyEnabled, dryRun, caps, digest)` L17 : Build a well-formed policy-attestation object (ADR-036 shape) via a helper, so the fixtures are constructed at runtime rather than pasted as large literals.
### design-system/src/components/SafetyStrip/SafetyStrip.tsx [F:57ca5f1716]
- S:bbdb581d9d interface SafetyStripProps `export interface SafetyStripProps` L5
- S:3f2874e2ce function SafetyStrip `export function SafetyStrip(` L43 : A horizontal, wrapping strip of small labeled cells summarizing the safety-relevant * levers for a project at a glance: whether autonomy and auto-merge are on, dry-run * status, merge and budget caps,
- S:42b8608c58 function Cell `function Cell({ label, help, children }: CellProps)` L92
### tests/run-cycle-openai.test.mjs [F:580d11b514]
- S:0f004d17fa function git `function git(args, cwd)` L24
- S:4b391a8eee function makeGitFixture `function makeGitFixture()` L34 : Create a throwaway git repo with a single committed file, and return the repo dir plus a unified diff (produced by a real `git diff`, so it is guaranteed to be well-formed and to apply cleanly against
- S:fd58589dfa function makePlan `function makePlan(role, roleDescriptor, transcriptSubdir)` L127 : Build a minimal plan shape invokeRoleOpenAI needs: plan[role] (a resolved role descriptor) plus runId/transcriptDir. transcriptDir is deliberately kept under the repo's gitignored runs/ prefix (see .g
- S:b7db5f4d64 function cleanupTranscripts `function cleanupTranscripts()` L138
### design-system/src/components/DecisionCard/DecisionCard.tsx [F:583edef643]
- S:47cde5f81f type DecisionStatus `export type DecisionStatus = "open" | "resolved";` L6 : Lifecycle status of a decision: still open for input, or already resolved.
- S:707883a645 interface DecisionSummary `export interface DecisionSummary` L14 : Plain data shape for a single decision awaiting (or having received) human input. * Components in this package define their own shape rather than importing app-level * types, so this interface is the 
- S:6e1dfe647a interface DecisionCardProps `export interface DecisionCardProps` L29
- S:5c69e2b109 function DecisionCard `export function DecisionCard({ decision, onResolve }: DecisionCardProps)` L45 : A card summarizing a single decision the system is asking a human to make: the * question, an optional recommendation in an info-tinted inset, and its lifecycle * status. Open decisions with a hold-by
### scripts/lib/lang-adapters/generic.mjs [F:594f505f11]
- S:bd63b1e408 function cleanSignature `function cleanSignature(line)` L15
- S:21635cbeda const adapter `export const adapter =` L19
### tests/connect.test.mjs [F:5956278014]
- S:cf88d1486b function run `function run(...args)` L16
- S:06c0c85d92 function tmp `function tmp()` L20
### tests/maker-checker.test.mjs [F:5994385869]
- S:7d89fd8d95 function run `function run(script, args = [], env = {})` L13
### examples/demo-app/src/CartService.js [F:599f5b2f28]
- S:1ef7d0ea53 class CartService `export class CartService` L3
### scripts/lib/attribution-fp-corpus.mjs [F:5a3543606b]
- S:e99608caf1 const SAFE_BRANCH_NAMES `export const SAFE_BRANCH_NAMES = [` L17 : Branch names no layer may flag. These include descriptive names that merely contain a denylisted token as a substring of a longer word.
- S:59dcca7090 const SAFE_IDENTITIES `export const SAFE_IDENTITIES = [` L32 : Commit identities no layer may flag. dependabot is ordinary automation, allowed.
- S:7bfb1bf049 const SAFE_TEXT_SNIPPETS `export const SAFE_TEXT_SNIPPETS = [` L46 : Free-text snippets (PR-body/commit-body shaped) no layer may flag. These exercise the ordinary-English and in-repo-vocabulary collisions that bare-word or substring matching would trip on.
- S:9ef12b47d5 const DOCUMENTED_STRICT_OVERBLOCKS `export const DOCUMENTED_STRICT_OVERBLOCKS = [` L63 : Inputs the STRICT detector intentionally flags today. This is a documented, deliberate over-block, not a false positive: the corpus locks the current behavior so any future change to it is a conscious
### scripts/agent/action-queue.mjs [F:5b113a0914]
- S:bfb04089fa const DEFAULT_QUEUE_DIR `export const DEFAULT_QUEUE_DIR = join(root, ".modonome", "queue");` L18
- S:04f5060b44 const DEFAULT_LEASE_MINUTES `export const DEFAULT_LEASE_MINUTES = 30;` L19
- S:7bc320f853 function assertValid `function assertValid(record)` L25 : Validate a record against the action-queue schema. Throws with the collected errors so a malformed action can never be enqueued.
- S:556ab0a4ef function recordPath `function recordPath(dir, id)` L32
- S:29fd3ef66c function writeAtomic `function writeAtomic(dir, id, record)` L39 : Atomic write: serialize to a temp file in the same directory, then rename over the destination. Rename is atomic on the same filesystem, so a reader never observes a partial record.
- S:2102bdee1c function readRecord `function readRecord(dir, file)` L47
- S:a364864213 function listRecords `function listRecords(dir)` L51
- S:96b040bf38 function enqueue `export function enqueue(action, dir = DEFAULT_QUEUE_DIR)` L74 : Enqueue an action. Fills schema_version, state, and created_at when omitted, * validates the record, and writes it atomically. Returns the stored record. * * @param {object} action - At least id, targ
- S:852d083fcb function listQueued `export function listQueued(dir = DEFAULT_QUEUE_DIR)` L94 : List queued (not claimed/done/failed) actions, oldest first by created_at. * * @param {string} [dir] * @returns {object[]}
- S:ba017108fd function leaseIsLive `function leaseIsLive(record, now)` L101 : A lease is live if the record is claimed and its expiry is strictly in the future.
- S:6b0614bdf6 function claim `export function claim(workerEnv, dir = DEFAULT_QUEUE_DIR, now = new Date(), leaseMinutes = DEFAULT_LEASE_MINUTES)` L124 : Atomically lease the oldest queued action this worker environment can serve. * A record is servable when its target equals the worker env or appears in the * worker env's served set. Sets state to cla
- S:194e854c70 function complete `export function complete(id, result, dir = DEFAULT_QUEUE_DIR, ok = true)` L153 : Mark a claimed action done or failed, attaching an optional result object. * * @param {string} id * @param {object|null} result * @param {string} [dir] * @param {boolean} [ok] - true marks done, false
- S:ed1db0b6bb function reclaimStale `export function reclaimStale(dir = DEFAULT_QUEUE_DIR, now = new Date())` L173 : Revert every claimed record whose lease has expired back to queued, clearing * its owner and expiry. Returns the list of reclaimed records. * * @param {string} [dir] * @param {Date} [now] * @returns {
### apps/control-panel/server/remediationView.mjs [F:5daab9894d]
- S:f36d6a8da6 function buildRemediationView `export function buildRemediationView({ config = {}, envArmed = false, commits = [], identity = { name: "", email: "" } } = {})` L12
### .design-sync/previews/Input.tsx [F:5e207f73c7]
- S:ddfea151e8 function TrustedAuthor `export const TrustedAuthor = () => (` L4
### scripts/scaffold.mjs [F:5e450ff82c]
- S:ea76c925e2 function enableSnapshot `function enableSnapshot(target, here)` L32 : Turn snapshot consumption on during adoption: generate the first snapshot, install a host pre-commit hook, and drop an AGENTS.md pointer when none exists. Skipped with --no-snapshot. Never overwrites 
- S:8c6ccd3e8b function listTemplate `function listTemplate(dir, base = "")` L64
- S:6dcbe228c5 function scaffold `export function scaffold(target, write)` L75
- S:950b7153af function scaffoldTripwires `function scaffoldTripwires(target, here)` L141 : Install the Tripwires editor hook packs into a target repo: the two hook config templates (.claude/settings.json, .cursor/hooks.json) plus the shared kernel and the detector it shells out to, so a hos
- S:1856df868b function writeRunLog `function writeRunLog(runsDir, command, payload)` L163
### tests/config-key-parity.test.mjs [F:5eff4122c0]
- S:d6cf821403 function keysFromDeclaration `function keysFromDeclaration(source, declName)` L23 : Extract the string literals inside a named list/set declaration, regardless of whether it is `new Set([...])` or `[...] as const`.
- S:da40a0864b function assertSameSet `function assertSameSet(a, b, label)` L33
### scripts/arm.mjs [F:5f7910375b]
- S:397210a79e function pass `function pass(msg)` L19
- S:4bd4d449f1 function fail `function fail(msg)` L22
### tests/arming.test.mjs [F:60548316f5]
- S:5d58defc25 function tmpRepo `function tmpRepo(configBody)` L14
- S:580f464240 function runStatus `function runStatus(dir, env)` L23
### scripts/check-repo-hygiene.mjs [F:61296e720c]
- S:0cfad6d2cf function findSafeToDeleteFiles `function findSafeToDeleteFiles(dir)` L28
- S:17985dad90 function execSync `function execSync(cmd, opts)` L235 : Helper
### tests/tripwire.test.mjs [F:61c2a29876]
- S:2441bf3938 function run `function run(format, payload)` L17
- S:581a43b877 function parseJsonLine `function parseJsonLine(stdout)` L26
### design-system/src/components/Modal/Modal.tsx [F:63351e350b]
- S:5a2d3d98ce type ModalSize `export type ModalSize = "sm" | "md";` L6
- S:b5d72ba60f interface ModalProps `export interface ModalProps` L8
- S:5d9d040e28 function Modal `export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps)` L30 : The generic centered dialog: a panel over a scrim, closable by Escape, a scrim * click, or its own close button. Moves focus into the dialog on open. This is the * base primitive that composed dialogs
### design-system/src/components/ConfirmDialog/ConfirmDialog.tsx [F:63c1c23ccb]
- S:1f19b07227 interface ConfirmDialogProps `export interface ConfirmDialogProps` L5
- S:0a9885ca9d function ConfirmDialog `export function ConfirmDialog(` L30 : A confirmation dialog for destructive or high-consequence controls. Every control * that arms the engine, releases a lease, approves a protected path, or prunes a * learning routes through this so an 
### scripts/validate-knowledge-packet.mjs [F:65193a9799]
- S:4abcc2a45b function redactionErrors `export function redactionErrors(packet)` L19
- S:a8a643fda8 function validatePacket `export function validatePacket(packet)` L45
### design-system/src/components/HoverCard/HoverCard.tsx [F:66264a042c]
- S:489fa8bc67 type HoverCardSide `export type HoverCardSide = "top" | "bottom";` L14
- S:551c7477f2 interface HoverCardSource `export interface HoverCardSource` L16
- S:5ed8ee5c0a interface HoverCardProps `export interface HoverCardProps` L23
- S:312c004ac1 function HoverCard `export function HoverCard({ title, body, source, children, side = "bottom" }: HoverCardProps)` L46 : A richer sibling of Tooltip: a small card (heading, body copy, source citation) for * reference content pulled from real documentation, rather than a one-line hint. Unlike * Tooltip, its content accep
### apps/control-panel/src/screens/OverviewScreen.tsx [F:6627655633]
- S:050ec6eff9 function OverviewScreen `export function OverviewScreen(` L26 : Mission control: the "is it safe, is it working" glance. Arming posture, the safety * strip, the live queue, spend to date, gate health, and the most recent activity.
### scripts/lib/secret-patterns.mjs [F:68c4da7fe8]
- S:e95e85f904 const SECRET_PATTERNS `export const SECRET_PATTERNS = [` L5
- S:9c4deaa396 function scanForSecrets `export function scanForSecrets(text)` L16 : Returns an array of { name } objects for every pattern that matches text.
### .design-sync/previews/Icon.tsx [F:6bef3f93ab]
- S:4eb76c8a83 function Set `export const Set = () => (` L9
### .design-sync/previews/Tabs.tsx [F:6c0919b64e]
- S:c16b3b7bbf function Board `export const Board = () => <Tabs tabs={tabs} active="board" onChange={() => {}} />;` L10
### scripts/lib/branch-name.mjs [F:6e0bd62fa3]
- S:7698d9efeb function isModelIdentifierBranch `export function isModelIdentifierBranch(name)` L26 : True when the first path segment of a branch name equals a denylisted token. * Matching is case-insensitive. "feature/ai-adapter" is allowed because the * first segment is "feature"; only a leading "a
- S:99c574f83d function resolveBranchName `export function resolveBranchName(env = process.env)` L37 : Resolve the branch under review from CI environment variables. Prefers the * pull request head ref, then the push ref name. Returns an empty string when * neither is set so callers can fall back to a 
### scripts/dry-run-sweep.mjs [F:6f247eb514]
- S:bb800288d9 function writeRunLog `function writeRunLog(runsDir, command, payload)` L12
- S:002c9f1daa function slug `function slug(text)` L25
- S:3d6f7980b3 function proposeWork `function proposeWork(stack, hotFiles)` L33
- S:e099520832 function proposeControlPanelWork `function proposeControlPanelWork(targetDir)` L66 : Only fires when the swept repo actually has a control panel at apps/control-panel (auditCoverage/auditCoherence report `skipped: true` and this returns nothing otherwise), so this stays safe and inert
- S:24407449b3 function orderProposalsByScore `export function orderProposalsByScore(proposals, hotFiles)` L84 : Order proposals by descending deterministic priority score (highest-value, lowest-risk first). Signals are derived heuristically from each proposal's text and the hot-file churn count for the file it 
- S:7fb0e9b59c function proposalToWorkItem `export function proposalToWorkItem(proposal, opts = {})` L93
- S:ab8d34f24a function sweepTarget `export function sweepTarget(target)` L119 : Run stack/protected-path/instruction/hot-file detection and score the resulting proposals for a target directory. Read-only: writes nothing. Shared by the CLI printer below, `--emit-work-item`, and `q
- S:19ecd8efbf function main `function main(args)` L134
### .design-sync/previews/IdentityChip.tsx [F:7008a20b1c]
- S:5fe0061772 function Maker `export const Maker = () => (` L4
- S:93ab3c1c15 function Checker `export const Checker = () => (` L8
- S:d4fd7f4ad3 function Pair `export const Pair = () => (` L12
### tests/route-action.test.mjs [F:704e42d42b]
- S:ba7fe0b6d3 function routedConfig `function routedConfig()` L10 : A config where each runner declares its environment and reach.
### design-system/src/components/Checkbox/Checkbox.tsx [F:7054844360]
- S:435432f041 interface CheckboxProps `export interface CheckboxProps` L6
- S:0b453b55b9 function Checkbox `export function Checkbox({ checked, onCheckedChange, label, hint, disabled }: CheckboxProps)` L25 : A labeled checkbox for boolean choices in lists and forms, such as opting * into a rule or selecting an item in a batch action. Renders a native * `<input type="checkbox">` visually replaced by a styl
### design-system/src/components/Drawer/Drawer.tsx [F:71f0bfb455]
- S:145586915d interface DrawerProps `export interface DrawerProps` L5
- S:eb4b11fdf2 function Drawer `export function Drawer({ open, onClose, title, width = 480, children }: DrawerProps)` L25 : A right-side sheet that slides in over a scrim, for focused tasks that need more * room than a popover but should not leave the current page's context (inspecting a * work item, editing a policy). Tra
### scripts/preflight-embedding.mjs [F:7232ada2da]
- S:eaba90daa0 function exists `async function exists(p)` L99
- S:7b87285e6c function readTextSafe `async function readTextSafe(p)` L108
- S:934c97a052 function listFilesRecursive `async function listFilesRecursive(dir, { maxDepth = 5 } = {})` L116
- S:7048bb8a3d function parseCiJobNames `function parseCiJobNames(yamlText)` L141 : Minimal, dependency-free scan for top-level YAML job names under `jobs:`.
- S:fc6086da9e function parseFlatYaml `function parseFlatYaml(yamlText)` L176 : Extremely small YAML-ish key:value reader for flat config files. Good enough to inspect schema_version and the boolean arming levers without a YAML dep.
- S:c275cb33da function checkSchemaCollision `export async function checkSchemaCollision(targetDir)` L198 : (a) Schema collision: target has .modonome/ with incompatible config.
- S:8660e770ea function checkCiJobConflict `export async function checkCiJobConflict(targetDir)` L254 : (b) CI job name conflict: target's CI files use Modonome job names.
- S:ee4deb809d function checkScriptShadowing `export async function checkScriptShadowing(targetDir)` L288 : (c) Script shadowing: target has scripts/ that shadow Modonome scripts.
- S:f5a168e2ff function checkEnvPollution `export async function checkEnvPollution(targetDir, env = process.env)` L323 : (d) Env var pollution: MODONOME_* env vars set that override safe defaults. Reads from the current process environment (the shell preparing to embed) AND statically inspects, read-only, the target's `
- S:8a6e48a119 function checkDependencyConflict `export async function checkDependencyConflict(targetDir)` L376 : (e) Dependency conflict: target has deps that conflict with Modonome requirements.
- S:22ac6bb569 function checkPromptInjection `export async function checkPromptInjection(targetDir)` L440 : (f) Prompt injection risk: governance-override patterns in the target. Trusted locations (.modonome/, schemas/, CI dirs) are scanned exhaustively; for the rest of the repo we scan source-bearing files
- S:522a86b0ed function checkNodeVersion `export async function checkNodeVersion(targetDir)` L478 : (g) Node version incompatibility: target requires Node < 18.
- S:03145d5ec3 const CHECKS `export const CHECKS = [` L517
- S:0dd1d1c53a function runPreflight `export async function runPreflight(targetDir)` L527
- S:80ded7ba90 function renderHuman `function renderHuman(report)` L540
- S:1ba042e0cf function main `async function main()` L563
### apps/control-panel/src/screens/LearningsScreen.tsx [F:757a70680a]
- S:4514b4c1f0 function LearningsScreen `export function LearningsScreen({ state, write }: { state: PanelState; write: WriteActions })` L18 : Where the engine's judgment surfaces for a human to check. Open decisions ask an * explicit question before the engine proceeds; the learning queue shows the lessons * the engine has staged from repea
### design-system/src/components/Input/Input.tsx [F:763efdd51c]
- S:e9fcedbe8f interface InputProps `export interface InputProps extends InputHTMLAttributes<HTMLInputElement>` L7
- S:6981533501 function Input `export function Input(` L24 : A labeled single-line text input. Shares the labeled-field frame used by every * form control in the panel: an optional label, an optional hint bubble, and an * optional error message below. Use for f
### design-system/src/components/AuditTimeline/AuditTimeline.tsx [F:76da13a8f7]
- S:b4b12fd408 type AuditEventKind `export type AuditEventKind =` L5 : The kind of event recorded in the audit trail.
- S:ee3edffdff interface AuditEvent `export interface AuditEvent` L25 : Plain data shape for a single audit-trail event. Components in this package define * their own shape rather than importing app-level types, so this interface is the * contract a host app maps its own 
- S:62d1cf1f06 interface AuditTimelineProps `export interface AuditTimelineProps` L36
- S:35ac020356 function AuditTimeline `export function AuditTimeline({ events, limit }: AuditTimelineProps)` L69 : A vertical audit trail with a connecting line down the left edge. Each event shows a * colored node carrying an icon for its kind (so the event type is never carried by * color alone), the relative ti
### tests/dry-run.test.mjs [F:778c33cdc0]
- S:e15045d8a4 function dryRun `function dryRun(dir)` L13
### scripts/build-policy-attestation.mjs [F:780c791407]
- S:f88498de73 const ATTESTATION_DOMAIN `export const ATTESTATION_DOMAIN = "modonome.policy-attestation.v1\n";` L58 : Domain separation binds a signature to this artifact type so it cannot be replayed as a knowledge packet or any other signed structure.
- S:b455c897cf function rel `function rel(p)` L64 : Relative-to-root display path. Safe on any input: a path outside root (e.g. under ADOPT_ROOT when MODONOME_ADOPT_ROOT points elsewhere) is returned unchanged rather than sliced by a bare string-prefix
- S:5b8a5996df function fail `function fail(msg)` L68
- S:87013bd4c3 function loadInputs `export function loadInputs(r = root)` L73
- S:aacff6bc1c function attestationBytes `export function attestationBytes(manifest)` L82 : The exact bytes a signature covers: the domain tag followed by the JCS of the manifest with its signature and content_digest removed (the content_digest is itself derived from that body, so signing th
- S:120830c7dd function maybeSign `function maybeSign(manifest, env)` L89
- S:5aff27256c function schema `function schema()` L107
- S:cf413b97c8 function write `function write(env)` L111
- S:de8e4d5857 function digestMismatch `function digestMismatch(m)` L126 : Recomputes a manifest body's digest and compares it to its own recorded content_digest. Shared by check(), verifyCmd(), and adoptCmd() so this self-consistency test is defined once; each caller still 
- S:53158831f9 function check `function check()` L133
- S:5ef4400e5e function generatorLine `function generatorLine(m)` L155 : The generator credit line, tolerant of a foreign pack that predates manifest_version 2: such a pack is shown honestly as claiming no credit rather than crashing on a missing field. homepage is guarded
- S:2d4876abe2 function readPack `function readPack(path)` L160
- S:ddc69b10ca function readForeignPack `function readForeignPack(path)` L168 : Reads and parses a caller-supplied pack file, failing with the tool's normal clean error instead of an uncaught exception. Every command that accepts a user-supplied path (--show, --verify, --diff, --
- S:e476893b3b function show `function show(path)` L176
- S:acc91dc6fe function verifyCmd `function verifyCmd(path)` L196
- S:b9d44c6996 function diffSet `function diffSet(label, local, foreign)` L216 : Set-valued policy fields (denylist, protected paths, gates): report what the foreign pack adds and what it is missing relative to this repo's live policy.
- S:0be1a2cd09 function diffCapabilities `function diffCapabilities(local, foreign)` L230
- S:90b2cf611f function diffPosture `function diffPosture(local, foreign)` L241
- S:d2a299acb3 function diffCmd `function diffCmd(path)` L252 : Read-only comparison of a foreign pack's disclosed policy against this repo's own live policy. Always succeeds (never a pass/fail gate); a human uses this to decide whether to adopt. The foreign pack'
- S:8735f37dad function adoptCmd `function adoptCmd(path, alias)` L274 : Vendor a foreign policy pack into this repo, refusing on any integrity or credit failure. Order matters: schema validation catches a pack whose generator block was stripped outright (manifest_version 
### .design-sync/previews/Toast.tsx [F:7832db450f]
- S:67852685cf function Info `export const Info = () => <Toast tone="info" title="Dry-run sweep queued" />;` L4
- S:96c461f8cd function Success `export const Success = () => <Toast tone="ok" title="Merged" message="PAY-402 merged by merge authority" />;` L6
- S:21a4872ace function Blocked `export const Blocked = () => <Toast tone="blocked" title="Ratchet rejected" message="Removed a test assertion" />;` L8
### scripts/lib/token-estimate.mjs [F:7944059823]
- S:59617d720e function estimateTokens `export function estimateTokens(text)` L5 : Dependency-free token accounting for snapshot tiers. The estimate is a heuristic (about four characters per token) that needs no tokenizer and no network, which keeps the utility portable. It is used 
- S:a48d9e0b16 function budgetTier `export function budgetTier(items, maxTokens, sizeFn)` L13 : Greedily keep pre-ranked items until the token budget is spent. `sizeFn` returns the token cost of an item. A falsy or non-finite budget keeps everything. Returns { kept, dropped, tokens } so the call
### .design-sync/previews/ErrorState.tsx [F:79467a3153]
- S:3ed1d37c7b function Unreachable `export const Unreachable = () => (` L3
### design-system/src/components/ArmingStateBadge/ArmingStateBadge.tsx [F:7a1f7d680b]
- S:cec6405a03 interface ArmingStateBadgeProps `export interface ArmingStateBadgeProps` L5
- S:3bae21fee6 function ArmingStateBadge `export function ArmingStateBadge({ mode, envArmed, size = "md" }: ArmingStateBadgeProps)` L26 : The single most important status in the panel: which of the three activation-ladder * rungs the engine is on right now. Disabled is gray, dry-run is CI blue, armed is * teal. The mode label always ren
### .design-sync/previews/EmptyState.tsx [F:7a43bf4ce5]
- S:130202d7f0 function Queue `export const Queue = () => (` L3
### scripts/sign-packet.mjs [F:7b3e38c9a6]
- S:8ec4bd5dec function signPacket `export function signPacket(packet, privateKeyObject, { keyAlias, signedAt })` L20 : Pure: attach a signature object to a packet using the given private key.
### design-system/src/lib/cx.ts [F:7c8d518693]
- S:d732af6be5 type ClassValue `export type ClassValue = string | false | null | undefined;` L2 : Join class names, dropping falsy values. A tiny classnames helper.
- S:deea6aabbd function cx `export function cx(...values: ClassValue[]): string` L4
### examples/python-service/app/orders.py [F:7ccad64380]
- S:41443bba10 function total `def total(items)` L1
- S:05fcfe1c5b function apply_discount `def apply_discount(items, discount_percent)` L5 : Apply a percentage discount to a list of items. Args: items: List of dicts with "price" key discount_percent: Discount percentage (0-100) Returns: Total after discount
### apps/control-panel/src/state/fixtures/host.ts [F:7d236c9aa6]
- S:90f1a56d4e const hostState `export const hostState: PanelState =` L180
### design-system/src/components/Select/Select.tsx [F:819f72edf6]
- S:64376e38db interface SelectOption `export interface SelectOption` L6
- S:8af9c33a76 interface SelectProps `export interface SelectProps` L13
- S:0b0e197734 function Select `export function Select(` L35 : A styled native `<select>` with a custom chevron. Keeps the real `<select>` * element for full assistive-tech and keyboard support while matching the dark * surface treatment of the other form control
### design-system/src/components/Slider/Slider.tsx [F:81c495717c]
- S:66cd7b74c6 interface SliderProps `export interface SliderProps` L5
- S:a91334a377 function Slider `export function Slider(` L32 : A styled range input. Keeps the native `<input type="range">` for full * keyboard and assistive-tech support (arrow keys, Home/End, screen reader * value announcements) while the track and thumb pick 
### .design-sync/previews/NumberField.tsx [F:84a5c32a4c]
- S:74e8f23a0b function MergeCap `export const MergeCap = () => (` L4
- S:14b57397ed function Budget `export const Budget = () => (` L14
### scripts/agent/parse-checker-telemetry.mjs [F:851f776227]
- S:88bc43a62b const CHANGE_REQUEST_SIGNALS `export const CHANGE_REQUEST_SIGNALS = [` L20 : Case-insensitive signal phrases that mean the checker withheld approval or asked for changes. Matching any one sets checker_requested_changes = true.
- S:90b86b1f26 function hasChangeRequestSignal `export function hasChangeRequestSignal(transcript)` L50 : True when the transcript contains any documented change-request signal * phrase (case-insensitive). Pure string search: no partial-word surprises * beyond what the phrase itself implies. * * @param {s
- S:328dcdf4cc function countRaisedQuestions `export function countRaisedQuestions(transcript)` L76 : Count distinct raised concerns/questions in the transcript. * * Heuristic (documented, approximate, not semantic): * - Any line ending in "?" counts once. * - Any line starting with "concern:", "quest
- S:cfe87f9141 function parseCheckerTelemetry `export function parseCheckerTelemetry(transcript)` L111 : Derive checker-engagement telemetry from a checker transcript. * * @param {string|undefined|null} transcript - Full checker transcript text. * @returns {{checker_requested_changes: boolean, checker_qu
### design-system/src/lib/format.ts [F:86838d35ac]
- S:6c778494b3 function relativeTime `export function relativeTime(iso: string, now: number = Date.parse("2026-07-01T09:45:00Z")): string` L7 : Format an ISO timestamp as a short relative string, for example "3m ago" or "in 12m".
- S:8641765bb2 function formatDuration `export function formatDuration(ms?: number): string` L34 : Format a duration in milliseconds as a compact string, for example "1.2s" or "9s".
- S:6cb93e992c function formatUsd `export function formatUsd(usd: number): string` L45 : Format a USD amount with two decimals.
### scripts/agent/apply-patch.mjs [F:872221b1da]
- S:88426a3883 function looksLikeDiff `function looksLikeDiff(body)` L12 : A body looks like a unified diff when it has a "diff --git" header, or a paired "--- "/"+++ " file header, or an "@@ " hunk marker.
- S:074c2b3c02 function extractDiff `export function extractDiff(text)` L28 : Pull a unified diff out of a model response. Prefers a fenced ```diff or * ```patch block; falls back to a bare fenced block whose body looks like a * diff; falls back to treating the whole text as a 
- S:fe1a464205 function applyPatch `export function applyPatch(diff, cwd, deps = {})` L60 : Apply a unified diff to a working directory using the git binary. * Validates with `git apply --check` first; git apply is atomic, so a diff * that fails validation or application is never partially a
### scripts/check-drift.mjs [F:87c30bdb4c]
- S:6b5288f35f function coreLevers `function coreLevers()` L16
- S:b4e887ed4f function schemaLevers `function schemaLevers()` L25
- S:e09a554f44 function templateLevers `function templateLevers()` L30
### .design-sync/previews/IconButton.tsx [F:8972d37045]
- S:5d118d4b60 function Row `export const Row = () => (` L3
### apps/control-panel/src/state/fixtures/product.ts [F:89aee72994]
- S:e89c164d25 function titleFromId `function titleFromId(id: string): string` L54
- S:f0db7341e7 const productState `export const productState: PanelState =` L89
### scripts/guard-ratchet.mjs [F:8a10462927]
- S:89e92655dd function normalizeLF `function normalizeLF(s)` L37
- S:a34306cc67 function getDiff `function getDiff()` L41
- S:974654287c function count `function count(lines, re)` L288
- S:fd230402e2 function deconfuse `function deconfuse(line)` L307
- S:457528354e function stripInlineComment `function stripInlineComment(line)` L315
- S:a4c389d72a function isVacuousAssertion `function isVacuousAssertion(line)` L320
- S:17945c542e function countBareAsserts `function countBareAsserts(lines)` L330
- S:4d3ac94b7c function isVacuousPyAssert `function isVacuousPyAssert(line)` L338
- S:0b8ff85c9c function classifyCode `function classifyCode(msg)` L564
- S:2358b05e12 function fileOf `function fileOf(msg)` L578 : Each problem message is "<file>: <detail>". Recover the file path for a location.
- S:edb5058173 function helpUri `function helpUri(code)` L583
- S:eff02f504b function toFindings `function toFindings(list)` L587
- S:42188b3bb9 function emitJson `function emitJson(findings)` L594
- S:1d0f5bc129 function emitSarif `function emitSarif(findings)` L606
### tests/report-impact.test.mjs [F:8a3433b070]
- S:69f3537d3b function tmp `function tmp()` L13
- S:1fe8548dac function fixture `function fixture()` L17
### apps/control-panel/server/modonomeReader.mjs [F:8a3dd6ccff]
- S:33534dd596 function readModonomeState `export function readModonomeState(modonomeDir, { mode })` L17
- S:895b1937bd function readConfig `function readConfig(modonomeDir)` L57
- S:9287ce102a function readWorkItems `function readWorkItems(modonomeDir)` L93
- S:064519e650 function titleFromId `function titleFromId(id)` L109
- S:ac0d90ea9c function toWorkItemVM `function toWorkItemVM(item)` L117
- S:23afcde4ab function impliedGateStatus `function impliedGateStatus(state)` L149 : A gate's status is implied by the state of every work item that declares it, never by a fabricated pass. A repo that has only ever run dry-run sweeps shows every declared gate as "pending", which is t
- S:639160c471 function buildGates `function buildGates(items)` L165
- S:e41c3f2d61 function buildProtectedPaths `function buildProtectedPaths(config, items)` L193
- S:4741feecf9 function buildCost `function buildCost(config, metrics)` L213 : modonome's own agent runner does not yet record a dollar cost per call (see scripts/agent/run-cycle.mjs), so real spend is honestly zero until that lands. Calls are still counted from the real maker_r
- S:77031e48f4 function readLearnings `function readLearnings(modonomeDir)` L251
- S:783d91f2ed function extractSection `function extractSection(text, heading)` L298
- S:b02fc1cd06 function readDecisions `function readDecisions(modonomeDir)` L303
- S:4350272f8a function readRuns `function readRuns(modonomeDir)` L336
- S:d9c2336e09 function readMetrics `function readMetrics(modonomeDir)` L355 : Real telemetry only. metrics.example.jsonl documents the schema and must never be read here: the promoted learning L-001 in this repo's own LESSONS.md exists specifically because sample telemetry was 
- S:409d8caf58 function describeMetric `function describeMetric(m, kind)` L371
- S:b8469e1267 function buildAudit `function buildAudit(runs, metrics)` L390
- S:a8971aba2c function buildTrends `function buildTrends(runs)` L429
- S:b81af2dbe4 function latestAgentProofScore `function latestAgentProofScore(runs)` L441
- S:baab120dbc function gitInfo `function gitInfo(repoRoot)` L447
- S:f40a6dfd1b function gitCommits `function gitCommits(repoRoot)` L468 : The unpublished commit range (origin/main..HEAD) with the identity and message fields the remediation planner reads. Bounded to origin/main so the panel only ever proposes over history that has not be
- S:37268eb979 function gitIdentity `function gitIdentity(repoRoot)` L492 : The repository's own git identity, the target a reauthor rewrite would use. Empty when unset, which the planner and the CLI both treat as "not usable for apply".
- S:4cd48cf92e function buildSubject `function buildSubject({ repoRoot, modonomeDir, mode, config, queue, runs })` L502
### design-system/src/components/Tooltip/Tooltip.tsx [F:8a9aff1529]
- S:77a4165d99 type TooltipSide `export type TooltipSide = "top" | "bottom" | "left" | "right";` L12
- S:0b70780ca5 interface TooltipProps `export interface TooltipProps` L14
- S:7bdca9af48 function Tooltip `export function Tooltip({ content, children, side = "top" }: TooltipProps)` L30 : A small dark hint bubble anchored to a trigger element. Opens on mouse hover and on * keyboard focus of the trigger (never hover-only, so keyboard users see the same * information), and closes on blur
### scripts/sync-site-data.mjs [F:8abf9e432a]
- S:55fc57e799 function readIfExists `function readIfExists(path)` L17 : Read a file, returning null if it does not exist. Reads directly instead of checking existsSync first, so there is no window between the check and the read where the file could be removed out from und
- S:c44c6a3e42 function parseEvidence `function parseEvidence()` L33 : Parse RELEASE-EVIDENCE.md to extract gate counts and autonomy status
- S:208ce5b839 function countWorkItems `function countWorkItems()` L63 : Count work items by state
- S:370b67baf2 function readVersion `function readVersion()` L88 : Parse the product version from package.json. (.modonome/version holds a schema version, not the product version, so it must not be used here.)
- S:4afb276004 function parseAgentproof `function parseAgentproof()` L103 : Parse the normative AgentProof score and level from agentproof/README.md.
- S:172b08e199 function updateRepoData `function updateRepoData(data)` L116 : Update the meta block in site/repo-data.js (version, score, level).
- S:ee17355d71 function updateSite `function updateSite(data)` L131 : Update site/index.html with live data
- S:03b000e190 function verifySiteData `function verifySiteData(data)` L151 : Verify site data matches evidence (used in CI gate)
### design-system/src/components/Button/Button.tsx [F:8b122c449e]
- S:c0c2347579 type ButtonVariant `export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";` L5
- S:05e617fb30 type ButtonSize `export type ButtonSize = "sm" | "md" | "lg";` L6
- S:c928d805b5 interface ButtonProps `export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>` L8
- S:b1bbb81b82 function Button `export function Button(` L30 : The standard action control. Use `primary` for the main action on a screen, * `secondary` for supporting actions, `ghost` for low-emphasis inline actions, and * `danger` for anything that arms, delete
### tests/control-panel-writer-nested.test.mjs [F:8b2f3dbcba]
- S:6c4ca00b53 function scratchModonomeDir `function scratchModonomeDir(sourcePath = realConfigPath)` L30 : Every test operates on a scratch copy of a real config.yaml, never the file itself, so a bug here can never corrupt real state.
- S:a57f8c1bdc function otherLines `function otherLines(originalText, touchedTopKeys)` L39 : Lines present in the original file that are untouched by a given patch: every line outside the blocks the patch's keys live in. Used to assert a patch changes only what it says it changes.
### scripts/agent/providers.mjs [F:8b5a1f94c4]
- S:542af83b15 const BUILTIN_PROVIDERS `export const BUILTIN_PROVIDERS =` L11 : Built-in providers. A config's `providers` map (see resolveProvider) is merged on top, so a host repo can add or override entries without a code change here.
- S:6ee308cae0 function resolveProvider `export function resolveProvider(name, providersOverride)` L39 : Resolve a provider descriptor by name. Built-ins are merged with an optional * config-provided override map (cfg.providers), so a host repo can redefine or * add providers without touching this file. 
- S:bead992b70 function isBillable `export function isBillable(costClass)` L48 : A cost class is billable only when it is "paid". Free and local roles never require remote_model_budget_usd_per_day.
### scripts/check-state-machine-acyclic.mjs [F:8b8d3c46b3]
- S:97a7516354 function buildAdjacency `function buildAdjacency(machine, { includeCapGuard })` L15 : Build the adjacency map { state: [to, ...] } from the transition list. When includeCapGuard is false, cap_guard edges are dropped: those are the sanctioned bounded-retry escapes and must not count as 
- S:a716bbdaa8 function reaches `function reaches(adjacency, start, targets)` L27 : reaches(adjacency, start, targets) -> bool Whether any node in `targets` is reachable from `start` along the edges.
- S:982b9fa62d function stateMachineErrors `export function stateMachineErrors(machine)` L40
### examples/demo-app/src/index.js [F:8bb1b57470]
- S:a1828ef829 function main `async function main()` L59
### design-system/src/components/GatePanel/GatePanel.tsx [F:8c6234a8cb]
- S:796295afbe type GateStatus `export type GateStatus = "pass" | "fail" | "flaky" | "running" | "pending";` L6
- S:0906a625c3 interface GateRow `export interface GateRow` L8
- S:2db1222578 interface GatePanelProps `export interface GatePanelProps` L23
- S:0d46d60d35 function GatePanel `export function GatePanel({ gates, title = "CI gates" }: GatePanelProps)` L63 : A vertical list of CI gate rows, used to visualize the merge-blocking checks and * the anti-gaming ratchet on a work item or pipeline. Each row pairs an icon, a color, * and a text label for its statu
### scripts/agent/openai-client.mjs [F:8d2cb93236]
- S:aecf05317d function buildChatCompletionsUrl `export function buildChatCompletionsUrl(baseUrl)` L21 : Join a base URL with the chat-completions path, tolerating a trailing slash * or a base URL that already ends in "/chat/completions". * * @param {string} baseUrl * @returns {string}
- S:b9ed6b7b01 function buildHeaders `export function buildHeaders(authToken, authScheme = "Bearer")` L37 : Build the request headers, including the Authorization header when a token * is supplied. No Authorization header is sent when authToken is falsy, which * suits local endpoints that need none. * * @pa
- S:403ac351dd function buildRequestBody `export function buildRequestBody(model, messages, maxTokens)` L52 : Build the JSON request body. max_tokens is omitted when maxTokens is * undefined, since some endpoints reject an explicit null/undefined field. * * @param {string} model * @param {Array<object>} messa
- S:37693a15d4 function normalizeResponse `export function normalizeResponse(data)` L66 : Normalize a parsed OpenAI chat-completions response into * { text, finishReason, usage }. Throws a clear error on a malformed body * (missing choices, missing message). * * @param {any} data * @return
- S:fd88bace68 function isRetryableStatus `function isRetryableStatus(status)` L80 : Retry only on 429 (rate limit) and 5xx (server error). Any other non-2xx status is a caller error and must not be retried.
- S:969658a48c function sleep `function sleep(ms)` L84
- S:705c285e25 function chatCompletion `export async function chatCompletion(` L105 : POST a chat-completions request to an OpenAI-compatible endpoint and return * a normalized result. * * @param {object} opts * @param {string} opts.baseUrl - Endpoint base, e.g. "https://api.example.co
### tests/chaos.test.mjs [F:8fe56e5618]
- S:8041c36b7b function noThrow `function noThrow(fn)` L18 : Chaos test helper: any call must either return errors cleanly OR not throw. A crash or hang is a failure.
- S:856f3a5bea function ratchetWithTimeout `function ratchetWithTimeout(content)` L28 : Wrap guard-ratchet call with a hard 5-second timeout.
### scripts/lib/remediate.mjs [F:8ffb11f281]
- S:744cc47208 function cleanCommitMessage `export function cleanCommitMessage(message)` L36 : Remove every line carrying an AI-authorship signature from a commit message, then * drop the trailing blank lines the removal leaves behind. Pure and deterministic. * * Never returns an empty message:
- S:bc4bff4faa function planCommitRewrites `export function planCommitRewrites(commits, identity)` L59 : Decide the metadata-only rewrite for each commit in a range. Input `commits` is the * range oldest-first, each { sha, an, ae, cn, ce, message }. `identity` is the target * { name, email } that replace
- S:792d313360 function remediationFingerprint `export function remediationFingerprint(plan)` L84 : A deterministic fingerprint of a rewrite plan. Same findings and target identity * produce the same plan and therefore the same fingerprint, which is what lets an owner * approve a proposal and later 
### scripts/hygiene.mjs [F:90e1fd2fd9]
- S:fc3bb4bc24 function collectFindings `function collectFindings()` L38 : Collect findings for the current branch, the commits unique to it, and the PR-body-shaped surfaces we can see locally (the commit bodies themselves).
- S:400a8c02c3 function applyFix `function applyFix(branch, findings)` L55
- S:6fab505fa4 function parsePrNumber `function parsePrNumber(rest)` L76 : Parse an optional `--pr <n>` flag. Returns the positive integer PR number, or null when absent. Throws on a malformed value so the caller can report it.
- S:cde4a28e06 function collectPrFindings `async function collectPrFindings(prNumber, client = createGitHubClient())` L91 : Fetch the PR title, body, and conversation comments and scan them with the strict detector. Uses the same AI_SIGNATURE_RE as every other surface, so this is a hard detection gate, not the advisory nea
- S:c546f7913f function main `async function main(argv)` L102
### fixtures/portability/prompt-injection-host/src/main.js [F:90f0999521]
- S:d75c32ea9c function add `export function add(a, b)` L11
- S:d7d594dd8d function multiply `export function multiply(a, b)` L15
### design-system/src/components/MdnRoot/MdnRoot.tsx [F:90fc20ddd8]
- S:7902cd38d0 interface MdnRootProps `export interface MdnRootProps extends HTMLAttributes<HTMLDivElement>` L4
- S:f2642efdc2 function MdnRoot `export function MdnRoot({ children, className, style, ...rest }: MdnRootProps)` L14 : The design-system root. Establishes the dark ground, the body font, and the token * scope that every component inherits. Wrap an app or a screen in this (AppShell already * does). It is also the wrapp
### scripts/check-decisions-authority.mjs [F:92d6903b5f]
- S:3b092e9ab0 function parseDecisions `export function parseDecisions(text)` L62 : Parse DECISIONS.md text into heading violations and Resolved-section entries.
- S:183f710a08 function readCodeownersUsers `function readCodeownersUsers(rootDir)` L122
- S:fe27a88258 function hasEligibleApproval `export function hasEligibleApproval(reviews, prAuthorLogin, codeownersUsers)` L145 : Given a PR's reviews (GitHub API shape: [{ user: { login }, state }]) and its author login, is there at least one APPROVED review from a CODEOWNERS-listed login that is not the author themselves? Self
- S:890ccb5d6b function fetchPRReviews `async function fetchPRReviews(repoSlug, prNumber, token)` L164
- S:9554538925 function readPRContext `function readPRContext()` L190 : Read the current PR's number, author login, and repo slug from GitHub Actions' standard environment (or from MODONOME_PR_* overrides, for tests and manual runs against a specific PR). Returns null whe
- S:eb67f0edae function getFileAt `function getFileAt(ref, rootDir)` L213
- S:e18ceff2c8 function main `async function main()` L224
### tests/ratchet-attestation.test.mjs [F:92dde817ee]
- S:a8fe6446c0 function headSha `function headSha()` L17
### scripts/build-release-evidence.mjs [F:9344d335a6]
- S:342fb4655a function gate `function gate(script, args = [])` L21
- S:cb97c7b3fc function mark `function mark(ok) { return ok ? "pass" : "FAIL"; }` L25
- S:bcddbe684b function listCaptures `function listCaptures()` L60 : Sample-app captures: real maker and checker runs recorded under examples/<app>/runs/. These directories are committed (unlike the gitignored .modonome/runs/), so summarizing them stays reproducible fr
### examples/node-typescript/src/checkout.ts [F:93f0f5d3de]
- S:0bae1275b2 type Card `export type Card = { number: string; expired: boolean };` L1
- S:94383b0aef type RefundResult `export type RefundResult =` L3
- S:16a3c28802 function charge `export function charge(card: Card): "ok" | "declined"` L9
- S:bf5cf69681 function refund `export function refund(card: Card, amount: number): RefundResult` L13
### tests/arm-disarm.test.mjs [F:940d5f4399]
- S:517ace9ff8 function tmp `function tmp()` L17
- S:2fb48a9b04 function run `function run(script, ...args)` L21
- S:f9a8f3309b function scaffold `function scaffold(dir)` L25
- S:e31656bc1d function readConfig `function readConfig(dir)` L33
### scripts/check-edit-set-compliance.mjs [F:9427d264e6]
- S:1b794f5743 function getDiff `function getDiff(baseRef = "origin/main")` L19
- S:d47456131b function getChangedFiles `function getChangedFiles(diff)` L38
- S:2f0240b93f function loadCurrentWorkItem `function loadCurrentWorkItem()` L50
- S:56a4782fc2 function matchesPattern `function matchesPattern(path, patterns)` L75
### design-system/src/components/LeaseTable/LeaseTable.tsx [F:956332d4b5]
- S:636b7af50c interface LeaseRow `export interface LeaseRow` L10 : A single active claim lease on a work item, as shown in the lease table.
- S:46ca0706e7 interface LeaseTableProps `export interface LeaseTableProps` L21
- S:5eba6876fa function LeaseTable `export function LeaseTable({ leases, onRelease }: LeaseTableProps)` L36 : A table of active claim leases: which work item, who holds it, when it expires * (relative and exact), and whether it has gone stale. When `onRelease` is provided, * each row gets a danger "Release" b
### apps/control-panel/src/state/adapter.ts [F:95d4304133]
- S:7b984e047b function finalizeState `export function finalizeState(base: PanelState): PanelState` L18
- S:559455c526 function loadPanelState `export async function loadPanelState(mode: PanelMode, dir?: string): Promise<PanelState>` L25
### .design-sync/previews/RoleBadge.tsx [F:973aaa9d86]
- S:c38d35b211 function Roles `export const Roles = () => (` L4
### scripts/lib/capability-flags.mjs [F:98529ba7ea]
- S:944e1f3b0b const CAPABILITY_FLAGS `export const CAPABILITY_FLAGS = [` L7 : The capability flags that expand the engine's authority and trust boundary (ADR-024). A single source of truth shared by the promotion-readiness gate (scripts/check-promotion-readiness.mjs), which fai
### scripts/lib/near-miss.mjs [F:9a3e8ed7d2]
- S:5a7bfc5a1b const TIER1_TOKENS `export const TIER1_TOKENS = [` L34 : Tier 1: distinctive vendor/product tokens with no ordinary-English or in-repo collision, so separator-normalized SUBSTRING matching on branch names and identities is safe. The existing strict tokens a
- S:f650b22681 const TIER2_TOKENS `export const TIER2_TOKENS = ["assistant", "grok", "cohere"];` L51 : Tier 2: generic or ambiguous words that would explode with false positives under substring or free-text matching ("assistant professor", "once you grok this", "the argument doesn't cohere"). Matched O
- S:0c9de67184 const TEXT_TOKENS `export const TEXT_TOKENS = ["mistral", "deepseek", "qwen"];` L58 : Free text (commit bodies, PR text) is the noisiest surface: this repo legitimately names "claude"/"gpt" in prose, and "grok"/"cohere" are ordinary words there. So free-text scanning is limited to the 
- S:680cec9dbd function clamp `function clamp(s)` L64
- S:25a03d4ee2 function normalizeForMatch `export function normalizeForMatch(s)` L73 : Lowercase and strip separators (`/ - _ .` and whitespace) so "claude-code", * "claude_code", and "Claude Code" all normalize to a form containing "claudecode". * Used for Tier-1 substring matching on 
- S:7b7ddcaa20 function segments `function segments(s)` L79 : Split a branch name or identity into its bare word segments for exact Tier-2 matching: "feature/grok-adapter" -> ["feature", "grok", "adapter"].
- S:89065c6f4b function tier1Hit `function tier1Hit(normalized)` L86
- S:7910b636e8 function tier2Hit `function tier2Hit(segs)` L90
- S:a657233cd5 function matchNearMissBranch `export function matchNearMissBranch(name)` L98 : Near-miss on a branch name. Returns a finding, or null when clean or when the * strict segment check already catches it (so the widener never duplicates strict).
- S:d92119a484 function matchNearMissIdentity `export function matchNearMissIdentity(name, email)` L113 : Near-miss on a commit author/committer identity. Checks the name (Tier 1 substring * and Tier 2 exact word) and the email (Tier 1 substring, catching vendor domains * such as "@mistral.ai"). Returns n
- S:b121dfe1ec function matchNearMissText `export function matchNearMissText(where, text)` L141 : Near-miss on free text, scanned line by line. A line is a candidate only when it * both names a distinctive new-vendor TEXT_TOKEN (as a whole word) AND carries an * attribution cue, and the strict AI_
- S:fa71aef711 function formatStagedLine `export function formatStagedLine(finding, { date, evidence })` L169 : Render one LESSONS.md Staged line from a finding. The line is a PROPOSED denylist * addition for human review, never an applied change. The (signal: review) tag marks * it as a review-surfaced candida
### apps/control-panel/src/screens/WorkQueueScreen.tsx [F:9b3f18856e]
- S:4a7db1c0d0 function emptyDraft `function emptyDraft(defaultRole: string): WorkItemDraft` L44
- S:84220fc054 function WorkQueueScreen `export function WorkQueueScreen({ state, write }: { state: PanelState; write: WriteActions })` L66 : The durable work-item state machine, laid out as a board: queued, claimed, making, * checking, merge ready, done, and escalated. Selecting a card opens a read-only * inspector drawer with the item's i
### tests/hygiene.test.mjs [F:9bb94e1b40]
- S:700d752004 function cli `function cli(...args)` L11
### .design-sync/previews/AuditTimeline.tsx [F:9c9edea0c9]
- S:46d90cc86e function Timeline `export const Timeline = () => <AuditTimeline events={events} />;` L13
### tests/e2e.test.mjs [F:9cbe9238f8]
- S:a1107105c3 function tmp `function tmp()` L26
- S:641774928a function run `function run(script, ...args)` L30
- S:765b4574da function mcpCall `function mcpCall(method, params = {})` L34
### scripts/migrate-config.mjs [F:9d69a6b766]
- S:3fd1032067 const CURRENT_SCHEMA_VERSION `export const CURRENT_SCHEMA_VERSION = 1;` L11
- S:18c9f379c0 const SAFE_DEFAULTS `export const SAFE_DEFAULTS =` L14 : Safe defaults for every lever. Migration fills any missing key from here.
- S:b8cdbe3fd3 function migrate `export function migrate(cfg)` L72
### design-system/src/components/ProgressMeter/ProgressMeter.tsx [F:9deac13db0]
- S:8822b8498d type ProgressMeterTone `export type ProgressMeterTone = "primary" | "info" | "owner" | "danger";` L4
- S:c1667b970b interface ProgressMeterProps `export interface ProgressMeterProps` L6
- S:8dfe0cf637 function ProgressMeter `export function ProgressMeter(` L27 : A horizontal meter for bounded quantities such as budget consumed or checker * coverage. Renders a label row (with a mono value/max readout) above a track, * with a filled bar sized to the current val
- S:95871faa22 function formatNumber `function formatNumber(n: number): string` L75
### design-system/src/components/MetricTile/MetricTile.tsx [F:9f0fb6ed8b]
- S:5f8c0130c3 type MetricTileTone `export type MetricTileTone = "neutral" | "ok" | "info" | "attention" | "blocked";` L6
- S:e15dbc7540 interface MetricTileProps `export interface MetricTileProps` L8
- S:1beab0dc0c function MetricTile `export function MetricTile({ label, value, unit, hint, tone = "neutral", icon, trend, sub }: MetricTileProps)` L32 : A dashboard stat tile: an eyebrow label (with an optional HelpHint), a large value * with unit, and optional icon, trend slot, and sub text. This is the core building * block of the Overview screen's 
### tests/snapshot-cli.test.mjs [F:9f36b3ef29]
- S:ad93bbf998 function run `function run(args, cwd)` L14
- S:107eb40a1d function makeRepo `function makeRepo()` L18
### tests/queue.test.mjs [F:9f6dd5e5a3]
- S:704fff1c43 function tmp `function tmp()` L15
- S:13fdf696a0 function run `function run(...args)` L19
- S:0a6b98d712 function scaffold `function scaffold(dir)` L23
- S:247c34d405 function itemsDir `function itemsDir(dir)` L31
### .design-sync/previews/Toggle.tsx [F:a0068c8817]
- S:e95adce358 function DryRun `export const DryRun = () => (` L4
- S:9598b17b9e function AutoMerge `export const AutoMerge = () => (` L14
### .design-sync/previews/ProgressMeter.tsx [F:a0abaf6a25]
- S:c80f0936ea function Budget `export const Budget = () => (` L4
- S:5115891196 function Coverage `export const Coverage = () => <ProgressMeter value={81} max={100} label="Coverage" unit="%" tone="primary" />;` L8
### scripts/snapshot.mjs [F:a0d489df6d]
- S:996743005b function flagValue `function flagValue(argv, name)` L29
- S:59ba63dbab function readConfig `function readConfig(root)` L34
- S:3c2bad87be function snapshotDir `function snapshotDir(root) { return join(root, ".modonome", "snapshot"); }` L40
- S:5353762af1 function loadCommittedSignature `function loadCommittedSignature(root)` L42
- S:d5719588cb function llmsText `function llmsText(signature)` L48
- S:88bd705d3f function badgeJson `function badgeJson(signature, map)` L62
- S:bc3262b829 function writeArtifact `function writeArtifact(root, built)` L71
- S:3466f40801 function buildOptions `function buildOptions(root, argv, now)` L81
- S:6584162247 function nowIso `function nowIso() { return new Date().toISOString(); }` L95
- S:383c03d511 function incrementalInputs `function incrementalInputs(root, argv)` L100 : Resolve incremental build inputs. --full forces a from-scratch rebuild. Otherwise load the cache and ask git what changed; a missing cache or unusable git yields a full rebuild that produces identical
- S:df5cb6eb12 function recomputeMerkle `function recomputeMerkle(root)` L108 : Recompute file hashes and the Merkle root directly from disk. Used by --verify.
- S:8d131c2429 function isSafeGitRevision `function isSafeGitRevision(value)` L119 : A --since ref is free-form git revision syntax (branch, tag, HEAD~N, a SHA), so it cannot be restricted to a fixed pattern the way a cache-internal SHA can. The one property that must hold is that it 
- S:2a5511d42c function gitDelta `function gitDelta(root, ref)` L123
- S:2ce7a5bbe7 function positional `function positional(argv)` L144
- S:ecd0da924a function maybeRegisterParser `async function maybeRegisterParser(root, argv)` L156 : Register the tree-sitter parser when requested via --parser or config, with a graceful fallback to the heuristic default when tree-sitter is not installed.
- S:68308360b1 function main `async function main(argv)` L164
### fixtures/negative-controls/app-syntax-error.js [F:a1411f1423]
- S:7369c62b84 class OrderServiceBroken `export class OrderServiceBroken` L5
### tests/mcp-compliance.test.mjs [F:a167609a41]
- S:07a58ff928 function rpc `function rpc(requests, expectedIds)` L14 : Send requests to a fresh server process and resolve once every expected id has replied. The child is killed as soon as the responses arrive, which avoids the stdin-close race in batch mode.
### scripts/lib/work-item-staleness.mjs [F:a1baa3f01d]
- S:8e42d127b7 const OPEN_STATES `export const OPEN_STATES = ["queued", "claimed", "making", "checking", "rework"];` L16 : States where a real actor could plausibly still be working the item. An item past this point (merge_ready, merging, done, escalated) is either already closing out or parked for a human, so staleness d
- S:b3a28348ad function hasLiveLease `export function hasLiveLease(item, now = new Date())` L21 : A lease is live when it has a holder and an unexpired expiry, mirroring transition-work-item.mjs's own leaseIsLive so the two files can never disagree about what "actively claimed" means.
- S:25139ebf6c function extractOwnTestFiles `export function extractOwnTestFiles(gates = [])` L34 : Every `tests.test.mjs` (or agentproof.test.mjs) path literally named in an item's gates array, deduplicated. Broad gates like "npm run verify" or "node scripts/check-style.mjs ." name no specific file
- S:87fa79bea3 function implementationPaths `export function implementationPaths(item)` L44 : Every allowed_edit_set entry that is not itself one of the item's own test files: the implementation surface the test files are supposed to prove exists.
- S:3fac1340a4 function staleCandidate `export function staleCandidate(item, now = new Date())` L54 : Decide whether a single open-state item looks stale, without running anything. Returns a reason string when every static precondition holds (has a resolvable test file, every implementation path exist
- S:098af8d3e8 function testFilePasses `export function testFilePasses(testFile, { spawn = spawnSync } = {})` L73 : Run one already-existing test file and report whether it passed. Spawned, not imported, so a crash or hang in the target test cannot take this checker down with it; `node --test` on a single file is f
- S:980a6a0449 function findStaleWorkItems `export function findStaleWorkItems(items, { spawn = spawnSync, now = new Date() } = {})` L81 : Full check across every work item. Returns the list of stale findings; each entry names the item, the state it is stuck in, and the evidence (which test files and implementation paths already exist an
### design-system/src/components/Table/Table.tsx [F:a402d2f9ed]
- S:dc4ac94e5b type TableColumnAlign `export type TableColumnAlign = "left" | "right" | "center";` L4
- S:aabd2d1e55 interface TableColumn `export interface TableColumn<T>` L6
- S:1d4c8df8c0 interface TableProps `export interface TableProps<T>` L19
- S:9f9ed94a62 function Table `export function Table<T>({ columns, rows, getRowKey, onRowClick, empty, dense }: TableProps<T>)` L42 : A generic, semantic data table. Renders a real `<table>` with `<thead>`/`<tbody>` * so screen readers and browser table navigation work as expected. Rows highlight on * hover; when `onRowClick` is set
### agentproof/scenarios/ap-36-adr-number-uniqueness.mjs [F:a6d2bd3021]
- S:cd1b84d7ff function makeMinimalRepo `function makeMinimalRepo()` L34 : A minimal repo that satisfies every check other than the one under test, so a failure can only come from the ADR-number logic being exercised.
- S:336ebe7ff5 function run `function run(tmp)` L52
### scripts/install-hooks.mjs [F:a7ce0f6452]
- S:0ca7d7cb9c function isModonomeRepo `export function isModonomeRepo(targetRoot)` L46 : True when targetRoot is modonome's own repo (not a host that merely depends on it or vendored a copy of these scripts). Checked by package.json name rather than by path, so it holds under a copied or 
- S:2681abe2e5 function installHooks `export function installHooks(targetRoot, { self = false, mode = "snapshot" } = {})` L60 : Install the pre-commit hook into targetRoot. Returns "installed", "kept" (a host hook already existed and was preserved), or "no-git". self=true writes modonome's own dev hook and overwrites; a host i
### design-system/src/components/IconButton/IconButton.tsx [F:a8cfe45d27]
- S:0b4b18fb8a type IconButtonVariant `export type IconButtonVariant = "ghost" | "secondary" | "danger";` L5
- S:49158af5a6 type IconButtonSize `export type IconButtonSize = "sm" | "md";` L6
- S:b4354229d8 interface IconButtonProps `export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>` L8
- S:8c83339acb function IconButton `export function IconButton(` L25 : A square, icon-only button. Always carries an `aria-label` built from the required * `label` prop so the control has an accessible name even though no text is visible. * Use for compact affordances su
### scripts/agent/tool-loop-adapter.mjs [F:aa77f227a6]
- S:170dcaab55 function resolveAdapterCommand `export function resolveAdapterCommand(adapterEntry)` L28 : Resolve the command the external adapter is invoked as. Precedence: an explicit * adapterEntry.command, then adapterEntry.name, then a bare fallback. The value is * a bare command name resolved agains
- S:d7a4f68100 function containedCwd `export function containedCwd(root, target)` L46 : Enforce ADR-009 path containment. The adapter's working directory must resolve * to exactly the target directory (resolve(root, plan.target)); a cwd outside the * target, reached via ".." or an absolu
- S:5b2eae49a8 function sep `function sep()` L56
- S:7ed39c68da function buildAdapterArgs `export function buildAdapterArgs(endpoint, maxTurns, adapterEntry)` L72 : Build the argument vector for the external CLI. Points it at the resolved * endpoint (base URL and model), forwards a bounded max-turns flag, and reads the * prompt from stdin (so no prompt text lands
- S:bd7f311fdb function runToolLoopAdapter `export async function runToolLoopAdapter(` L98 : Run the external agentic CLI for one role. Never throws on a bounded/expected * failure (spawn error, non-zero exit, timeout, cap hit): returns a clean status * object mirroring the single-shot path's
### design-system/src/components/Toast/Toast.tsx [F:ab334f34df]
- S:2cd9cbf595 type ToastTone `export type ToastTone = "ok" | "info" | "attention" | "blocked";` L4
- S:00c956ccf3 interface ToastProps `export interface ToastProps` L6
- S:5eb8ce722f function Toast `export function Toast({ tone = "info", title, message, onDismiss }: ToastProps)` L31 : A single notification card with a tone-colored left accent, an icon, a title and * optional message, and an optional dismiss control. Not a stacking provider: mount * one `Toast` per visible notificat
### scripts/mcp-server.mjs [F:ab5077147a]
- S:55a57d9fd6 function toolRatchet `async function toolRatchet(args)` L168
- S:a4d0ce8fea function toolValidateConfig `async function toolValidateConfig(args)` L215
- S:2d1eeb5346 function toolValidateWorkItem `async function toolValidateWorkItem(args)` L240
- S:6499fa18ee function toolStatus `async function toolStatus(args)` L264
- S:2d2b3ccfa2 function toolCompliance `async function toolCompliance(args)` L318
- S:f613554429 function toolVerifyAttestation `async function toolVerifyAttestation(args)` L327
- S:521fca28ad function toolSnapshot `async function toolSnapshot(args)` L344
- S:16d8c02a8e function send `function send(obj)` L372
- S:2306976428 function errorResponse `function errorResponse(id, code, message)` L376
- S:dd3b976184 function handleRequest `async function handleRequest(req)` L380
### scripts/promote-learning.mjs [F:ac11b5379f]
- S:a6ff0bb6d7 function slugifyId `function slugifyId(lesson)` L26 : Slugify a lesson into a deterministic ID.
- S:928743a069 function buildLearningRecord `export function buildLearningRecord(opts = {})` L37 : Build a learning record from options.
- S:562052e079 function validateLearningRecord `export function validateLearningRecord(record)` L61 : Validate a learning record. Returns an array of error strings. Empty array means valid.
### scripts/check-evidence-secrets.mjs [F:ace169adc4]
- S:e19487a8ae function resolveFiles `function resolveFiles(argPath)` L20 : Resolve the list of files to scan. If a path argument is supplied use it directly; otherwise walk examples/runs/metrics.jsonl via readdirSync.
### scripts/lib/repo-detect.mjs [F:ae46bbab81]
- S:c79db45132 function helpers `function helpers(target)` L11 : Build the small file helpers a detector needs, bound to one target directory.
- S:13fa2b4863 function detectStack `export function detectStack(target = ".")` L20 : Detect the primary stack. Returns { name, pm, gates } exactly as the dry-run sweep expects, plus { entrypoints, commands } for the snapshot signature.
- S:3575202801 function detectProtected `export function detectProtected(target = ".")` L57 : Paths that must never be auto-merged. Same list the dry-run sweep reports.
- S:9e9207d834 function detectInstructions `export function detectInstructions(target = ".")` L67 : Repo instruction files an agent should read first.
- S:7c716c856e function detectHotFiles `export function detectHotFiles(target = ".", { commits = 200, limit = 3 } = {})` L75 : Rank files by how often they changed in recent git history. The dry-run sweep uses the default limit of 3; the snapshot passes a larger limit to score churn across the whole tree. Returns [] when git 
- S:7fe7ee7f43 function dedupe `function dedupe(arr)` L94
### site/index.html [F:aef9cf1e27]
- S:52826c5034 class Component `class Component extends DCLogic` L766
### scripts/agentproof-attestation.mjs [F:af6de66499]
- S:52be3c746f function git `function git(...a)` L32
- S:48102a3f37 function parseFraction `function parseFraction(s)` L37
### scripts/lib/run-gate-capped.mjs [F:b014028f57]
- S:6122b96d0b function runGateCapped `export function runGateCapped(cmdArray, { timeoutMs = 30000, maxBuffer = 67108864 } = {})` L11
### scripts/check-agentproof-registry.mjs [F:b16afebae9]
- S:4fb0095605 function checkRegistry `export function checkRegistry(registry, schema)` L22 : Core check. Takes the parsed registry and schema and returns a list of human-readable problem strings. Pure: no filesystem or network.
- S:837b5a8d1e function runCli `function runCli()` L38 : CLI: read the registry and schema from the repo root and report PASS/FAIL.
### tests/performance.test.mjs [F:b28f13b600]
- S:41ad75ea93 function buildLargeDiff `function buildLargeDiff(lines)` L17 : Build a synthetic 1000-line diff that is clean (no gaming patterns).
### design-system/src/components/ModeSwitcher/ModeSwitcher.tsx [F:b3a2ad52bb]
- S:3e2d44a335 type PanelMode `export type PanelMode = "host" | "product";` L4
- S:0c7a33bcbe interface ModeSwitcherProps `export interface ModeSwitcherProps` L6
- S:5b0828ff4b function ModeSwitcher `export function ModeSwitcher({ mode, onModeChange, hostLabel, productLabel }: ModeSwitcherProps)` L28 : The global context switch. Host mode reads the engine as installed in a customer * repo; product mode reads modonome governing its own repository (self-application). * The same screens serve either su
### design-system/src/components/WorkItemCard/WorkItemCard.tsx [F:b5ae6ee133]
- S:ea113218d1 interface WorkItemSummary `export interface WorkItemSummary` L12 : Plain data shape for a single work item as shown in a compact card. Components in * this package define their own shape rather than importing app-level types, so this * interface is the contract a hos
- S:42d33f191a interface WorkItemCardProps `export interface WorkItemCardProps` L41
- S:c7ef137e46 function WorkItemCard `export function WorkItemCard({ item, onClick }: WorkItemCardProps)` L69 : A compact, clickable summary card for a single work item: title with its id, * current-state pill, risk tier, a protected-path lock indicator, attempt count, and * pull request number. Used in queue b
### tests/dependency.test.mjs [F:b70824b13e]
- S:18da5ae581 function listMjs `function listMjs(dir, recursive = false)` L13 : Read all .mjs files in a directory (non-recursive by default).
- S:df7a91f366 function extractImportSpecifiers `function extractImportSpecifiers(source)` L29 : Extract import specifiers from a file's source text. Only matches actual import statements (not comments or JSDoc).
- S:3702b2fefe function isAllowedImport `function isAllowedImport(specifier)` L47
### examples/demo-app/src/NotificationService.js [F:b9d806ba4d]
- S:fedbb5f441 class NotificationService `export class NotificationService` L4
### tests/provenance.test.mjs [F:ba97282cf5]
- S:eb51a5641a function makePacket `function makePacket(overrides = {})` L7 : Base valid packet factory: returns a fresh object each call.
### tests/tick.test.mjs [F:baf7641a01]
- S:ebb9dad93b function tmp `function tmp()` L12
- S:79a288a97f function runTick `function runTick(stateDir)` L16
- S:77054cfc82 function makeItem `function makeItem(overrides = {})` L23
- S:028a668f8e function writeItem `function writeItem(itemsDir, name, item)` L34
- S:357942abbf function readItem `function readItem(itemsDir, name)` L38
### .design-sync/previews/GatePanel.tsx [F:bb6a874d58]
- S:b01ec1a6ac function Gates `export const Gates = () => <GatePanel gates={gates} />;` L25
### tests/ws-e-negative-controls.test.mjs [F:bbb6476d71]
- S:f5a71d2ca6 function runScript `function runScript(script, args = [], env = {})` L19
### examples/demo-app/src/InventoryService.js [F:bd02b28f17]
- S:c7db2cc29d class InventoryService `export class InventoryService` L3
### design-system/src/components/Sparkline/Sparkline.tsx [F:c0e80ca327]
- S:ac1ae69e0f type SparklineTone `export type SparklineTone = "primary" | "info" | "owner" | "danger";` L3
- S:b27476e527 interface SparklineProps `export interface SparklineProps` L5
- S:655f25fbed function Sparkline `export function Sparkline(` L33 : A minimal inline trend chart: a single line normalized to fit the box, with an * optional soft area fill beneath it. No axes or gridlines, intended to sit inline * next to a metric (cost trend, throug
- S:a272c887e3 function toPoints `function toPoints(data: number[], innerW: number, innerH: number, padding: number): [number, number][]` L82
- S:686192f35d function toLinePath `function toLinePath(points: [number, number][]): string` L97
### scripts/build-prompt.mjs [F:c4395c3023]
- S:27005d8f20 function buildBundle `function buildBundle()` L25
### scripts/check-promotion-readiness.mjs [F:c5938c33fd]
- S:3ad956fb93 function configDefaults `function configDefaults(rel)` L34
- S:1e5dabea9c function hasHeading `function hasHeading(text, section)` L41 : Check that a section appears as a Markdown heading (h1-h6), so a one-line ADR with the section words buried in prose cannot game the gate.
- S:6b1894b02c function findPromotionAdr `function findPromotionAdr(flag)` L45
### scripts/lib/lang-adapters/java.mjs [F:c598a2d684]
- S:03b490fb81 function clean `function clean(text)` L7
- S:ec2e53ab2e function signature `function signature(line)` L12
- S:ebdb053467 function docAbove `function docAbove(lines, index)` L17
- S:df1c5c3628 const adapter `export const adapter =` L33
### .design-sync/previews/CostPanel.tsx [F:c63a71fb57]
- S:95e56b0a9c function Remote `export const Remote = () => <CostPanel cost={remoteCost} />;` L27
- S:e5772fff07 function LocalOnly `export const LocalOnly = () => <CostPanel cost={localOnlyCost} />;` L29
### design-system/src/tokens/tokens.ts [F:c64c042051]
- S:749446c25e const armingModes `export const armingModes = ["disabled", "dry-run", "armed"] as const;` L8
- S:fc7eb05498 type ArmingMode `export type ArmingMode = (typeof armingModes)[number];` L9
- S:5465e6de42 const workStates `export const workStates = [` L11
- S:725b07739e type WorkState `export type WorkState = (typeof workStates)[number];` L22
- S:544b9ce58e const riskTiers `export const riskTiers = [1, 2, 3, 4] as const;` L24
- S:dab833b9a8 type RiskTier `export type RiskTier = (typeof riskTiers)[number];` L25
- S:8289602f81 function modeVar `export function modeVar(mode: ArmingMode): string` L28 : CSS custom-property name for an arming mode color.
- S:583c8b60d3 function stateVar `export function stateVar(state: WorkState): string` L34 : CSS custom-property name for a work-item state color.
- S:89566a4918 function tierVar `export function tierVar(tier: RiskTier): string` L39 : CSS custom-property name for a risk-tier color.
- S:a26ee6eefd const workStateLabels `export const workStateLabels: Record<WorkState, string> =` L44 : Human labels for the work states, in flow order.
- S:644e7adeef const tokens `export const tokens =` L56
### scripts/audit-learnings.mjs [F:c9493b5275]
- S:9299cd9a70 function matches `function matches(l)` L29
### tests/terraform-module-shape.test.mjs [F:ca05b6ba1c]
- S:00f913bfd8 function tf `function tf(name)` L11
### scripts/check-style.mjs [F:ca0833ac73]
- S:3696870ce9 function literalPhraseRe `function literalPhraseRe(phrase)` L20 : Escape a literal phrase for use inside a RegExp, then require a word boundary on each side so "workpacket" (no space) can't false-positive on the banned phrase "packet".
- S:55eb1af9ca function loadLexicon `function loadLexicon()` L28 : docs/LEXICON.md explains the rationale; this loads the terms it documents. A grandfathered term (see lexicon.json) warns instead of failing, so an approved rename can ship before every pre-existing fi
- S:ee9b2c90d1 function walk `function walk(dir, out = [])` L49
### .design-sync/previews/Sparkline.tsx [F:ca13fe2a5b]
- S:aa4de9995b function Trends `export const Trends = () => (` L4
### scripts/lib/work-item-validate.mjs [F:cb3c5f7715]
- S:039c3576c4 function modelFamily `export function modelFamily(model)` L21 : Resolve a model name to its family by longest-matching prefix. Returns null when no prefix matches, so unrecognized models are treated as distinct families (they fall through the family check and are 
- S:b128b3a196 function governanceErrors `export function governanceErrors(item, config = {})` L34 : Governance rules that JSON Schema cannot express (cross-field invariants).
- S:16267c791e function validateWorkItem `export function validateWorkItem(item, config = {})` L92
### scripts/lib/snapshot-walk.mjs [F:cb66095cb4]
- S:7c5c3a31a4 function compilePattern `function compilePattern(pattern)` L41 : Compile one gitignore-style pattern into a tester over a posix relative path. Supported: comments, negation (!), leading / (anchored), trailing / (directory), * (within a segment), ** (across segments
- S:531cf59eb3 function loadIgnore `export function loadIgnore(root)` L86 : Build an ignore predicate for a repo root. The predicate takes a posix relative path and returns true when the path should be excluded. Later patterns win, so a negation can re-include a path a broad 
- S:d4e650f5ae function walkRepo `export function walkRepo(root, { ignore = () => false, maxDepth = 12 } = {})` L110 : Walk a repository into a sorted list of files. Symlinks are skipped to avoid cycles and escapes. Returns [{ relPath, absPath, size }] ordered by relPath.
### tests/install-hooks.test.mjs [F:cba8f1d03b]
- S:e6e23439bf function tempRepo `function tempRepo({ withGit = true, pkgName = "some-host" } = {})` L8
### scripts/check-licenses.mjs [F:cc361bd05a]
- S:25117f5b1d function normalizeLicense `function normalizeLicense(raw)` L22
- S:cb3211f3c2 function checkLicenses `export function checkLicenses(pkg, manifest)` L28 : Core check. Takes the parsed package.json and (optional) adapters manifest and returns a list of human-readable problem strings. Pure: no filesystem or network.
- S:310e2149b2 function runCli `function runCli()` L76 : CLI: read package.json and adapters.json from the repo root and report PASS/FAIL.
### tests/embedding-safety.test.mjs [F:cc65dd1342]
- S:298b204d13 function runPreflight `function runPreflight(fixtureName)` L22 : Run preflight in --json mode against a fixture. Returns { code, report, raw }. A clean environment is used so the host's own MODONOME_* shell does not leak into the env-pollution check.
- S:c73cab5b60 function ids `function ids(report)` L42
- S:2ca7aeeeaf function findingsBySeverity `function findingsBySeverity(report, severity)` L46
### scripts/lib/github-api.mjs [F:cdbe769ed3]
- S:83ad315769 function resolveRepo `export function resolveRepo(env = process.env, originUrl = null)` L25 : Resolve the owner/repo, preferring the GITHUB_REPOSITORY env, then git origin.
- S:4d35869e55 function readOriginUrl `function readOriginUrl()` L37
- S:fc28898c78 function resolveToken `export function resolveToken(env = process.env)` L43 : The credential, from GITHUB_TOKEN or GH_TOKEN. Empty string means unauthenticated.
- S:a4e7d71500 function isRetryableStatus `function isRetryableStatus(status)` L47
- S:95e22729ee function sleep `function sleep(ms)` L51
- S:de0b2dc0df function createGitHubClient `export function createGitHubClient(` L59 : Build a read-only client bound to one repository. All inputs are injectable so * tests drive it against a local mock server with no real network call.
### design-system/src/components/CostPanel/CostPanel.tsx [F:ce1173e176]
- S:66b4da1ed7 type ModelCostClass `export type ModelCostClass = "paid" | "free" | "local";` L6
- S:2e3ac2ba9f interface ModelCostRow `export interface ModelCostRow` L8
- S:61579a6235 interface CostSummary `export interface CostSummary` L21
- S:8cf2204c43 interface CostPanelProps `export interface CostPanelProps` L36
- S:13f1b3c9c0 function CostPanel `export function CostPanel({ cost }: CostPanelProps)` L93 : A summary of model spend and call volume for a period: a budget meter for remote * USD spend, a small stat row of local calls, remote calls, and cache saves (framed * positively as retries avoided), a
### scripts/lib/lang-adapters/tree-sitter.mjs [F:cecdb96382]
- S:ad7d7732a1 function makeExtract `function makeExtract(Parser, grammar)` L24
- S:464c90cba5 function registerTreeSitter `export async function registerTreeSitter(register)` L71 : Attempt to register tree-sitter adapters. `register` is the registry's registerAdapter. Returns true when at least one grammar was registered.
### tests/ratchet-format.test.mjs [F:cede5f9fa2]
- S:7c0d389b98 function runRatchet `function runRatchet(...args)` L17
### tests/control-panel-ownership.test.mjs [F:d0da1cab80]
- S:703e56c471 function scratchRepo `function scratchRepo(codeowners)` L45 : A scratch repo whose git email is faked through the injected `exec`, so the decision is tested without touching this repo's real git config.
- S:fb4a6826d7 function fakeGitEmail `function fakeGitEmail(email)` L54
### scripts/transition-work-item.mjs [F:d135cffeaa]
- S:8d1ca74a54 function leaseHolder `function leaseHolder(item)` L23 : A lease is "live" if it has an owner and an unexpired lease_expires_at. The lease holder is recorded as lease_owner (the field this swap writes) or, for older items, the schema's `owner` field; either
- S:87ca9c146a function leaseIsLive `function leaseIsLive(item, now)` L27
- S:fd822bf451 function tryTransition `export function tryTransition(item, fromState, toState, writerId, now = new Date())` L39 : tryTransition(item, fromState, toState, writerId, now) -> result { ok: true, item } swap succeeded; item is a fresh copy { ok: false, conflict: "<reason>" } swap refused; item is left untouched `now` 
### design-system/src/components/Carousel/Carousel.tsx [F:d20e4b6b91]
- S:fa36ece453 interface CarouselProps `export interface CarouselProps` L5
- S:36acbff697 function Carousel `export function Carousel({ children, label, className }: CarouselProps)` L21 : A horizontally scrolling row with scroll-snap and prev/next nav buttons. Items stay * in normal tab order (each is independently focusable, and the browser scrolls a * focused item into view automatic
### scripts/lib/config-validate.mjs [F:d480e40c97]
- S:ce2faa5c80 function loadConfig `export function loadConfig(path)` L16
- S:75c48595da function primaryRoleModel `function primaryRoleModel(roleCfg)` L33 : Safety rules beyond structural validation. These keep a config from claiming an armed posture without the controls that make arming safe. Note on arming levers: config values such as autonomy_enabled 
- S:dce77ef3c3 function safetyErrors `export function safetyErrors(cfg)` L40
- S:ea1469d710 function validateConfig `export function validateConfig(cfg)` L68
### .design-sync/previews/PermissionDeniedState.tsx [F:d590ca62b9]
- S:655cf75cf0 function OwnerOnly `export const OwnerOnly = () => (` L3
### design-system/src/components/HelpHint/HelpHint.tsx [F:d5b496b125]
- S:733f5fd096 interface HelpHintProps `export interface HelpHintProps` L5
- S:e44c445050 function HelpHint `export function HelpHint({ label, children, size = 13 }: HelpHintProps)` L21 : A tiny circular help affordance: a `help` icon button that reveals its text in a * Tooltip on hover or keyboard focus. This is the pervasive "hover for context" * control placed next to section labels
### scripts/connect.mjs [F:d6401dd73e]
- S:c1c63b1bf8 function planFile `function planFile(editor)` L35
### tests/run-log.test.mjs [F:d7d4e8d2a9]
- S:fe9c17eefa function tmp `function tmp()` L12
- S:37a0d721be function run `function run(script, ...args)` L16
### design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx [F:d8fb8339ce]
- S:4f19353e16 interface ProtectedPathRowProps `export interface ProtectedPathRowProps` L6
- S:e0eb326a77 function ProtectedPathRow `export function ProtectedPathRow(` L26 : A single row describing one protected path's guard state: a lock icon, the path in * mono, and a status readout. When a change is awaiting approval, shows an * attention-toned pill, notes who touched 
### design-system/src/components/TierBadge/TierBadge.tsx [F:da42f69531]
- S:1274d7cf4b type Tier `export type Tier = 1 | 2 | 3 | 4;` L3
- S:fea88d42b6 interface TierBadgeProps `export interface TierBadgeProps` L5
- S:f3d272846b function TierBadge `export function TierBadge({ tier, showLabel = true }: TierBadgeProps)` L24 : A small pill identifying a risk tier (1-4) by its dedicated tier color, with a * title tooltip summarizing what the tier permits. Used on work items, policies, and * anywhere a change's review require
### design-system/src/components/NumberField/NumberField.tsx [F:db651caf76]
- S:4eb7e87341 interface NumberFieldProps `export interface NumberFieldProps` L5
- S:50b0879e24 function clamp `function clamp(n: number, min?: number, max?: number): number` L28
- S:cfdd1d8a7f function NumberField `export function NumberField(` L40 : A numeric field with decrement and increment stepper buttons and an optional * unit suffix. Used for caps and budget editors such as max open PRs, max diff * lines, lease minutes, and the remote model
### scripts/lib/snapshot-core.mjs [F:dbb9c92ca1]
- S:8d30c800e7 const SNAPSHOT_SCHEMA_VERSION `export const SNAPSHOT_SCHEMA_VERSION = 1;` L20
- S:154918aa5a function isBinary `function isBinary(buffer)` L32 : Detect binary content by scanning a prefix for a null byte.
- S:3734794a77 function extOf `function extOf(relPath)` L38
- S:cbe5a2e179 function firstCommentLine `function firstCommentLine(source)` L44
- S:05fa5077ed function rawPurpose `function rawPurpose(relPath, symbols, source)` L57 : Derive a module purpose from its symbols and source. Returns the raw (unredacted) string so it can be cached; redaction is applied at map assembly time.
- S:e9e4290005 function buildSnapshot `export function buildSnapshot(root, opts = {})` L67 : Build the full snapshot for a repository root.
- S:45b2f146f0 function buildEdgeList `function buildEdgeList(adjacency, pathIdByPath)` L274 : Resolve adjacency into a sorted edge list of dictionary path ids.
- S:dbf47f93d3 function renderMarkdown `function renderMarkdown({ generatedFor, merkleRoot, files, totalBytes, map })` L288
- S:890a9e6691 function readGovernance `function readGovernance(root)` L339 : Read a light governance posture from the target config and environment. It never arms anything; it only reports posture so a snapshot can double as a status probe.
### .design-sync/previews/Tooltip.tsx [F:dca643f34b]
- S:73feb65706 function OnLabel `export const OnLabel = () => (` L4
### .design-sync/previews/QueueBoard.tsx [F:dd1be2cd7b]
- S:bd8806c490 function Board `export const Board = () => <QueueBoard items={items} />;` L13
### tests/promoted-learnings.test.mjs [F:ddd82fc886]
- S:e0832e1baa function withRoot `function withRoot(learningsBody)` L8
### scripts/agent/run-cycle.mjs [F:ddeb486c49]
- S:1d6822da4e function resolveRoleSequence `export function resolveRoleSequence(cfg)` L48 : Derive the ordered list of roles the cycle executes. An explicit cfg.role_sequence (a non-empty array of role names) is honored so a crew role added in config runs with no code change; otherwise it de
- S:4b76f865fa function resolveExecMode `export function resolveExecMode(cfg, model)` L58 : Resolve a role's execution mode from its model's config entry. The default is "patch" (the WI-029 single-shot-diff path) whenever exec_mode is absent, so existing configs behave exactly as before. Onl
- S:41689151ff function parseArgs `export function parseArgs(argv)` L63
- S:15286656f4 function localEnv `function localEnv(opts, env)` L84 : The execution environment this process is running in. Routing compares each role's required target against this to decide inline vs enqueue. Precedence: an explicit --worker-env flag, then MODONOME_WO
- S:959be959f7 function planCycle `export function planCycle(opts, cfg, runId)` L91 : Resolve and validate a full cycle plan without calling any model. Pure: it reads the passed config and runId and throws on any policy violation. This is the testable core of the harness; the execute p
- S:a75126f856 function buildRunnerEnv `export function buildRunnerEnv(baseEnv, role)` L177 : Build the child-process environment for a role invocation. When the resolved model carries a base_url (a local, self-hosted, or gateway endpoint), route the CLI there by setting ANTHROPIC_BASE_URL, wh
- S:9b986c2d8a function buildRolePrompt `function buildRolePrompt(plan, role, env)` L187 : Render the role prompt with the same variables regardless of transport: identity/model placeholders, the run branch, and promoted learnings.
- S:9f59110fda function writeTranscriptAndMetric `function writeTranscriptAndMetric(plan, role, r, transcriptText, extra = {})` L207 : Write the transcript log and append the schema-conformant metric shared by every transport. `extra` merges additional fields into the metric record (for example whether an openai-http patch applied).
- S:fe41df17f9 function invokeRoleClaudeCli `function invokeRoleClaudeCli(plan, role, env)` L235
- S:c028c053e3 function invokeRoleOpenAI `export async function invokeRoleOpenAI(plan, role, env, deps = {})` L257 : Provider-native single-shot execution: render the same prompt, call an OpenAI-compatible chat-completions endpoint once, and turn the response into file changes deterministically by extracting a unifi
- S:8f6d716f36 function loadAdapterEntry `function loadAdapterEntry(deps = {})` L291 : Load the single agentic-CLI adapter entry from adapters.json for the tool-loop path. Returns the first declared adapter, or null when the manifest is empty or absent (which makes tool-loop degrade to 
- S:83b3a2ab69 function invokeRoleToolLoop `export async function invokeRoleToolLoop(plan, role, env, deps = {})` L311 : Agentic tool-loop execution: spawn the declared external coding CLI (adapt-first, ADR-032) pointed at the resolved OpenAI-compatible endpoint. Containment, the turn cap, and the wall-clock timeout are
- S:f8004b7b76 function invokeRole `function invokeRole(plan, role, env, deps)` L343
- S:4f43d4e206 function runCycle `export function runCycle(opts, { execute, cfg, runId, env = process.env, queueDir, deps })` L357 : Execute a plan. Refuses a hosted run when the budget is zero. Runs the maker, then the checker, each as a distinct CLI invocation with its own model and identity. `deps` (chatCompletionImpl/applyPatch
- S:d33c2c4d3e function runRoles `function runRoles(plan, roles, env, deps)` L402 : Invoke each role in turn and produce the "executed" result. A role's transport decides whether invokeRole returns a status number synchronously (anthropic-cli) or a Promise (openai-http, which awaits 
- S:f71a25079c function main `async function main()` L417
### tests/scaffold-adoption.test.mjs [F:de5ebbf586]
- S:fe07a3bcbc function gitRepo `function gitRepo()` L13
- S:8579f519b1 function scaffold `function scaffold(dir, extra = [])` L25
### design-system/src/components/Icon/Icon.tsx [F:deab644e60]
- S:60070857ec type IconName `export type IconName =` L9 : The curated Modonome icon set. Every glyph is a stroke path on a 24x24 grid and * inherits `currentColor`, so an icon takes the color of whatever text or control it * sits in. Icons are decorative by 
- S:a0f5484b98 interface IconProps `export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name">` L77
- S:abe6a83201 function Icon `export function Icon({ name, size = 16, title, strokeWidth = 1.8, ...rest }: IconProps)` L88
### tests/check-gate-dag.test.mjs [F:df4b55ecef]
- S:f2f7e716af function makeBoundaryFixture `function makeBoundaryFixture(daImports)` L50 : Build a temp repo whose detect-attribution.mjs imports whatever `daImports` says.
### tests/control-panel-work-item-writer.test.mjs [F:e00aec45ce]
- S:8a9e6199b3 function scratchModonomeDir `function scratchModonomeDir()` L10 : A minimal scratch .modonome dir: a config.yaml (read for governance validation, e.g. require_distinct_maker_checker_model) and an empty work-items/ directory.
- S:211cdf5f9d function readItem `function readItem(dir, id)` L17
### scripts/score-proposals.mjs [F:e11f907cba]
- S:73e4b1bbf9 const SIGNAL_MIN `export const SIGNAL_MIN = 0;` L31
- S:ad1b93bd0c const SIGNAL_MAX `export const SIGNAL_MAX = 5;` L32
- S:d4349c402c const NEUTRAL_SIGNAL `export const NEUTRAL_SIGNAL = 2.5;` L33
- S:81bb2e8cc4 function clamp `function clamp(n)` L39
- S:fb06279d5d function normalizeSignals `export function normalizeSignals(signals = {})` L48 : Fill in missing signal fields with the documented neutral value and clamp every field to the [SIGNAL_MIN, SIGNAL_MAX] scale.
- S:574c990b3f function scoreProposal `export function scoreProposal(signals = {})` L59 : Pure scoring function. Higher score means higher priority: more value and safety for less effort, risk, and uncertainty.
- S:c53d33aa2a function scoreProposals `export function scoreProposals(proposalsWithSignals = [])` L71 : Sort proposals by descending score. Each entry may be a plain signals object or carry signals under an explicit `signals` key alongside other fields (for example `id` or `proposal` text), which are pr
- S:3cceb8dc09 function deriveSignals `export function deriveSignals(proposalText, context = {})` L96 : Heuristic, deterministic signal derivation from a proposal string and a simple context object. This is a convenience default, not a source of truth: callers with better signals should pass them direct
### .design-sync/previews/HelpHint.tsx [F:e19aab09cb]
- S:ba347c9b77 function Beside `export const Beside = () => (` L4
### tests/role-registry.test.mjs [F:e2f1b5ac07]
- S:e1813dcc71 function baseCfg `function baseCfg(extra = {})` L25 : A single-environment config with no runner reachability declared, so routing stays inline for every role (matching the shipped default posture). Crew roles are added by extending `roles`, `models`, an
### tests/check-style-lexicon.test.mjs [F:e359adb110]
- S:170d5cf4ef function tmp `function tmp()` L18
- S:85083e2f79 function run `function run(dir)` L22
### apps/control-panel/src/screens/ArmingScreen.tsx [F:e40ce1af48]
- S:870a14c796 function ArmingScreen `export function ArmingScreen({ state, write }: { state: PanelState; write: WriteActions })` L35 : The control screen. Three tabs keep one conceptual area on screen at a time: the * activation ladder (the primary daily view), caps and budget, and the separation-of- * duties governance rules. The la
### scripts/lib/commit-identity.mjs [F:e4ff19bbe2]
- S:d7029fdff9 function isForbiddenIdentity `export function isForbiddenIdentity(name, email)` L26 : True when a name or email belongs to a denylisted agent or vendor identity. * Real automation such as dependabot is allowed; only coding-agent and model * vendor identities are rejected.
- S:5c7ed4ab16 function findForbiddenCommits `export function findForbiddenCommits(logOutput)` L42 : Parse `git log` output where each commit is one line of * "authorName<TAB>authorEmail<TAB>committerName<TAB>committerEmail<TAB>shortSha". * Returns the commits whose author or committer is a forbidden
### tests/promote-learning.test.mjs [F:e540f7b669]
- S:f040dfb6c9 function run `function run(script, args = [])` L15
### .design-sync/previews/MetricTile.tsx [F:e5e519f441]
- S:ce5e964e25 function ArmingMode `export const ArmingMode = () => (` L4
- S:8c65a8b2a2 function ActiveWork `export const ActiveWork = () => (` L15
- S:dd37641bec function Spend `export const Spend = () => (` L27
### scripts/check-regex-safety.mjs [F:e7380d1444]
- S:17c9a6d377 function stripCharClasses `function stripCharClasses(src)` L43 : Remove character classes [...] so a literal + or * inside a class ("[a+]") is not read as a quantifier. Escaped chars are skipped.
- S:be897872b9 function bodyHasUnbounded `function bodyHasUnbounded(body)` L62 : True when a group body contains a top-level unbounded quantifier.
- S:ca3e7d6f59 function redosFindings `export function redosFindings(source)` L70 : Detect nested quantifiers: a group (...) that is itself quantified by an unbounded quantifier (+, *, or {n,}) AND whose body contains an unbounded quantifier. This is the catastrophic-backtracking cla
- S:c52b041088 function exportedRegexSources `async function exportedRegexSources(absFile)` L100 : 1. Runtime: exported RegExp sources (including RegExps inside an exported array).
- S:dcc6653dc4 function staticPatternSources `function staticPatternSources(src)` L112 : 2/3. Static: new RegExp("..."|`...`) string args (no interpolation) and /.../ literals.
- S:979cd75d0e function regexSafetyProblems `export async function regexSafetyProblems(rootDir = root)` L142 : Collect every regex-safety problem across the target files. Exported (not run at import time) so the gate can be exercised without triggering process.exit.
### scripts/check-attribution-fp-corpus.mjs [F:e8676a18b7]
- S:42d4f014b5 function corpusProblems `export function corpusProblems({ strictBranch, fuzzyBranch, strictId, fuzzyId, strictText, fuzzyText })` L34 : Run the corpus through the two layers. The detector predicates are injected so the * gate's own logic is testable with a deliberately over-broad matcher (proving it * would catch a bad promotion). Eac
- S:59f6d857da const LIVE_DETECTORS `export const LIVE_DETECTORS =` L68 : The real detectors, wired to the injectable checker.
### scripts/ratchet-attestation.mjs [F:e9479e1a3b]
- S:ed0a2f8660 function git `function git(...a)` L28
### tests/helpers/mock-openai-server.mjs [F:eb14a0bdeb]
- S:135fde5dfb function startMockServer `export function startMockServer(options = {})` L23 : Start a mock OpenAI chat-completions server. * * @param {object} [options] * @param {"success"|"retry-then-success"|"delay"|"malformed"|"error"} [options.mode] * - "success": always returns a normal c
- S:b65916676a function successBody `function successBody(overrides)` L98
- S:ac31df31c0 function writeJson `function writeJson(res, status, body)` L113
### apps/control-panel/src/state/liveClient.ts [F:ec52ca3820]
- S:38948fee1c class LiveApiError `export class LiveApiError extends Error {}` L10
- S:819d9d37ff function call `async function call<T>(path: string, init?: RequestInit): Promise<T>` L12
- S:cab56da046 function fetchLiveState `export function fetchLiveState(mode: PanelMode, dir?: string): Promise<PanelState>` L26
- S:18fce60dc6 function saveConfig `export function saveConfig(` L32
- S:4124b7df92 function releaseLeaseLive `export function releaseLeaseLive(mode: PanelMode, itemId: string, dir?: string): Promise<PanelState>` L44
- S:a4b6be1d49 function pruneLearningLive `export function pruneLearningLive(mode: PanelMode, lesson: string, dir?: string): Promise<PanelState>` L52
- S:92bb85bdff interface ConnectionTestResult `export interface ConnectionTestResult` L60
- S:cb81b7e05c function testConnectionLive `export function testConnectionLive(baseUrl: string): Promise<ConnectionTestResult>` L67 : Read-only reachability probe for an OpenAI-compatible base URL (LM Studio, Ollama, a gateway).
- S:69ef79b6f3 function createWorkItemLive `export function createWorkItemLive(mode: PanelMode, item: NewWorkItemInput, dir?: string): Promise<PanelState>` L71
- S:7a68bb8c0c function updateWorkItemLive `export function updateWorkItemLive(mode: PanelMode, itemId: string, patch: WorkItemPatch, dir?: string): Promise<PanelState>` L91
- S:f9a749a2b1 function deleteWorkItemLive `export function deleteWorkItemLive(mode: PanelMode, itemId: string, dir?: string): Promise<PanelState>` L111
### tests/tool-loop-adapter.test.mjs [F:ed9c47feb2]
- S:b1e3e516c3 function makeFakeSpawn `function makeFakeSpawn(script = {})` L27 : A scriptable fake child process. Captures the constructor call, emits the configured stdout/stderr, then closes (or hangs, when never told to close).
### scripts/run-gate-pipeline.mjs [F:edb11415f0]
- S:dd1940719c function parseArgs `function parseArgs(argv)` L44 : parseArgs(argv) -> { diff, "work-item" } map of fixture paths by gate arg name.
- S:e6654c6139 function gateOrder `export function gateOrder(graph)` L57 : gateOrder(graph) -> [...] the gates in dependency-first topological order. topoSort orders a gate ahead of the gates it points to, so reverse to put each gate's dependencies before the gate itself.
- S:6e6111c7dd function runPipeline `export function runPipeline(order, fixtures)` L68 : runPipeline(order, fixtures) -> [...] failures in topological order. Each failure is { gate, reason }. A missing fixture for a gate is itself a failure: the gate cannot be evaluated, so the pipeline m
### scripts/release.mjs [F:edf42fb1af]
- S:66bb927095 function run `function run(cmd, opts = {})` L9
### tests/providers.test.mjs [F:ee02e563c6]
- S:c1e6062cfc function baseCfg `function baseCfg(overrides = {})` L109
### .design-sync/previews/LoadingState.tsx [F:eecc78e7e8]
- S:5bad105043 function Reading `export const Reading = () => <LoadingState label="Reading durable state" />;` L3
### .design-sync/previews/WorkItemDrawer.tsx [F:f0fbd8716f]
- S:524aeb5cd6 function Detail `export const Detail = () => <WorkItemDrawer item={item} open onClose={() => {}} />;` L23
### tests/ratchet.test.mjs [F:f238d164c9]
- S:2e93f745f3 function ratchet `function ratchet(diffPath)` L17
### scripts/lib/graph.mjs [F:f51cba9beb]
- S:3c3cd672a7 function isCyclic `export function isCyclic(adjacency)` L11 : isCyclic(adjacency) -> { cyclic: bool, cycle: [...] } Detects whether the graph contains a cycle. When a cycle is found, `cycle` holds the nodes involved in the order they were detected via DFS (the f
- S:075e86ea7c function topoSort `export function topoSort(adjacency, nodes)` L48 : topoSort(adjacency, nodes) -> { order: [...], error?: string } Returns a topological ordering of `nodes` given the directed edges in `adjacency`. Nodes not present in `nodes` but reachable via edges a
- S:cb1a5f81e0 function reachableFrom `export function reachableFrom(adjacency, start)` L78 : reachableFrom(adjacency, start) -> Set of nodes reachable from `start` by following directed edges (breadth-first). `start` itself is not included unless the graph has a path back to it. Used by the d
- S:9ec4198171 function collectNodes `function collectNodes(adjacency)` L93 : Collect every node mentioned either as a key or as a neighbour value.
### .design-sync/previews/Button.tsx [F:f6e100ab45]
- S:f988f356bd function Variants `export const Variants = () => (` L4
- S:edacefac29 function Sizes `export const Sizes = () => (` L19
### examples/demo-app/tests/InventoryService.test.js [F:f8168b956f]
- S:af1e7a50ba function makeDb `function makeDb()` L5
### apps/control-panel/src/content/concepts.ts [F:f83d1100e9]
- S:cb8cdfa49f interface ConceptEntry `export interface ConceptEntry` L15
- S:83deb081d9 const CONCEPTS `export const CONCEPTS: ConceptEntry[] = [` L25
### design-system/src/components/QueueBoard/QueueBoard.tsx [F:f8609bae0b]
- S:a3bf9f1833 interface QueueBoardProps `export interface QueueBoardProps` L4
- S:16975f80af function QueueBoard `export function QueueBoard({ items, onSelect }: QueueBoardProps)` L18 : The work queue as a board. Items are grouped into the columns of the durable state * machine (queued, claimed, making, checking, merge ready, done, escalated), with * rework folded into making and mer
### bin/modonome.mjs [F:f90930c3c3]
- S:5835c8b608 function resolveArming `export function resolveArming(targetDir, env = process.env)` L64 : The authoritative arming gate. A config file the agent can write can never arm the engine on its own: arming requires the MODONOME_ARMED=true environment variable, which lives in CI or operator scope,
- S:53b9eda0f8 function run `function run(script, args)` L85
- S:214691c25d function targetDirFrom `function targetDirFrom(rest)` L95
- S:9249714b12 function main `function main(argv)` L99
### tests/decisions-authority.test.mjs [F:f921eecad7]
- S:b1b5323930 function runGate `function runGate(dir, args = [])` L77
- S:0b25fbc8fe function plainDecisionsDir `function plainDecisionsDir(content)` L81
- S:1ebb8bc1af function git `function git(args, cwd)` L122
- S:6ee06ecd24 function repoWithNewEntry `function repoWithNewEntry()` L130 : A repo with one commit (base: entry "a" only) and a second commit that adds a new Resolved entry "b" on top. Returns { dir, baseSha }.
- S:1b85e41391 function startMockReviewServer `function startMockReviewServer(reviews)` L154 : The mock server has to run as its own OS process: the CLI-under-test is driven via spawnSync, which blocks this test's event loop for the duration of the child. An in-process HTTP server can't accept 
- S:45061132f3 function runGateWithPRContext `function runGateWithPRContext(dir, baseSha, { apiBase, reviews, prAuthor = "some-agent" })` L170
### design-system/src/components/IdentityChip/IdentityChip.tsx [F:f942e88a8f]
- S:9b166b011e type IdentityChipRole `export type IdentityChipRole = "maker" | "checker";` L3
- S:01b4ff4d73 type IdentityChipSize `export type IdentityChipSize = "sm" | "md";` L4
- S:a06feb4e68 interface IdentityChipProps `export interface IdentityChipProps` L6
- S:6797390adc function initialsFor `function initialsFor(name: string): string` L18
- S:aaca852d2b function IdentityChip `export function IdentityChip({ name, model, role, size = "md" }: IdentityChipProps)` L31 : A compact identity marker: an initials avatar plus a name, with an optional model * string in muted mono beneath. When `role` is set the avatar ring is tinted (info for * maker, primary for checker) s
### .design-sync/previews/WorkItemCard.tsx [F:f9c98a8642]
- S:e173063c31 function Queued `export const Queued = () => (` L4
- S:c7ebadadb9 function Checking `export const Checking = () => (` L19
- S:dff1725e3b function Escalated `export const Escalated = () => (` L37
### scripts/assert-governed-change.mjs [F:fa49930755]
- S:13a8db3ab6 function gitDiff `function gitDiff(...args)` L5
### tests/metrics.test.mjs [F:fadcf390da]
- S:c176253e9c function tmp `function tmp()` L12
- S:8bff005013 function runReport `function runReport(targetDir)` L16
- S:5919844321 function makeEvent `function makeEvent(event, extra = {})` L24 : Schema-conformant event line using "event" field (not "type").
### scripts/check-gate-dag.mjs [F:fc21812307]
- S:54a007aa57 function relativeImportsOf `function relativeImportsOf(absFile)` L47 : Extract the relative import specifiers from one module's source: static `from "..."`, side-effect `import "..."`, and dynamic `import("...")`. A regex scan (no AST dependency) matches this repo's hous
- S:f99cb9f35c function determinismBoundaryErrors `export function determinismBoundaryErrors(root = REPO_ROOT)` L60 : Build a transitive {repoRelativeFile: [importedFiles]} adjacency map by walking relative imports out from the entry files, then assert FORBIDDEN_IMPORT is unreachable from every entry. Reads files fro
- S:9d42aeefd9 function gateGraphErrors `export function gateGraphErrors(graph)` L100 : gateGraphErrors(graph) -> { errors: [...], order: [...] } `errors` lists every defect (dangling edge or cycle); when it is empty, `order` holds a topological ordering with dependencies before dependen
### scripts/check-checker-engagement.mjs [F:fc5d887ff6]
- S:aa00911a72 function readEvents `function readEvents(path)` L23
### scripts/check-md-governance.mjs [F:fd08562f92]
- S:99ae98a428 function walkMd `function walkMd(dir, out = [])` L66
- S:575af01d8c function checkTarget `function checkTarget(fileDir, rawTarget, srcFile)` L111
- S:bc1fd2c5b3 function adrNumbers `function adrNumbers(dir)` L147 : 4. ADR number uniqueness within docs/adr, and across docs/adr and docs/research.
- S:24c6a3dc6c function parseFrontMatter `function parseFrontMatter(text)` L197 : Front-matter parsing for canonical uniqueness and advisory presence.
- S:6647a4e550 function extractCitedPaths `function extractCitedPaths(text)` L245
- S:38b734e681 function commitsSince `function commitsSince(paths, sinceDate)` L270 : Commits touching any of `paths` since `sinceDate` (a YYYY-MM-DD string already validated by the caller). Returns 0 (fail open, warn-free) if this is not a git checkout, e.g. an npm-installed copy of t
### apps/control-panel/server/ownership.mjs [F:fd4b8473fa]
- S:9bcfb77bfa function parseCodeowners `export function parseCodeowners(text)` L23 : Parse CODEOWNERS "pattern @owner @owner" lines into ordered rules. Comments and blank lines are dropped; each owner handle is lowercased with its leading @ removed so it compares directly to a handle 
- S:7a464a2d86 function ownersForPath `export function ownersForPath(rules, path)` L39 : GitHub CODEOWNERS is last-match-wins: the owners of the LAST rule whose pattern matches the path. Supports the common subset modonome's own CODEOWNERS uses (a "*" catchall and rooted dir/file prefixes
- S:857ab7696f function matchesPattern `function matchesPattern(pattern, path)` L47
- S:a50812babf function handleFromEmail `export function handleFromEmail(email)` L59 : Extract a GitHub handle from a commit email. Only the two GitHub noreply formats carry a handle deterministically; any other address returns null (fail closed), so an unmapped identity is treated as n
- S:b29e93fbc3 function localGitEmail `function localGitEmail(repoRoot, exec)` L68
- S:f99d630708 function pickCodeowners `function pickCodeowners(repoRoot, exists)` L76
- S:c36223901c function selfGovernanceOwnership `export function selfGovernanceOwnership(` L92 : Decide whether the local git identity is a code owner of the config at * configRelPath within repoRoot. Fail-closed everywhere it cannot prove ownership: * no CODEOWNERS file, no owner declared for th
### scripts/agent/render-prompt.mjs [F:fd660a117b]
- S:22e3bba95f function snapshotContext `export function snapshotContext(root = process.cwd())` L23 : Build a compact repository-snapshot context block from the committed Tier 0 signature, so every rendered role prompt starts pre-oriented and an agent can read the map instead of scanning the whole tre
- S:2b5847c683 function renderPrompt `export function renderPrompt(role, env = process.env)` L58 : Substitute every ${VAR} from env. Throw if a referenced variable is unset, so a missing identity or branch fails loudly instead of rendering an empty value into a model prompt.
### tests/portability.test.mjs [F:fd6ebce602]
- S:cf03857559 function runValidateConfig `function runValidateConfig(configPath, opts = {})` L28 : Run validate-config.mjs against a given config path.
- S:5daa909048 function runGuardRatchet `function runGuardRatchet(diffPath, opts = {})` L37 : Run guard-ratchet.mjs with a --diff fixture.
- S:cdac115f81 function runPortabilityCheck `function runPortabilityCheck(fixturePath, opts = {})` L46 : Run check-portability.mjs against a fixture directory.
### .design-sync/previews/TierBadge.tsx [F:fe5ec971f8]
- S:7d8d2691e2 function Tiers `export const Tiers = () => (` L4
### scripts/lib/git-scope.mjs [F:ff2c4a08a4]
- S:23fbaa24ea function git `export function git(args, opts = {})` L13
- S:a529342ccb function currentBranch `export function currentBranch()` L18
- S:79b048583f function defaultRange `export function defaultRange()` L27 : The commit range unique to this branch: origin/main..HEAD, falling back to the * last 20 commits when origin/main is not available (a fresh clone or local repo).
- S:7c3651a5ba function commitsInRange `export function commitsInRange(range = defaultRange())` L38 : Commits in `range` as structured records: { an, ae, cn, ce, sha, body }. Returns * the raw tab-delimited identity table too (the shape commit-identity.mjs parses). * Bodies are fetched one commit at a
### examples/demo-app/src/PaymentProcessor.js [F:ff3aef693f]
- S:9dee57c7c2 class PaymentProcessor `export class PaymentProcessor` L5
### scripts/lib/lang-adapters/go.mjs [F:ffe5c1269b]
- S:e7e0d4979a function clean `function clean(text)` L5 : Dependency-free signature extractor for Go. It captures top-level func (including methods with a receiver), type, const, and var declarations, their preceding line comments, and import edges (single a
- S:a9f138bd93 function signature `function signature(line)` L10
- S:f9d6a590e4 function docAbove `function docAbove(lines, index)` L14
- S:28d1266e44 const adapter `export const adapter =` L24

## Import edges

- scripts/lib/snapshot-graph.mjs -> scripts/lib/graph.mjs
- examples/demo-app/tests/OrderService.test.js -> examples/demo-app/src/OrderService.js
- tests/check-licenses.test.mjs -> scripts/check-licenses.mjs
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx -> design-system/src/components/Drawer/Drawer.tsx
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx -> design-system/src/components/WorkItemCard/WorkItemCard.tsx
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx -> design-system/src/tokens/tokens.ts
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx -> design-system/src/components/TierBadge/TierBadge.tsx
- design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx -> design-system/src/components/IdentityChip/IdentityChip.tsx
- tests/packet.test.mjs -> scripts/validate-knowledge-packet.mjs
- apps/control-panel/server/api.mjs -> apps/control-panel/server/modonomeWriter.mjs
- apps/control-panel/server/api.mjs -> apps/control-panel/server/modonomeReader.mjs
- apps/control-panel/server/api.mjs -> apps/control-panel/server/ownership.mjs
- scripts/detect-near-miss.mjs -> scripts/lib/learnings.mjs
- scripts/detect-near-miss.mjs -> scripts/lib/git-scope.mjs
- design-system/src/components/DecisionCard/index.ts -> design-system/src/components/DecisionCard/DecisionCard.tsx
- scripts/verify-packet.mjs -> scripts/lib/ed25519.mjs
- scripts/verify-packet.mjs -> scripts/lib/canonical-json.mjs
- scripts/verify-packet.mjs -> scripts/validate-knowledge-packet.mjs
- design-system/src/components/Input/index.ts -> design-system/src/components/Input/Input.tsx
- design-system/src/components/Toast/index.ts -> design-system/src/components/Toast/Toast.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/App.tsx -> apps/control-panel/src/screens/GatesScreen.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/lib/confirm.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/screens/SettingsScreen.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/screens/OverviewScreen.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/screens/LearningsScreen.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/state/adapter.ts
- apps/control-panel/src/App.tsx -> apps/control-panel/src/screens/WorkQueueScreen.tsx
- apps/control-panel/src/App.tsx -> apps/control-panel/src/screens/ArmingScreen.tsx
- tests/config.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/config.test.mjs -> scripts/lib/jsonschema.mjs
- tests/config.test.mjs -> scripts/validate-config.mjs
- tests/config.test.mjs -> scripts/migrate-config.mjs
- scripts/lib/packet-id.mjs -> scripts/lib/canonical-json.mjs
- design-system/src/components/Carousel/index.ts -> design-system/src/components/Carousel/Carousel.tsx
- design-system/src/components/ActivationLadder/ActivationLadder.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ActivationLadder/ActivationLadder.tsx -> design-system/src/components/Button/Button.tsx
- design-system/src/components/ActivationLadder/ActivationLadder.tsx -> design-system/src/tokens/tokens.ts
- design-system/src/components/ActivationLadder/ActivationLadder.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/detect-near-miss.test.mjs -> scripts/detect-near-miss.mjs
- scripts/check-control-panel-coverage.mjs -> scripts/lib/control-panel-audit.mjs
- design-system/src/components/MdnRoot/index.ts -> design-system/src/components/MdnRoot/MdnRoot.tsx
- design-system/src/components/LeaseTable/index.ts -> design-system/src/components/LeaseTable/LeaseTable.tsx
- design-system/src/components/ConceptTile/ConceptTile.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ConceptTile/ConceptTile.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/check-regex-safety.test.mjs -> scripts/check-regex-safety.mjs
- tests/ws-b-harness.test.mjs -> scripts/validate-config.mjs
- tests/ws-b-harness.test.mjs -> scripts/agent/run-cycle.mjs
- tests/ws-b-harness.test.mjs -> scripts/agent/render-prompt.mjs
- design-system/src/components/Select/index.ts -> design-system/src/components/Select/Select.tsx
- design-system/src/components/LearningCard/LearningCard.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/LearningCard/LearningCard.tsx -> design-system/src/components/Card/Card.tsx
- design-system/src/components/LearningCard/LearningCard.tsx -> design-system/src/components/Button/Button.tsx
- design-system/src/components/Tabs/Tabs.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Tabs/Tabs.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/github-api.test.mjs -> tests/helpers/mock-github-server.mjs
- tests/github-api.test.mjs -> scripts/lib/github-api.mjs
- scripts/remediate.mjs -> scripts/lib/detect-attribution.mjs
- scripts/remediate.mjs -> scripts/lib/remediate.mjs
- scripts/remediate.mjs -> scripts/validate-config.mjs
- scripts/remediate.mjs -> scripts/lib/git-scope.mjs
- scripts/agent/review-proposals.mjs -> scripts/agent/resolve-role.mjs
- scripts/agent/review-proposals.mjs -> scripts/agent/openai-client.mjs
- scripts/agent/review-proposals.mjs -> scripts/validate-config.mjs
- design-system/src/components/Toggle/Toggle.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Toggle/Toggle.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- apps/control-panel/server/modonomeWriter.mjs -> apps/control-panel/server/learningsFormat.mjs
- apps/control-panel/server/modonomeWriter.mjs -> scripts/lib/work-item-validate.mjs
- apps/control-panel/server/modonomeWriter.mjs -> scripts/lib/config-validate.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/python.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/js-ts.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/generic.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/java.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/go.mjs
- apps/control-panel/src/state/configDiff.ts -> apps/control-panel/src/state/types.ts
- design-system/src/components/AppShell/AppShell.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/AppShell/AppShell.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/snapshot-golden.test.mjs -> scripts/lib/lang-adapters/index.mjs
- tests/snapshot-golden.test.mjs -> scripts/lib/lang-adapters/tree-sitter.mjs
- scripts/lib/merkle.mjs -> scripts/lib/canonical-json.mjs
- scripts/check-control-panel-coherence.mjs -> scripts/lib/control-panel-audit.mjs
- scripts/agent/review-diff.mjs -> scripts/agent/resolve-role.mjs
- scripts/agent/review-diff.mjs -> scripts/agent/openai-client.mjs
- scripts/agent/review-diff.mjs -> scripts/validate-config.mjs
- design-system/src/components/States/States.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/StatusPill/StatusPill.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/StatusPill/StatusPill.tsx -> design-system/src/components/Icon/Icon.tsx
- scripts/agent/resolve-role.mjs -> scripts/agent/providers.mjs
- apps/control-panel/src/screens/GatesScreen.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/screens/GatesScreen.tsx -> apps/control-panel/src/lib/confirm.tsx
- scripts/check-learning-traceability.mjs -> scripts/lib/learnings.mjs
- design-system/src/components/RoleBadge/RoleBadge.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/RoleBadge/RoleBadge.tsx -> design-system/src/components/Icon/Icon.tsx
- examples/demo-app/tests/PaymentProcessor.test.js -> examples/demo-app/src/PaymentProcessor.js
- design-system/src/components/WorkItemDrawer/index.ts -> design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx
- tests/ws-h-config.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/ws-h-config.test.mjs -> scripts/agent/resolve-role.mjs
- tests/ws-h-config.test.mjs -> scripts/validate-config.mjs
- tests/run-gate-capped-unit.test.mjs -> scripts/lib/run-gate-capped.mjs
- examples/demo-app/tests/CartService.test.js -> examples/demo-app/src/CartService.js
- tests/secret-patterns-unit.test.mjs -> scripts/lib/secret-patterns.mjs
- design-system/src/components/QueueBoard/index.ts -> design-system/src/components/QueueBoard/QueueBoard.tsx
- tests/packet-signing.test.mjs -> scripts/verify-packet.mjs
- tests/packet-signing.test.mjs -> scripts/lib/packet-id.mjs
- tests/packet-signing.test.mjs -> scripts/lib/canonical-json.mjs
- tests/packet-signing.test.mjs -> scripts/sign-packet.mjs
- design-system/src/components/HoverCard/index.ts -> design-system/src/components/HoverCard/HoverCard.tsx
- scripts/check-self-application.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-self-application.mjs -> scripts/lib/jsonschema.mjs
- design-system/src/components/Card/Card.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Card/Card.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- tests/runner-env.test.mjs -> scripts/agent/run-cycle.mjs
- tests/remediate.test.mjs -> scripts/lib/detect-attribution.mjs
- tests/snapshot-incremental.test.mjs -> scripts/lib/snapshot-cache.mjs
- tests/snapshot-incremental.test.mjs -> scripts/lib/canonical-json.mjs
- tests/snapshot-incremental.test.mjs -> scripts/lib/snapshot-core.mjs
- design-system/src/components/Card/index.ts -> design-system/src/components/Card/Card.tsx
- tests/self-application.test.mjs -> scripts/lib/jsonschema.mjs
- scripts/lib/detect-attribution.mjs -> scripts/lib/branch-name.mjs
- scripts/lib/detect-attribution.mjs -> scripts/lib/commit-identity.mjs
- design-system/src/components/TierBadge/index.ts -> design-system/src/components/TierBadge/TierBadge.tsx
- scripts/lib/snapshot-redact.mjs -> scripts/lib/secret-patterns.mjs
- tests/branch-name.test.mjs -> scripts/lib/branch-name.mjs
- scripts/lib/policy-manifest.mjs -> scripts/lib/canonical-json.mjs
- scripts/lib/policy-manifest.mjs -> scripts/lib/branch-name.mjs
- scripts/lib/policy-manifest.mjs -> scripts/lib/capability-flags.mjs
- apps/control-panel/src/screens/SettingsScreen.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/screens/SettingsScreen.tsx -> apps/control-panel/src/state/configDiff.ts
- apps/control-panel/src/screens/SettingsScreen.tsx -> apps/control-panel/src/lib/confirm.tsx
- apps/control-panel/src/screens/SettingsScreen.tsx -> apps/control-panel/src/state/liveClient.ts
- scripts/disarm.mjs -> scripts/lib/yaml-lite.mjs
- design-system/src/components/RoleBadge/index.ts -> design-system/src/components/RoleBadge/RoleBadge.tsx
- tests/openai-client.test.mjs -> tests/helpers/mock-openai-server.mjs
- examples/demo-app/tests/CheckoutService.test.js -> examples/demo-app/src/CheckoutService.js
- tests/near-miss.test.mjs -> scripts/lib/learnings.mjs
- design-system/src/components/SafetyStrip/SafetyStrip.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/SafetyStrip/SafetyStrip.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- tests/run-cycle-openai.test.mjs -> scripts/agent/apply-patch.mjs
- tests/run-cycle-openai.test.mjs -> scripts/agent/run-cycle.mjs
- tests/run-cycle-openai.test.mjs -> tests/helpers/mock-openai-server.mjs
- design-system/src/components/DecisionCard/DecisionCard.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/DecisionCard/DecisionCard.tsx -> design-system/src/components/Card/Card.tsx
- design-system/src/components/DecisionCard/DecisionCard.tsx -> design-system/src/components/Button/Button.tsx
- design-system/src/components/Modal/index.ts -> design-system/src/components/Modal/Modal.tsx
- tests/maker-checker.test.mjs -> scripts/validate-work-item.mjs
- scripts/agent/action-queue.mjs -> scripts/lib/jsonschema.mjs
- apps/control-panel/server/remediationView.mjs -> scripts/lib/remediate.mjs
- scripts/scaffold.mjs -> scripts/install-hooks.mjs
- scripts/arm.mjs -> scripts/lib/yaml-lite.mjs
- scripts/arm.mjs -> scripts/validate-work-item.mjs
- design-system/src/components/LearningCard/index.ts -> design-system/src/components/LearningCard/LearningCard.tsx
- tests/arming.test.mjs -> bin/modonome.mjs
- scripts/check-repo-hygiene.mjs -> scripts/lib/branch-name.mjs
- scripts/check-repo-hygiene.mjs -> scripts/lib/commit-identity.mjs
- design-system/src/components/Modal/Modal.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Modal/Modal.tsx -> design-system/src/components/IconButton/IconButton.tsx
- design-system/src/components/ConfirmDialog/ConfirmDialog.tsx -> design-system/src/components/Modal/Modal.tsx
- design-system/src/components/ConfirmDialog/ConfirmDialog.tsx -> design-system/src/components/Button/Button.tsx
- scripts/validate-knowledge-packet.mjs -> scripts/lib/jsonschema.mjs
- scripts/validate-knowledge-packet.mjs -> scripts/lib/secret-patterns.mjs
- design-system/src/components/HoverCard/HoverCard.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/HoverCard/HoverCard.tsx -> design-system/src/components/Icon/Icon.tsx
- apps/control-panel/src/screens/OverviewScreen.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/screens/OverviewScreen.tsx -> apps/control-panel/src/content/concepts.ts
- design-system/src/components/ActivationLadder/index.ts -> design-system/src/components/ActivationLadder/ActivationLadder.tsx
- tests/review-diff.test.mjs -> scripts/agent/review-diff.mjs
- design-system/src/components/StatusPill/index.ts -> design-system/src/components/StatusPill/StatusPill.tsx
- scripts/dry-run-sweep.mjs -> scripts/lib/control-panel-audit.mjs
- scripts/dry-run-sweep.mjs -> scripts/lib/repo-detect.mjs
- scripts/dry-run-sweep.mjs -> scripts/score-proposals.mjs
- design-system/src/components/Checkbox/Checkbox.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Checkbox/Checkbox.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- design-system/src/components/Checkbox/Checkbox.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/ArmingStateBadge/index.ts -> design-system/src/components/ArmingStateBadge/ArmingStateBadge.tsx
- design-system/src/components/Drawer/Drawer.tsx -> design-system/src/components/IconButton/IconButton.tsx
- apps/control-panel/src/screens/LearningsScreen.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/screens/LearningsScreen.tsx -> apps/control-panel/src/lib/confirm.tsx
- tests/check-attribution-fp-corpus.test.mjs -> scripts/lib/attribution-fp-corpus.mjs
- tests/check-attribution-fp-corpus.test.mjs -> scripts/check-attribution-fp-corpus.mjs
- design-system/src/components/Input/Input.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Input/Input.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- design-system/src/components/Input/Input.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/AuditTimeline/AuditTimeline.tsx -> design-system/src/lib/format.ts
- design-system/src/components/AuditTimeline/AuditTimeline.tsx -> design-system/src/components/Icon/Icon.tsx
- scripts/build-policy-attestation.mjs -> scripts/lib/yaml-lite.mjs
- scripts/build-policy-attestation.mjs -> scripts/lib/canonical-json.mjs
- scripts/build-policy-attestation.mjs -> scripts/lib/cli-args.mjs
- scripts/build-policy-attestation.mjs -> scripts/lib/jsonschema.mjs
- scripts/build-policy-attestation.mjs -> scripts/lib/policy-manifest.mjs
- design-system/src/components/ArmingStateBadge/ArmingStateBadge.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ArmingStateBadge/ArmingStateBadge.tsx -> design-system/src/tokens/tokens.ts
- design-system/src/components/ArmingStateBadge/ArmingStateBadge.tsx -> design-system/src/components/Icon/Icon.tsx
- scripts/sign-packet.mjs -> scripts/lib/canonical-json.mjs
- apps/control-panel/src/state/fixtures/host.ts -> apps/control-panel/src/state/types.ts
- design-system/src/components/ConfirmDialog/index.ts -> design-system/src/components/ConfirmDialog/ConfirmDialog.tsx
- design-system/src/components/Select/Select.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Select/Select.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- design-system/src/components/Select/Select.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/Slider/Slider.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Slider/Slider.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- tests/resolve-role.test.mjs -> scripts/agent/resolve-role.mjs
- design-system/src/components/Table/index.ts -> design-system/src/components/Table/Table.tsx
- design-system/src/components/Icon/index.ts -> design-system/src/components/Icon/Icon.tsx
- scripts/check-work-items.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-work-items.mjs -> scripts/validate-work-item.mjs
- scripts/check-drift.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-drift.mjs -> scripts/migrate-config.mjs
- apps/control-panel/src/main.tsx -> apps/control-panel/src/App.tsx
- apps/control-panel/src/main.tsx -> apps/control-panel/src/app.css
- apps/control-panel/src/state/fixtures/product.ts -> apps/control-panel/src/state/types.ts
- design-system/src/components/Tabs/index.ts -> design-system/src/components/Tabs/Tabs.tsx
- apps/control-panel/server/modonomeReader.mjs -> apps/control-panel/server/learningsFormat.mjs
- apps/control-panel/server/modonomeReader.mjs -> apps/control-panel/server/remediationView.mjs
- design-system/src/components/Tooltip/Tooltip.tsx -> design-system/src/lib/cx.ts
- tests/transition-work-item-unit.test.mjs -> scripts/transition-work-item.mjs
- design-system/src/components/Button/Button.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Button/Button.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/control-panel-writer-nested.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/control-panel-writer-nested.test.mjs -> apps/control-panel/server/modonomeWriter.mjs
- tests/control-panel-writer-nested.test.mjs -> scripts/agent/resolve-role.mjs
- tests/control-panel-writer-nested.test.mjs -> scripts/lib/config-validate.mjs
- tests/control-panel-writer-nested.test.mjs -> scripts/agent/run-cycle.mjs
- scripts/check-state-machine-acyclic.mjs -> scripts/lib/graph.mjs
- examples/demo-app/src/index.js -> examples/demo-app/src/OrderService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/CheckoutService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/CartService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/NotificationService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/InventoryService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/PaymentProcessor.js
- design-system/src/components/GatePanel/GatePanel.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/GatePanel/GatePanel.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/GatePanel/GatePanel.tsx -> design-system/src/lib/format.ts
- design-system/src/components/GatePanel/GatePanel.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/chaos.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/chaos.test.mjs -> scripts/validate-knowledge-packet.mjs
- tests/chaos.test.mjs -> scripts/validate-config.mjs
- scripts/lib/remediate.mjs -> scripts/lib/detect-attribution.mjs
- design-system/src/components/States/index.ts -> design-system/src/components/States/States.tsx
- scripts/hygiene.mjs -> scripts/lib/github-api.mjs
- scripts/hygiene.mjs -> scripts/lib/git-scope.mjs
- design-system/src/components/MdnRoot/MdnRoot.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/MetricTile/index.ts -> design-system/src/components/MetricTile/MetricTile.tsx
- scripts/validate-config.mjs -> scripts/lib/config-validate.mjs
- tests/policy-manifest.test.mjs -> scripts/lib/jsonschema.mjs
- tests/policy-manifest.test.mjs -> scripts/lib/capability-flags.mjs
- scripts/build-release-evidence.mjs -> scripts/lib/yaml-lite.mjs
- scripts/build-release-evidence.mjs -> scripts/lib/learnings.mjs
- design-system/src/components/LeaseTable/LeaseTable.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/LeaseTable/LeaseTable.tsx -> design-system/src/lib/format.ts
- design-system/src/components/LeaseTable/LeaseTable.tsx -> design-system/src/components/Button/Button.tsx
- design-system/src/components/LeaseTable/LeaseTable.tsx -> design-system/src/components/Table/Table.tsx
- design-system/src/components/LeaseTable/LeaseTable.tsx -> design-system/src/components/IdentityChip/IdentityChip.tsx
- apps/control-panel/src/state/adapter.ts -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/state/adapter.ts -> apps/control-panel/src/state/arming.ts
- apps/control-panel/src/state/adapter.ts -> apps/control-panel/src/state/fixtures/host.ts
- apps/control-panel/src/state/adapter.ts -> apps/control-panel/src/state/fixtures/product.ts
- apps/control-panel/src/state/adapter.ts -> apps/control-panel/src/state/liveClient.ts
- apps/control-panel/src/screens/WorkQueueScreen.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/screens/WorkQueueScreen.tsx -> apps/control-panel/src/lib/confirm.tsx
- tests/hygiene.test.mjs -> scripts/hygiene.mjs
- scripts/migrate-config.mjs -> scripts/lib/yaml-lite.mjs
- tests/agentproof-registry.test.mjs -> scripts/check-agentproof-registry.mjs
- design-system/src/components/ProgressMeter/ProgressMeter.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/MetricTile/MetricTile.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/MetricTile/MetricTile.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- design-system/src/components/MetricTile/MetricTile.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/snapshot-cli.test.mjs -> scripts/lib/jsonschema.mjs
- scripts/snapshot.mjs -> scripts/lib/snapshot-cache.mjs
- scripts/snapshot.mjs -> scripts/lib/yaml-lite.mjs
- scripts/snapshot.mjs -> scripts/lib/canonical-json.mjs
- scripts/snapshot.mjs -> scripts/lib/lang-adapters/index.mjs
- scripts/snapshot.mjs -> scripts/lib/merkle.mjs
- scripts/snapshot.mjs -> scripts/lib/snapshot-walk.mjs
- scripts/snapshot.mjs -> scripts/lib/lang-adapters/tree-sitter.mjs
- scripts/snapshot.mjs -> scripts/lib/snapshot-core.mjs
- design-system/src/components/Table/Table.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ModeSwitcher/index.ts -> design-system/src/components/ModeSwitcher/ModeSwitcher.tsx
- apps/control-panel/vite.config.ts -> apps/control-panel/server/api.mjs
- design-system/src/components/ConceptTile/index.ts -> design-system/src/components/ConceptTile/ConceptTile.tsx
- design-system/src/components/IconButton/IconButton.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/IconButton/IconButton.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/Toast/Toast.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Toast/Toast.tsx -> design-system/src/components/Icon/Icon.tsx
- scripts/promote-learning.mjs -> scripts/lib/learnings.mjs
- scripts/check-evidence-secrets.mjs -> scripts/lib/secret-patterns.mjs
- design-system/src/index.ts -> design-system/src/components/DecisionCard/index.ts
- design-system/src/index.ts -> design-system/src/components/Input/index.ts
- design-system/src/index.ts -> design-system/src/components/Toast/index.ts
- design-system/src/index.ts -> design-system/src/components/Carousel/index.ts
- design-system/src/index.ts -> design-system/src/components/MdnRoot/index.ts
- design-system/src/index.ts -> design-system/src/components/LeaseTable/index.ts
- design-system/src/index.ts -> design-system/src/components/Select/index.ts
- design-system/src/index.ts -> design-system/src/components/WorkItemDrawer/index.ts
- design-system/src/index.ts -> design-system/src/components/QueueBoard/index.ts
- design-system/src/index.ts -> design-system/src/components/HoverCard/index.ts
- design-system/src/index.ts -> design-system/src/components/Card/index.ts
- design-system/src/index.ts -> design-system/src/components/TierBadge/index.ts
- design-system/src/index.ts -> design-system/src/components/RoleBadge/index.ts
- design-system/src/index.ts -> design-system/src/components/Modal/index.ts
- design-system/src/index.ts -> design-system/src/components/LearningCard/index.ts
- design-system/src/index.ts -> design-system/src/components/ActivationLadder/index.ts
- design-system/src/index.ts -> design-system/src/components/StatusPill/index.ts
- design-system/src/index.ts -> design-system/src/components/ArmingStateBadge/index.ts
- design-system/src/index.ts -> design-system/src/lib/cx.ts
- design-system/src/index.ts -> design-system/src/components/ConfirmDialog/index.ts
- design-system/src/index.ts -> design-system/src/components/Table/index.ts
- design-system/src/index.ts -> design-system/src/components/Icon/index.ts
- design-system/src/index.ts -> design-system/src/lib/format.ts
- design-system/src/index.ts -> design-system/src/components/Tabs/index.ts
- design-system/src/index.ts -> design-system/src/components/States/index.ts
- design-system/src/index.ts -> design-system/src/components/MetricTile/index.ts
- design-system/src/index.ts -> design-system/src/components/ModeSwitcher/index.ts
- design-system/src/index.ts -> design-system/src/components/ConceptTile/index.ts
- design-system/src/index.ts -> design-system/src/components/ProgressMeter/index.ts
- design-system/src/index.ts -> design-system/src/components/WorkItemCard/index.ts
- design-system/src/index.ts -> design-system/src/components/Checkbox/index.ts
- design-system/src/index.ts -> design-system/src/components/IdentityChip/index.ts
- design-system/src/index.ts -> design-system/src/components/Button/index.ts
- design-system/src/index.ts -> design-system/src/components/AppShell/index.ts
- design-system/src/index.ts -> design-system/src/components/SafetyStrip/index.ts
- design-system/src/index.ts -> design-system/src/components/Sparkline/index.ts
- design-system/src/index.ts -> design-system/src/tokens/tokens.ts
- design-system/src/index.ts -> design-system/src/components/Drawer/index.ts
- design-system/src/index.ts -> design-system/src/components/GatePanel/index.ts
- design-system/src/index.ts -> design-system/src/components/HelpHint/index.ts
- design-system/src/index.ts -> design-system/src/components/AuditTimeline/index.ts
- design-system/src/index.ts -> design-system/src/components/NumberField/index.ts
- design-system/src/index.ts -> design-system/src/components/Tooltip/index.ts
- design-system/src/index.ts -> design-system/src/components/Toggle/index.ts
- design-system/src/index.ts -> design-system/src/components/CostPanel/index.ts
- design-system/src/index.ts -> design-system/src/components/Slider/index.ts
- design-system/src/index.ts -> design-system/src/components/ProtectedPathRow/index.ts
- design-system/src/index.ts -> design-system/src/components/IconButton/index.ts
- tests/remediation-view.test.mjs -> apps/control-panel/server/remediationView.mjs
- tests/snapshot-security.test.mjs -> scripts/lib/snapshot-cache.mjs
- tests/snapshot-security.test.mjs -> scripts/lib/snapshot-walk.mjs
- tests/snapshot-security.test.mjs -> scripts/lib/snapshot-core.mjs
- scripts/check-agentproof-registry.mjs -> scripts/lib/jsonschema.mjs
- tests/performance.test.mjs -> scripts/validate-knowledge-packet.mjs
- tests/performance.test.mjs -> scripts/validate-config.mjs
- tests/performance.test.mjs -> scripts/validate-work-item.mjs
- design-system/src/components/ProgressMeter/index.ts -> design-system/src/components/ProgressMeter/ProgressMeter.tsx
- design-system/src/components/ModeSwitcher/ModeSwitcher.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ModeSwitcher/ModeSwitcher.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/WorkItemCard/index.ts -> design-system/src/components/WorkItemCard/WorkItemCard.tsx
- design-system/src/components/WorkItemCard/WorkItemCard.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/WorkItemCard/WorkItemCard.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/WorkItemCard/WorkItemCard.tsx -> design-system/src/tokens/tokens.ts
- design-system/src/components/WorkItemCard/WorkItemCard.tsx -> design-system/src/components/TierBadge/TierBadge.tsx
- design-system/src/components/WorkItemCard/WorkItemCard.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/Checkbox/index.ts -> design-system/src/components/Checkbox/Checkbox.tsx
- scripts/queue.mjs -> scripts/lib/yaml-lite.mjs
- scripts/queue.mjs -> scripts/agent/review-proposals.mjs
- scripts/queue.mjs -> scripts/dry-run-sweep.mjs
- scripts/queue.mjs -> scripts/validate-work-item.mjs
- tests/provenance.test.mjs -> scripts/validate-knowledge-packet.mjs
- design-system/src/components/IdentityChip/index.ts -> design-system/src/components/IdentityChip/IdentityChip.tsx
- tests/ws-e-negative-controls.test.mjs -> scripts/lib/learnings.mjs
- tests/ws-e-negative-controls.test.mjs -> scripts/validate-work-item.mjs
- tests/sweep-to-work-item.test.mjs -> scripts/dry-run-sweep.mjs
- tests/sweep-to-work-item.test.mjs -> scripts/validate-work-item.mjs
- design-system/src/components/Button/index.ts -> design-system/src/components/Button/Button.tsx
- scripts/check-work-item-staleness.mjs -> scripts/lib/work-item-staleness.mjs
- design-system/src/components/AppShell/index.ts -> design-system/src/components/AppShell/AppShell.tsx
- design-system/src/components/SafetyStrip/index.ts -> design-system/src/components/SafetyStrip/SafetyStrip.tsx
- scripts/check-promotion-readiness.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-promotion-readiness.mjs -> scripts/lib/capability-flags.mjs
- design-system/src/components/Sparkline/index.ts -> design-system/src/components/Sparkline/Sparkline.tsx
- scripts/audit-learnings.mjs -> scripts/lib/learnings.mjs
- scripts/check-style.mjs -> scripts/lib/detect-attribution.mjs
- scripts/lib/work-item-validate.mjs -> scripts/lib/jsonschema.mjs
- tests/install-hooks.test.mjs -> scripts/install-hooks.mjs
- design-system/src/components/CostPanel/CostPanel.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/CostPanel/CostPanel.tsx -> design-system/src/lib/format.ts
- design-system/src/components/CostPanel/CostPanel.tsx -> design-system/src/components/ProgressMeter/ProgressMeter.tsx
- design-system/src/components/CostPanel/CostPanel.tsx -> design-system/src/components/Table/Table.tsx
- design-system/src/components/Drawer/index.ts -> design-system/src/components/Drawer/Drawer.tsx
- design-system/src/components/GatePanel/index.ts -> design-system/src/components/GatePanel/GatePanel.tsx
- design-system/src/components/HelpHint/index.ts -> design-system/src/components/HelpHint/HelpHint.tsx
- examples/demo-app/tests/NotificationService.test.js -> examples/demo-app/src/NotificationService.js
- design-system/src/components/Carousel/Carousel.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/Carousel/Carousel.tsx -> design-system/src/components/IconButton/IconButton.tsx
- scripts/lib/config-validate.mjs -> scripts/lib/yaml-lite.mjs
- scripts/lib/config-validate.mjs -> scripts/lib/jsonschema.mjs
- design-system/src/components/HelpHint/HelpHint.tsx -> design-system/src/components/Tooltip/Tooltip.tsx
- design-system/src/components/HelpHint/HelpHint.tsx -> design-system/src/components/Icon/Icon.tsx
- tests/render-prompt-unit.test.mjs -> scripts/agent/render-prompt.mjs
- design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx -> design-system/src/components/StatusPill/StatusPill.tsx
- design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx -> design-system/src/components/Button/Button.tsx
- design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx -> design-system/src/components/Icon/Icon.tsx
- design-system/src/components/TierBadge/TierBadge.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/NumberField/NumberField.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/NumberField/NumberField.tsx -> design-system/src/components/HelpHint/HelpHint.tsx
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-graph.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/yaml-lite.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-anchors.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/canonical-json.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/lang-adapters/index.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/merkle.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-redact.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/token-estimate.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/repo-detect.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-walk.mjs
- tests/promoted-learnings.test.mjs -> scripts/lib/learnings.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/resolve-role.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/route-action.mjs
- scripts/agent/run-cycle.mjs -> scripts/lib/learnings.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/action-queue.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/parse-checker-telemetry.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/apply-patch.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/providers.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/openai-client.mjs
- scripts/agent/run-cycle.mjs -> scripts/validate-config.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/tool-loop-adapter.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/render-prompt.mjs
- design-system/src/components/AuditTimeline/index.ts -> design-system/src/components/AuditTimeline/AuditTimeline.tsx
- tests/check-gate-dag.test.mjs -> scripts/check-gate-dag.mjs
- tests/control-panel-work-item-writer.test.mjs -> apps/control-panel/server/modonomeWriter.mjs
- tests/role-registry.test.mjs -> scripts/agent/resolve-role.mjs
- tests/role-registry.test.mjs -> scripts/validate-config.mjs
- tests/role-registry.test.mjs -> scripts/agent/run-cycle.mjs
- apps/control-panel/src/screens/ArmingScreen.tsx -> apps/control-panel/src/state/types.ts
- apps/control-panel/src/screens/ArmingScreen.tsx -> apps/control-panel/src/state/configDiff.ts
- apps/control-panel/src/screens/ArmingScreen.tsx -> apps/control-panel/src/lib/confirm.tsx
- tests/agent-capability-profile.test.mjs -> scripts/agent/resolve-role.mjs
- tests/agent-capability-profile.test.mjs -> scripts/lib/config-validate.mjs
- tests/promote-learning.test.mjs -> scripts/lib/learnings.mjs
- scripts/check-attribution-fp-corpus.mjs -> scripts/lib/detect-attribution.mjs
- scripts/check-attribution-fp-corpus.mjs -> scripts/lib/near-miss.mjs
- design-system/src/components/NumberField/index.ts -> design-system/src/components/NumberField/NumberField.tsx
- apps/control-panel/src/state/liveClient.ts -> apps/control-panel/src/state/types.ts
- tests/tool-loop-adapter.test.mjs -> scripts/agent/run-cycle.mjs
- scripts/run-gate-pipeline.mjs -> scripts/lib/run-gate-capped.mjs
- scripts/run-gate-pipeline.mjs -> scripts/lib/graph.mjs
- tests/providers.test.mjs -> scripts/agent/resolve-role.mjs
- tests/providers.test.mjs -> scripts/agent/providers.mjs
- tests/providers.test.mjs -> scripts/validate-config.mjs
- tests/providers.test.mjs -> scripts/agent/run-cycle.mjs
- tests/commit-identity.test.mjs -> scripts/lib/commit-identity.mjs
- design-system/src/components/Tooltip/index.ts -> design-system/src/components/Tooltip/Tooltip.tsx
- scripts/validate-work-item.mjs -> scripts/lib/work-item-validate.mjs
- design-system/src/components/Toggle/index.ts -> design-system/src/components/Toggle/Toggle.tsx
- design-system/src/components/CostPanel/index.ts -> design-system/src/components/CostPanel/CostPanel.tsx
- design-system/src/components/Slider/index.ts -> design-system/src/components/Slider/Slider.tsx
- examples/demo-app/tests/InventoryService.test.js -> examples/demo-app/src/InventoryService.js
- design-system/src/components/QueueBoard/QueueBoard.tsx -> design-system/src/components/WorkItemCard/WorkItemCard.tsx
- design-system/src/components/QueueBoard/QueueBoard.tsx -> design-system/src/tokens/tokens.ts
- bin/modonome.mjs -> scripts/validate-config.mjs
- tests/decisions-authority.test.mjs -> scripts/check-decisions-authority.mjs
- design-system/src/components/IdentityChip/IdentityChip.tsx -> design-system/src/lib/cx.ts
- design-system/src/components/ProtectedPathRow/index.ts -> design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx
- scripts/check-gate-dag.mjs -> scripts/lib/graph.mjs
- design-system/src/components/IconButton/index.ts -> design-system/src/components/IconButton/IconButton.tsx

## Attention (centrality + pagerank)

1. design-system/src/lib/cx.ts centrality=32 pagerank=0.032601
2. design-system/src/components/Icon/Icon.tsx centrality=23 pagerank=0.021134
3. design-system/src/index.ts centrality=48 pagerank=0.000857
4. scripts/lib/jsonschema.mjs centrality=11 pagerank=0.013382
5. scripts/lib/yaml-lite.mjs centrality=17 pagerank=0.008958
6. scripts/agent/run-cycle.mjs centrality=18 pagerank=0.003371
7. apps/control-panel/src/state/types.ts centrality=12 pagerank=0.007195
8. design-system/src/components/HelpHint/HelpHint.tsx centrality=12 pagerank=0.007192
9. scripts/validate-config.mjs centrality=13 pagerank=0.00497
10. scripts/lib/learnings.mjs centrality=10 pagerank=0.006891
11. design-system/src/components/StatusPill/StatusPill.tsx centrality=12 pagerank=0.005127
12. scripts/lib/canonical-json.mjs centrality=10 pagerank=0.004896
13. scripts/agent/resolve-role.mjs centrality=10 pagerank=0.003768
14. scripts/lib/config-validate.mjs centrality=6 pagerank=0.006209
15. scripts/lib/snapshot-core.mjs centrality=13 pagerank=0.001434
16. design-system/src/components/Button/Button.tsx centrality=9 pagerank=0.004135
17. scripts/lib/detect-attribution.mjs centrality=7 pagerank=0.005446
18. scripts/validate-work-item.mjs centrality=8 pagerank=0.003468
19. design-system/src/components/IconButton/IconButton.tsx centrality=6 pagerank=0.004797
20. apps/control-panel/src/App.tsx centrality=10 pagerank=0.001221
21. design-system/src/components/WorkItemCard/WorkItemCard.tsx centrality=8 pagerank=0.002504
22. scripts/validate-knowledge-packet.mjs centrality=7 pagerank=0.003094
23. scripts/lib/branch-name.mjs centrality=4 pagerank=0.004549
24. scripts/lib/secret-patterns.mjs centrality=4 pagerank=0.004462
25. design-system/src/tokens/tokens.ts centrality=6 pagerank=0.002997
26. scripts/lib/lang-adapters/index.mjs centrality=8 pagerank=0.001434
27. scripts/lib/graph.mjs centrality=4 pagerank=0.00413
28. apps/control-panel/src/lib/confirm.tsx centrality=6 pagerank=0.002695
29. design-system/src/components/Tooltip/Tooltip.tsx centrality=3 pagerank=0.004655
30. scripts/agent/providers.mjs centrality=3 pagerank=0.004502
31. scripts/lib/work-item-validate.mjs centrality=3 pagerank=0.004423
32. design-system/src/components/WorkItemDrawer/WorkItemDrawer.tsx centrality=7 pagerank=0.001599
33. scripts/lib/commit-identity.mjs centrality=3 pagerank=0.004264
34. scripts/snapshot.mjs centrality=8 pagerank=0.000857
35. apps/control-panel/server/modonomeWriter.mjs centrality=6 pagerank=0.002181
36. design-system/src/components/Card/Card.tsx centrality=5 pagerank=0.002504
37. design-system/src/lib/format.ts centrality=5 pagerank=0.002503
38. design-system/src/components/LeaseTable/LeaseTable.tsx centrality=6 pagerank=0.001599
39. apps/control-panel/src/state/adapter.ts centrality=6 pagerank=0.000972
40. design-system/src/components/ActivationLadder/ActivationLadder.tsx centrality=5 pagerank=0.001599
41. design-system/src/components/CostPanel/CostPanel.tsx centrality=5 pagerank=0.001599
42. design-system/src/components/GatePanel/GatePanel.tsx centrality=5 pagerank=0.001599
43. design-system/src/components/ProtectedPathRow/ProtectedPathRow.tsx centrality=5 pagerank=0.001599
44. design-system/src/components/Modal/Modal.tsx centrality=4 pagerank=0.002278
45. design-system/src/components/TierBadge/TierBadge.tsx centrality=4 pagerank=0.002251
46. examples/demo-app/src/index.js centrality=6 pagerank=0.000857
47. design-system/src/components/Table/Table.tsx centrality=4 pagerank=0.00221
48. scripts/lib/remediate.mjs centrality=3 pagerank=0.002859
49. design-system/src/components/IdentityChip/IdentityChip.tsx centrality=4 pagerank=0.002097
50. scripts/dry-run-sweep.mjs centrality=5 pagerank=0.001404

