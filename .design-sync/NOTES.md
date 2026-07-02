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

- Brand fonts (Space Grotesk, IBM Plex Sans, IBM Plex Mono) are SELF-HOSTED. The latin-subset
  woff2 files live under `design-system/fonts/` with `fonts.css`, which `src/styles.css`
  imports first. The esbuild CSS build copies them into `dist/fonts/` with stable names
  (`assetNames: "fonts/[name]"`), and `cfg.extraFonts` copies them into `ds-bundle/fonts/`.
  Validate no longer reports `[FONT_REMOTE]`, and renders are fast (no network round trip).
- To refresh the fonts, re-run the vendoring: fetch the Google Fonts CSS with a browser user
  agent, keep the `/* latin */` `@font-face` blocks, download their woff2 into
  `design-system/fonts/`, and regenerate `fonts.css` (one `@font-face` per file, stable names).

## Preview provider

- The DS is dark-themed (light text on a dark ground), so previews render invisibly on a bare
  white card without the `mdn-root` wrapper. `MdnRoot` (a thin wrapper that applies `mdn-root`
  plus the dark background) is wired as `cfg.provider`, so every preview renders on the correct
  ground. `MdnRoot` is excluded from the picker via `cfg.componentSrcMap` (it stays a bundle
  export used only as the provider).

## Preview scope (current state)

- All 44 components have AUTHORED previews under `.design-sync/previews/`, graded good locally
  against the absolute rubric (styled, complete, plausible). The render check is clean (0 bad,
  0 thin, 0 floor cards). Overlay components (Drawer, Modal, ConfirmDialog, WorkItemDrawer) and
  the full-screen AppShell use `cfg.overrides.<Name>.cardMode = "single"` with a viewport.
- The app screens under `apps/control-panel/src/screens/` and the fixtures under
  `apps/control-panel/src/state/fixtures/` are the composition source the previews port from.
- Grades live in the gitignored `.cache/`; they become durable only via the upload's
  `_ds_sync.json` anchor. Until the first authorized upload, a re-sync re-verifies from scratch,
  which is fast now that fonts are local.

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
