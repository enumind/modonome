# Architecture

Modonome is a repository-local control loop. A master prompt defines it. Templates, schemas,
and scripts make its rules executable. It runs beside a host repo and works through ordinary
surfaces: files, issues, pull requests, CI checks, code owners, and status docs.

## The pieces

- The prompt (`prompts/`). A cacheable core (`modonome.core.md`) holds the invariants, the
  config levers, the operating modes, and the security rules. On-demand modules cover the
  adoption pass, the state machine, the roles, the gates, the control panel, and the network.
  `modonome.bundle.md` is the generated single-file version for harnesses that want one file.
- The templates (`templates/.modonome/`). The seed state files a host copies once: config,
  status, decisions, learnings, network, control panel, and a version marker.
- The schemas (`schemas/`). The machine-checkable contracts for config, work items, the
  adoption map, knowledge packets, and metrics. The config schema is the source of truth for
  the lever set.
- The scripts (`scripts/`). The enforcing code: build the prompt bundle, scaffold state, run
  a dry-run sweep, run the anti-gaming ratchet, validate config and packets, migrate config,
  check house style, and guard against drift.

## The loop

```mermaid
flowchart LR
  prompt[Master prompt] -->|defines| engine[Repo-local engine]
  repo[Host repo] -->|instructions, code, tests, CI| adopt[Adopt]
  adopt -->|adoption map| mode[Mode and config]
  mode -->|safe defaults| queue[Durable work queue]
  queue -->|claim and lease| packet[Work packet]
  packet --> maker[Maker]
  maker -->|diff and rationale| checker[Checker]
  checker -->|rework below cap| maker
  checker --> gates[Gates and ratchet]
  gates -->|protected or risky| owner[Owner review]
  gates -->|eligible| merge[Single merge authority]
  owner -->|approved| merge
  merge -->|lands| repo
  gates -->|evidence| learn[Staged learning]
  learn -->|owner promotes| repo
  queue --> panel[Control panel]
```

## Why this factoring

- One source of truth. The config schema defines the levers. The prompt and templates follow
  it. `check-drift.mjs` fails the build if they disagree, so the four representations cannot
  drift apart.
- Code over prose for anything load-bearing. The ratchet, the validators, and the drift guard
  run in CI, outside the agent, so the guarantees hold even under prompt injection.
- Small context per turn. A harness loads the core plus only the module it needs. The bundle
  stays available for portability.

## Calibration

The design favors verified adoption over publication count, independent validation over
self-reported scores, local repo gates over central claims, and lineage records over hidden
memory. These choices come from practical experience with autonomous coding loops and from
the research on self-evolving agent systems, which repeatedly shows that unvalidated, volume-
driven sharing degrades quality. Modonome keeps every concrete change behind a local gate.
