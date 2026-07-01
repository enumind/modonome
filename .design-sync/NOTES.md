# Design-sync notes for @modonome/design-system

Repo-specific facts for future syncs. Read this before re-running.

## Build and layout

- The design system is a subpackage at `design-system/`, not the repo root. Run the converter
  from the repo root with explicit paths:
  ```sh
  npm --prefix design-system run build
  node .ds-sync/package-build.mjs --config .design-sync/config.json \
    --node-modules design-system/node_modules \
    --entry design-system/dist/index.es.js --out ./ds-bundle
  node .ds-sync/package-validate.mjs ./ds-bundle
  ```
- `cfg.buildCmd` is `npm --prefix design-system run build`. It runs gen-barrel (regenerates
  `src/index.ts` and `src/components.gen.css` from the component directories), then esbuild for
  the JS bundle and the CSS, then tsc for the declaration tree.
- The component list is auto-discovered: each directory under `design-system/src/components/`
  with an `index.ts` is exported by the generated barrel. To add a component, add a directory;
  no shared file edits.
- `react` and `react-dom` are installed into `design-system/node_modules` (peer deps) so the
  converter can vendor React and resolve the bundle externals.

## Fonts

- Brand fonts (Space Grotesk, IBM Plex Sans, IBM Plex Mono) load from Google Fonts via an
  `@import` at the top of `src/tokens/tokens.css`. Validate reports `[FONT_REMOTE]`, which is
  informational, not a failure. This matches how modonome.com itself serves the fonts. The
  render check is slower because each preview waits on the remote font fetch.
- If a fully self-contained bundle is ever needed, download the woff2 files under
  `design-system/fonts/`, add `@font-face` rules, and drop the remote `@import`.

## Preview scope (current state)

- This first pass ships FLOOR CARDS for all 44 components. They are honest and fully
  functional: the bundle, tokens, and every component render, but the preview cards are the
  typographic baseline rather than authored compositions.
- To make the picker premium, author `.design-sync/previews/<Name>.tsx` for the hero
  components (start with ArmingStateBadge, ActivationLadder, QueueBoard, WorkItemCard,
  SafetyStrip, GatePanel, CostPanel, MetricTile, StatusPill, Card, Button, LearningCard,
  DecisionCard, AuditTimeline), rebuild, capture, and grade per the non-storybook skill. The
  app screens under `apps/control-panel/src/screens/` are the composition source to port from.

## Component groups

- All 44 components currently land in the single group "general" because no per-component docs
  supply a `category`. To group them in the picker (Primitives, Forms, Governance, and so on),
  add per-component stub docs with `category` frontmatter and point `cfg.docsMap` at them, or
  add a `docsDir`.

## Upload (action required)

- The upload leg was NOT run: the DesignSync tool needs design-system authorization that this
  environment could not grant (it reported that the design login needs an interactive terminal,
  or in the web app that Claude Design's "Send to Claude Code Web" seeds the project). To
  finish: authorize, then create a new design-system project and run the incremental upload
  from `ds-bundle/`. Record the resulting `projectId` in `.design-sync/config.json`.

## Re-sync risks

- The bundle is committed as sources only: `ds-bundle/` and `.ds-sync/` are gitignored and
  regenerated, so a fresh clone must run the build before any re-sync.
- Font families are remote. If the font host changes or is blocked, renders fall back silently
  to system fonts. There is no local copy to fall back to.
- Grades and previews do not exist yet (floor cards only), so the first authored-preview sync
  will verify from scratch. That is expected.
