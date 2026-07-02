# Modonome control panel

This page renders durable state. It is not a second source of truth, and the sections below
are not hand-maintained: use the real control panel at `apps/control-panel/` for current
values, since a markdown snapshot here would drift out of sync with the live queue, gates,
and audit trail the moment anything changes.

Run it: `npm install --prefix design-system && cd apps/control-panel && npm install && npm
run dev`, then open `http://localhost:5180` in product mode. See
[`apps/control-panel/README.md`](../apps/control-panel/README.md) for prerequisites, live
versus demo data, and write mode.

## What it shows

- Header: repo, branch, mode, last sweep, required owner action.
- Safety strip: autonomy, dry-run, auto-merge, merge cap, budget, branch protection, code
  owners, trusted authors.
- Queue board and lease table: every work item by state, and active claims.
- Gate panel and protected-path panel.
- Cost panel: local versus remote calls, budget consumed.
- Learning queue and decision queue, with promote, prune, and resolve actions.
- Audit timeline.

Full information architecture: [`prompts/modules/control-panel.md`](../prompts/modules/control-panel.md).
