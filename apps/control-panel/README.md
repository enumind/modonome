# Modonome control panel

The operator surface for modonome: monitor and configure the governed-autonomy engine,
in **host mode** (modonome installed in a customer repo) or **product mode** (modonome
governing this repository). Built to the information architecture in
[`prompts/modules/control-panel.md`](../../prompts/modules/control-panel.md), the spec of
record for this page.

## Prerequisites

- Node.js 20 or later.
- A repo with `.modonome/` already scaffolded (`npx modonome scaffold .`) if you want to
  point host mode at something real. Product mode reads this repository's own `.modonome/`
  and needs nothing extra.

## Run it

```bash
npm install --prefix ../../design-system
npm install
npm run dev
```

Open `http://localhost:5180`. The dev server reads the real `.modonome` directory: product
mode from this repo, host mode from `examples/demo-app/.modonome` by default, or from any
path you type into the "Connect" field on Overview.

```bash
npm run build      # static production bundle in dist/
npm run preview    # serve that bundle locally on the same port
```

## Live data versus demo data

Every screen shows a **Live** or **Demo data** pill. Live means it is reading real files off
disk through the dev/preview server's `/api/modonome/*` routes (see `server/`); demo means
either the API did not respond (for example, a static `dist/` build with no server behind
it) or a host-mode path has not been connected yet, and you are looking at the bundled
fixtures in `src/state/fixtures/`. The panel never blends the two without saying so.

## Write mode

By default the panel is read-only, even when live. Start the dev server with
`MODONOME_PANEL_WRITE=1` to allow edits:

```bash
MODONOME_PANEL_WRITE=1 npm run dev
```

With write mode on, three actions edit real files, each behind its existing confirm dialog:
saving configuration (patches `config.yaml` in place, preserving comments), releasing a
lease (clears `owner`/`lease_expires_at` on the work-item JSON), and pruning a staged
learning (removes the line from `LESSONS.md`). Promoting a learning, resolving a decision,
and approving a protected path stay local acknowledgments on purpose: those need an operator
to author real content (a gate description, an actual answer), which a one-click button
should not fabricate. `MODONOME_ARMED`, the CI secret that actually arms the engine, is never
set from here; the panel can only report on it.

## Architecture

- `src/screens/` - the six screens (Overview, Arming & Safety, Work Queue, Gates &
  Integrity, Learnings & Decisions, Settings), composed from `@modonome/design-system`.
- `src/state/adapter.ts` - tries the live API first, falls back to fixtures, tags the
  result with its source. `src/state/liveClient.ts` holds the fetch calls;
  `src/state/configDiff.ts` computes what actually changed before a save.
- `server/` - the Vite dev/preview-server plugin: `modonomeReader.mjs` reads `.modonome/*`
  into the same view-model shape the fixtures use, `modonomeWriter.mjs` makes the three
  writes above, `api.mjs` wires both into HTTP routes. This only runs in `dev`/`preview`;
  a `build` output is a plain static SPA with no server behind it.
- `src/content/concepts.ts` - the reference copy behind the Overview "Key concepts"
  carousel, each entry sourced from a real file in this repo.

## Design system

Screens consume `@modonome/design-system` from source (see the sibling `design-system/`
package), so a change there is visible here immediately in dev without a publish step.
