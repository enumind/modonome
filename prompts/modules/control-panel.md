<!-- modonome:module control-panel -->
## Operator control panel

The engine exposes one clear page for viewing and maintaining autonomy state. If the repo has
an app or docs site, build it there with the host design system. If there is no UI surface,
generate `control-panel.md` as a polished page first and propose a static HTML or app route
later. The page renders durable state. It is not a separate source of truth.

Information architecture:

- Header: repo, branch, mode, last sweep, required owner action.
- Safety strip: autonomy enabled, dry-run, auto-merge, merge cap, budget cap, branch
  protection, code owners, trusted-author status.
- Queue board: queued, claimed, making, checking, escalated, merge-ready, done.
- Lease table: owner, item, expiry, stale flag, release action if authorized.
- Gate panel: latest required checks, status, duration, flaky signal.
- Protected-path panel: touched protected files and the approval each needs.
- Cost panel: model and provider, local versus remote calls, budget consumed, retries
  avoided by cache or reuse.
- Learning queue: staged lessons, age, evidence, promote or prune action.
- Decision queue: owner questions with a recommendation and a default of hold.
- Audit timeline: dry-run decisions, comments, labels, pull requests, merges, escalations.

Controls: a kill switch, a mode switch with prerequisites shown, a dry-run button, cap
editors, a trusted-author editor that requires owner approval, a protected-path editor where
additions are allowed and removals require owner approval, and promote or prune learning
actions.

UX requirements: operational and scannable, host tokens and components, accessibility first
(keyboard, visible focus, labels on icon buttons, contrast at least 4.5 to 1, color never the
only signal), responsive from 375px up with no horizontal scroll, stable layout with no shift,
explicit loading and empty and error and permission-denied states, subtle motion that respects
reduced-motion, and confirmation on every destructive control.

A reference implementation of this spec lives at `apps/control-panel/`, built against a
`@modonome/design-system` component library at `design-system/`. Read
`apps/control-panel/README.md` before building another one from scratch.
