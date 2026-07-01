# Modonome control-panel design system

This is the component library for Modonome operator surfaces: screens that monitor and
configure the governed-autonomy engine. Build admin and dashboard UI with these parts. The
look is dark, calm, and premium: teal accents on a deep navy ground, mono for labels and
numbers, Space Grotesk for headings.

## Wrapping and setup

Every screen must render inside an element carrying the `mdn-root` class. `AppShell` adds it
for you, so wrapping a screen in `AppShell` is the normal path. `mdn-root` establishes the
dark ground, the body font, and the token custom properties that every component inherits.
Without it, components fall back to browser defaults and look unstyled.

There is no theme provider and no React context to set up: styling is plain CSS driven by
custom properties, so any component works as long as `mdn-root` is an ancestor and the design
system stylesheet is loaded. Brand fonts (Space Grotesk, IBM Plex Sans, IBM Plex Mono) load
from a font host through an `@import` in the stylesheet, so they appear automatically.

```jsx
<AppShell
  nav={[{ id: "overview", label: "Overview", icon: "gauge" }]}
  activeNav="overview"
  onNavigate={setActive}
  topBar={<ArmingStateBadge mode="armed" size="md" />}
>
  <div className="page">
    <h1 className="page-title">Overview</h1>
    <div className="grid grid-4">
      <MetricTile label="Arming mode" value="Armed" icon="shield" tone="ok"
        hint="Armed can open and merge changes once every gate passes." />
    </div>
    <Card title="Model spend" help="Local versus remote calls and budget consumed.">
      <CostPanel cost={cost} />
    </Card>
  </div>
</AppShell>
```

## The styling idiom

This is a token and CSS-class system. You do not pass class names to library components: each
one styles itself from its own `mdn-*` classes. For your own layout glue, use the CSS custom
properties directly and a few base utility classes. Do not invent color or spacing values;
reference the tokens.

Token families (names are stable, values live in the stylesheet):

- Color: `--mdn-primary` (teal), `--mdn-info` (CI blue), `--mdn-owner` (owner gold),
  `--mdn-danger`; grounds `--mdn-bg`, `--mdn-bg-alt`, `--mdn-bg-deep`; surfaces
  `--mdn-surface-1`, `--mdn-surface-2`, `--mdn-surface-3`; text `--mdn-heading`, `--mdn-text`,
  `--mdn-text-2`, `--mdn-text-3`, `--mdn-muted`; borders `--mdn-border`, `--mdn-border-strong`,
  `--mdn-border-teal`.
- Type: `--mdn-font-heading`, `--mdn-font-body`, `--mdn-font-mono`; sizes `--mdn-text-xs`
  through `--mdn-text-3xl`.
- Space: `--mdn-space-1` through `--mdn-space-8`. Radius: `--mdn-radius-sm`, `--mdn-radius-md`,
  `--mdn-radius-lg`, `--mdn-radius-pill`. Elevation: `--mdn-shadow-glow`, `--mdn-shadow-card`.
- Semantic status: `--mdn-mode-*` (arming modes), `--mdn-state-*` (work-item states),
  `--mdn-tier-*` (risk tiers 1 through 4). Status is always paired with an icon and a label,
  never carried by color alone. Use `StatusPill` for status, never a bare colored dot.

Base utility classes you may use in your own markup: `mdn-row`, `mdn-stack`, `mdn-grid`,
`mdn-label` (mono uppercase caption), `mdn-heading`, `mdn-mono`, `mdn-divider`.

## Where the truth lives

Read the bound stylesheet and its imports for the full vocabulary: `styles.css` pulls in the
token definitions and every component sheet. Each component ships a `.prompt.md` (usage) and a
`.d.ts` (the exact props). Read those before composing a component.

## Domain building blocks

Beyond primitives (`Button`, `StatusPill`, `Card`, `Tooltip`, `HelpHint`, `Input`, `Select`,
`Toggle`, `Slider`, `NumberField`, `Table`, `Drawer`, `Modal`, `ConfirmDialog`, `Tabs`,
`ProgressMeter`, `Sparkline`, `MetricTile`, `EmptyState`, `LoadingState`, `ErrorState`,
`PermissionDeniedState`), the library ships governance components that map one to one onto the
engine: `AppShell`, `ModeSwitcher` (host versus self-governance), `ArmingStateBadge`,
`ActivationLadder`, `SafetyStrip`, `QueueBoard`, `WorkItemCard`, `WorkItemDrawer`, `LeaseTable`,
`GatePanel`, `ProtectedPathRow`, `CostPanel`, `LearningCard`, `DecisionCard`, `AuditTimeline`,
`IdentityChip`, `RoleBadge`, `TierBadge`. Every label and section should carry a `HelpHint`,
and every destructive control should confirm through `ConfirmDialog`.
