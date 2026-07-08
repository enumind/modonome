# Codex instructions for modonome

Read [AGENTS.md](AGENTS.md) first. It is the single source of truth for how to work in this
repository.

For fast context, read [.modonome/snapshot/map.md](.modonome/snapshot/map.md) before opening
source files. It lists modules, public API signatures, import edges, and an attention
ranking. Check `.modonome/snapshot/signature.json`: if `merkle_root` matches your last read,
the repo is unchanged. Cite the `F:` and `S:` anchors and open only the lines you need.
Always open the live file before editing; the snapshot is for navigation, not a substitute
for the current bytes. Plan against `merkle_root`, re-verify with
`modonome snapshot . --verify` before you commit, and reconcile with
`modonome snapshot . --since <ref>` if it moved.

The four highest-traffic procedures (pre-push readiness, adding a gate, changing a
config control, work-item queue discipline) are vendor-neutral runbooks under
`docs/ops/`, indexed in AGENTS.md section 7. Follow them directly; they are the same
procedures other agents use.
