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

Four repo skills live under `.claude/skills/` and encode the procedures that burn
the most time when done from memory:

- `/preflight`: pre-push readiness. Runs the right gates in fast-fail order and maps
  each failure id to its fix.
- `/add-gate`: add a new deterministic check end-to-end (ADR, script, tests, CI
  wiring, self-application registration).
- `/add-control`: add or change a config control across its four synced
  representations without tripping the drift guard.
- `/work-item`: create, claim, transition, and close work items without state drift
  or ID collisions.

Before pushing anything, run `/preflight` or, at minimum, `npm run verify`.
