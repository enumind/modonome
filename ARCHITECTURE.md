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

## The agent loop

The core cycle runs inside the agent on each turn. The ratchet is intentionally outside
this scope: it runs in CI on every pull request and cannot be modified by the agent.

```mermaid
flowchart LR
  queue[["Durable work queue\n(.modonome/work-items/)"]]
  packet["Work packet\n(claimed, leased)"]
  maker["Maker\none packet, test-fenced"]
  checker["Checker\nindependent pass"]
  gates["Gates\nall must pass"]
  owner["Owner review\n(CODEOWNERS)"]
  merge["Merge authority\nlands only when all gates pass"]
  repo[("Host repo")]
  learn["Staged learnings\n(LEARNINGS.md)"]

  queue -->|claim and lease| packet
  packet --> maker
  maker -->|diff and rationale| checker
  checker -->|rework below cap| maker
  checker -->|approved| gates
  gates -->|Tier 2: protected path| owner
  gates -->|Tier 1: eligible| merge
  owner -->|approved| merge
  merge -->|pull request| repo
  gates -->|evidence| learn
  learn -->|owner promotes| repo
```

The ratchet (`guard-ratchet.mjs`) runs as a separate CI step, outside agent scope, and
blocks merge if any quality threshold regresses. See the integration diagram below for
where it sits.

## Integration points

Modonome needs no central service. It reads and writes only through surfaces the host repo
already has: files, CI, issues, and pull requests. The trust boundary between agent scope
and CI scope is a security invariant: the ratchet and validators run in CI where the agent
cannot modify them.

```mermaid
flowchart TB
  subgraph host ["Host repo (any stack or runtime)"]
    ci["CI pipeline\n(Actions, Jenkins, GitLab, ...)"]
    bp["Branch protection\n+ code owners"]
    sd[".modonome/\nconfig  queue  decisions  learnings"]
  end

  subgraph harness ["Harness (loads the prompt)"]
    h1["Coding agent"]
    h2["CI job"]
    h3["Human session"]
  end

  subgraph engine ["Modonome engine  [AGENT SCOPE]"]
    adopt["Adopt\nread instructions, CI, code owners"]
    sweep["Dry-run sweep\npropose bounded work"]
    maker["Maker\none packet, test-fenced"]
    checker["Checker\nindependent pass"]
    gates["Gates\nall must pass before PR"]
    merge["Merge authority"]
  end

  ratchet["Anti-gaming ratchet\nguard-ratchet.mjs\n[CI SCOPE -- outside agent]"]

  harness -->|loads prompt| engine
  sd <-->|durable state| engine
  host -->|instructions, gates, code owners| adopt
  adopt --> sweep
  sweep --> maker
  maker --> checker
  checker --> gates
  gates --> merge
  merge -->|opens pull request| host
  ci -->|runs on every PR| ratchet
  ratchet -->|blocks merge on regression| bp
  bp -->|enforces protection rules| merge
```

The engine is stack-independent. It normalizes work by intent, evidence, and interface
contract rather than by language or framework. The `ENTERPRISE.md` adoption table lists
ten estate types: product app repos, monorepos, microservice estates, mainframe, SAP,
Oracle, Salesforce, ServiceNow, low-code or RPA, and data or BI.

## Adoption (runs once, not per cycle)

Adoption is a one-time initialization pass, not a step in the ongoing agent loop. Once
the adoption map exists and `state` transitions past `adopting`, this pass is skipped.

```mermaid
stateDiagram-v2
  [*] --> pre_adoption : repo has no .modonome/
  pre_adoption --> adopting : scaffold run
  adopting --> dry_run : adoption map written
  dry_run --> armed : owner sets autonomy_enabled true
  armed --> governed : first cycle completes
  governed --> governed : steady-state cycles
  governed --> suspended : owner disables
  suspended --> governed : owner re-enables
```

## Learning and self-improvement pipeline

The engine has a defined self-improvement loop that tightens quality over time without
bypassing owner control.

```mermaid
flowchart LR
  signal["Correction signal\ngate failure  review fix  rework"]
  capture["Follower captures\none generalized, evidence-backed lesson"]
  stage["Stage in LEARNINGS.md\nfingerprinted  dated  capped at 20"]
  promote["Owner promotes\ninto canonical rules, config, or tests"]
  gate["Add deterministic gate\nwhen one fits"]

  signal --> capture --> stage --> promote --> gate
  gate -->|raises the floor| signal
```

Market and standards scans are handled by a dedicated market-researcher role and are off
by default. When enabled, sourced findings flow to the steward role, which scores and
routes proposals. Net-new claims need owner approval before any roadmap change. The
proposal priority score (`safety + user_value + repo_fit + reuse + evidence - effort -
blast_radius - uncertainty`) surfaces the highest-value, lowest-risk improvements first.

## Trust boundaries and security invariants

Two boundaries are enforced structurally, not by convention:

**CI boundary.** The ratchet and validators (`check-style.mjs`, `check-drift.mjs`) run in
CI on every PR. The agent can never modify them mid-flight because the CI job runs from
the base branch, not the PR head for these scripts. Regressions block merge automatically.

**CODEOWNERS boundary.** Any file in `scripts/`, `bin/`, `schemas/`, `templates/`,
`prompts/`, or `.github/` requires a human CODEOWNER approval before merge. The
`touches_protected_path: true` field in a work-item JSON is the signal; the agent checks
it before claiming the item and escalates rather than merging autonomously.

## Why this factoring

- **One source of truth.** The config schema defines the levers. The prompt and templates
  follow it. `check-drift.mjs` fails the build if they disagree, so the four
  representations cannot drift apart.
- **Code over prose for anything load-bearing.** The ratchet, validators, and drift guard
  run in CI, outside the agent, so the guarantees hold even under prompt injection.
- **Small context per turn.** A harness loads the core plus only the module it needs. The
  bundle stays available for portability.

## Calibration

The design favors verified adoption over publication count, independent validation over
self-reported scores, local repo gates over central claims, and lineage records over
hidden memory. These choices come from practical experience with autonomous coding loops
and from research on self-evolving agent systems, which repeatedly shows that unvalidated,
volume-driven sharing degrades quality. Modonome keeps every concrete change behind a
local gate.
