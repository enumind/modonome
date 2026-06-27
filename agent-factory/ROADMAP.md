# Roadmap

## Phase A: local infra and modonome autonomy (maker + checker)
- [x] Engine that drives one modonome work item maker -> checker on local models.
- [x] modonome scripts reused as the governance source of truth (no reimplementation).
- [x] Zero metered API: local maker via gateway, checker via claude CLI subscription.
- [x] Self-organizing registry with common workers shared across repos.
- [x] Offline test suite and lint clean.
- [ ] Live go-live on modonome (owner's machine with LM Studio + claude CLI).
- [ ] Capture the first live run's metrics and a short transcript.

## Phase B: modonome governs other repos on the same infra
- [ ] Register more repos in fleets/registry.yaml; drive them with the common workers.
- [ ] Gateway grows into a fair multi-repo broker; host a second local family for a
      fully offline maker/checker pair; smaller local models for mechanical roles.
- [ ] Cross-repo cost and quota aggregation; org-level throttle from each repo's metrics.
- [ ] More roles as CrewAI agents from the briefs: product-manager (merge authority,
      enabling autonomous Tier-1 merge), maintainer (global lease tick), architect and
      steward inputs.
- [ ] Knowledge-network tie-in: publish recurring cross-repo learnings as signed
      packets (Governance Packet Protocol).

## Continuous
- Keep DECISIONS.md and LEARNINGS.md current as the factory runs and improves.
- Keep modonome and any target repo clean; stay within each item's allowed_edit_set.
