# Control panel: modes, and what you can and cannot do

The control panel (`apps/control-panel/`) is the operator surface for modonome. This page
explains, for someone who has the repo locally, how to run it and exactly what it lets you
change in each mode. The short version:

> **Connect a host repo to evolve it freely. Modonome's own governance is view-only unless
> you are a code owner. Either way, the panel can never arm the engine.**

## How you get it

The panel is not part of the npm package. `package.json`'s `files` list ships `bin`,
`prompts`, `schemas`, `scripts`, and the rest, but not `apps/`. So:

- `npx modonome ...` or installing the package gives you the **CLI only** (`dry-run`,
  `scaffold`, `validate`, `queue`, `arm`, `report`). No panel.
- To run the panel you clone this repository and start its dev server:

  ```bash
  npm install --prefix design-system
  npm install --prefix apps/control-panel
  cd apps/control-panel && MODONOME_PANEL_WRITE=1 npm run dev   # http://localhost:5180
  ```

This is a developer-run local tool today (Milestone 3, in progress). A `build` produces a
static SPA with no server behind it, which can only show demo data.

## The two things that decide what you see and can do

### 1. Mode: which `.modonome` am I looking at

| Mode | Points at | Meaning |
| --- | --- | --- |
| **Self-governance** ("Modonome", product mode) | This repo's own `.modonome/` | Modonome governing itself. Sensitive: these are the tool's real levers. |
| **Host repo** (default) | `examples/demo-app/.modonome/` | A bundled demo, so you see the panel populated out of the box. |
| **Host repo** (connected) | Any path you type into the "Connect" field on Overview | The only way to point the panel at your own repo. It sends that path to the server. |

So the normal way to drive the panel against your own project is: run the panel, switch to
host mode, and Connect to `/path/to/your/repo`. Self-governance is for working on modonome
itself.

### 2. Writability: two tiers, one gate

By default the panel is read-only even when live. Writes need the dev server started with
`MODONOME_PANEL_WRITE=1`. On top of that, the write path is tiered by target:

| Target of the write | Requirement |
| --- | --- |
| A connected **host repo** | `MODONOME_PANEL_WRITE=1`. That is all. Evolve it freely. |
| This repo's **own** `.modonome` (self-governance) | `MODONOME_PANEL_WRITE=1` **and** your local git identity resolves to a GitHub handle that `CODEOWNERS` lists as an owner of `.modonome/config.yaml`. |

The self-governance gate is enforced on the **resolved filesystem path**, not on the mode
label the browser sends. Relabeling a product write as "host" while pointing it at the
product's own `.modonome` is refused the same way. A non-owner sees self-governance as
view-only, with the reason stated in the read-only banner.

Fail-closed: if there is no `CODEOWNERS`, no owner is declared for the config, or the local
git identity is not a GitHub noreply address that maps to a handle, self-governance stays
read-only. Host repos are never affected by this gate.

## What the gate is, and what it is not

This is an honest local guardrail, not a cryptographic boundary. Whoever launches the dev
server controls the machine and could set any git identity, so the gate cannot stop a
determined local operator. What it does do is prevent the common accident: a person who
cloned modonome to adapt it for their own use quietly editing the tool's **own** governance
(above all, turning autonomy on itself) without realizing that is what product mode does.

The boundaries with real teeth live elsewhere, and the panel respects both:

- **Arming stays a two-key action.** Full autonomy needs `autonomy_enabled` in config **and**
  `MODONOME_ARMED` in the CI or harness environment. The panel can set neither the CI key nor
  arm the engine. Flipping `autonomy_enabled` from the panel, even as an owner, is inert on its
  own.
- **Landing a self-governance change on `main` still goes through modonome's own loop.** A panel
  write edits your working tree; branch protection plus `CODEOWNERS` review plus the CI gates
  are what actually ratify it. The local owner check mirrors that merge-time boundary as a fast
  pre-check, so a non-owner does not spend effort on a change that could not merge anyway.

## What you can do (live, write enabled, and for self-governance, as an owner)

- **Settings.** Full CRUD on `config.yaml`: scalar levers, arrays (trusted authors,
  protected paths), and the nested maps (roles, models, providers, runners). Edits preserve
  the file's comments and are schema and safety validated before they land.
- **Work Queue.** Full CRUD on work items: create, edit (type, assigned role, allowed edit
  set, gates, caps), and delete. Delete is refused for any in-flight item until its lease is
  released. State, owner, and lease themselves move only through the lease and transition
  machinery, never a metadata edit here.
- **Arming and Safety.** Flip the governance requirement toggles (distinct maker and checker,
  branch protection required, and so on).
- **Learnings.** Prune a staged learning.

## What you cannot do from the panel, by design

| Cannot | Why |
| --- | --- |
| Arm the engine | `MODONOME_ARMED` is a CI or harness secret, never set from here. Two keys, and the panel holds neither. |
| Change self-governance without being a code owner | The tier-two gate above. |
| Run the maker or checker loop | The panel observes and configures. Executing a cycle is `run-cycle.mjs` or the CI workflow. |
| Change a work item's state, owner, or lease directly | Those move only through the lease and transition machinery. |
| Promote a learning, resolve a decision, or approve a protected path | These need authored human content (a gate, an actual answer), which a one-click button must not fabricate. They stay local acknowledgments. |
| Edit anything without the write flag | Read-only is the default in every mode. |
| Do anything live from a static build | `npm run build` is a client-only SPA with no server, so it can only show demo or fixture data. |

## Live versus demo data

Every screen shows a **Live** or **Demo data** pill. Demo means the API did not respond (a
static build, or a host path not connected yet) and you are looking at bundled fixtures in
`src/state/fixtures/`. The panel never blends real and demo data without saying so.

## Where this is enforced in code

- `apps/control-panel/server/ownership.mjs`: parses `CODEOWNERS`, maps the local git identity
  to a handle, decides self-governance ownership. Fail-closed throughout.
- `apps/control-panel/server/api.mjs`: `writeGate()` is the single decision for both the 403
  and the `source.writable` the UI reads, keyed off the resolved path via `isSelfGovernance()`.
- `apps/control-panel/server/modonomeWriter.mjs`: the actual file writes, each already schema
  and safety validated before touching disk.
