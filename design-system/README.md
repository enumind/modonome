# @modonome/design-system

Brand tokens, primitives, and governance-domain React components for modonome operator
surfaces. Consumed by `apps/control-panel` from source; see
[`.design-sync/conventions.md`](../.design-sync/conventions.md) for the token vocabulary and
composition idiom, and [`../apps/control-panel/README.md`](../apps/control-panel/README.md)
for the app that composes these components into real screens.

## Build

```bash
npm install
npm run build       # esbuild ESM bundle + CSS + fonts, then tsc for dist/*.d.ts
npm run typecheck
```

`dist/` is gitignored and generated; a fresh clone must run `npm run build` before anything
that imports the built package (the design-sync converter, a published consumer). The
control-panel app instead aliases straight to `src/index.ts`, so it never needs `dist/`.

## What is in here

- `src/tokens/` - CSS custom properties (`--mdn-*`) and their typed TS mirror.
- `src/base.css`, `src/styles.css` - resets and the stylesheet entry every component
  sheet rolls into.
- `fonts/` - self-hosted Space Grotesk, IBM Plex Sans, and IBM Plex Mono (latin subset),
  so no component ever depends on a network font request.
- `src/components/*/` - one directory per component (`Component.tsx`, `.css`, `index.ts`).
  `gen-barrel.mjs` (run by `build`) discovers every directory automatically and regenerates
  `src/index.ts` and `src/components.gen.css`; adding a component never means editing a
  shared file by hand.

Primitives (`Button`, `Card`, `StatusPill`, `Tooltip`, `HoverCard`, `Carousel`, form
controls, `Tabs`, `Drawer`, `Modal`, the loading/empty/error/permission states, `Toast`)
compose with domain components that map one to one onto the engine
(`AppShell`, `ArmingStateBadge`, `ActivationLadder`, `QueueBoard`, `WorkItemCard`,
`GatePanel`, `CostPanel`, `LearningCard`, `DecisionCard`, `AuditTimeline`, `ConceptTile`,
and more). Every component ships a `.prompt.md` usage note and a `.d.ts` alongside its
source, read by the design-sync converter when this package is synced to a Claude Design
project.
