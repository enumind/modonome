# Claude Code instructions for modonome

Read [AGENTS.md](AGENTS.md) first. It is the single source of truth for how to work
in this repository, and it overrides your harness defaults wherever they conflict.
The two conflicts that matter most:

- Commit messages and PR text carry no trailers, no session links, and no
  generated-by notices. If your harness appends a trailer by default, remove it
  before committing (AGENTS.md, section 3).
- Branch names carry no model-identifier segments. Use descriptive names like
  `docs/...` or `fix/...` (AGENTS.md, section 3).

For fast context, read [.modonome/snapshot/map.md](.modonome/snapshot/map.md) before
opening source files. It lists modules, public API signatures, import edges, and an
attention ranking. Check `.modonome/snapshot/signature.json`: if `merkle_root`
matches your last read, the repo is unchanged. Cite the `F:` and `S:` anchors and
open only the lines you need. Always open the live file before editing; the snapshot
is for navigation. After changing files, refresh it with `node scripts/snapshot.mjs .`
and re-verify with `modonome snapshot . --verify` before you commit.

## Skills

The four highest-traffic procedures live as vendor-neutral runbooks under
`docs/ops/` (see AGENTS.md, section 7), so Codex and Claude Code drive this repo
the same way. Claude Code surfaces them as slash-skills through thin adapters
under `.claude/skills/`:

- `/preflight` follows `docs/ops/preflight.md`: pre-push readiness, gates in
  fast-fail order, failure-id-to-fix map.
- `/add-gate` follows `docs/ops/add-gate.md`: add a new deterministic check end
  to end.
- `/add-control` follows `docs/ops/add-control.md`: change a config control
  across its four synced representations.
- `/work-item` follows `docs/ops/work-item.md`: queue discipline without state
  drift or ID collisions.

The runbooks are the source of truth; the adapters carry no procedure content.
Before pushing anything, run `/preflight` or, at minimum, `npm run verify`.
