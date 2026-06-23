## What this PR does

<!-- One paragraph. What changed and why. -->

## Governance checklist

- [ ] `npm run verify` passes locally (drift guard + style check + tests + AgentProof)
- [ ] No em dashes in any tracked file (the style check rejects them)
- [ ] Prose states conclusions directly (style check rejects hedging phrases)
- [ ] No AI co-author lines in commit messages
- [ ] If ratchet logic changed: updated `RATCHET-SPEC.md` and added/updated a fixture
- [ ] If a new AgentProof scenario: fixture is zero-false-positive (clean diff does not trigger it)
- [ ] If config schema changed: `schema_version` bumped and CHANGELOG entry added
- [ ] If prompt changed: `npm run build:prompt` regenerated the bundle

## Test evidence

<!-- Paste the relevant lines from `npm test` or `npm run agentproof` output. -->
