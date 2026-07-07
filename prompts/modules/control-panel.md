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
actions. A connected host repo is freely editable with write mode on; editing modonome's own
governance (self-governance mode) is reserved to a code owner, and arming stays a two-key
action the panel can never complete on its own.

UX requirements: operational and scannable, host tokens and components, accessibility first
(keyboard, visible focus, labels on icon buttons, contrast at least 4.5 to 1, color never the
only signal), responsive from 375px up with no horizontal scroll, stable layout with no shift,
explicit loading and empty and error and permission-denied states, subtle motion that respects
reduced-motion, and confirmation on every destructive control.

A reference implementation of this spec lives at `apps/control-panel/`, built against a
`@modonome/design-system` component library at `design-system/`. Read
`apps/control-panel/README.md` before building another one from scratch.

Placing a new lever or concept: every field added to `schemas/config.schema.json` needs
either a real control or a documented reason it stays unexposed
(`apps/control-panel/exposure.json`); `npm run check:control-panel` fails the build otherwise.
That gate cannot judge *where* something belongs, so decide by intent, not by which screen
happens to be open:

- View, configure, or trigger: a status is VIEW-only, a value the operator sets is CONFIGURE,
  an action the operator invokes once is TRIGGER. Group same-kind controls together.
- Daily or expert: something every operator checks routinely belongs on a primary screen
  (Overview, Arming, Work Queue, Gates, Learnings); something touched rarely belongs in
  Settings, in its own tab by subsystem, not appended to the nearest existing one.
- Live control or reference only: a concept with no single value to set, or one that is
  deliberately not editable from the panel (a CODEOWNERS-gated trust root, a security
  boundary), belongs in the Overview "Key concepts" carousel as reference material, sourced
  from a real file, not as a disabled or fake control.
- Coherence budget: `npm run check:control-panel` also caps controls per screen tab and
  requires a hint on every value-entry control (`scripts/lib/control-panel-audit.mjs` has the
  current numbers). A tab at the cap is a signal to split by intent, not to raise the cap.

When a checker or owner catches an IA problem neither gate catches (the wrong tab, a confusing
grouping, a control that reads unclearly), that is a normal correction signal: stage it in
`LESSONS.md` like any other gate failure or review fix. A lesson promoted from repeated
friction here becomes a new check in `control-panel-audit.mjs`, the same way any other
promoted learning becomes a new deterministic gate.
