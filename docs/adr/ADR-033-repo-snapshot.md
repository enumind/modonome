# ADR-033: Repo snapshot

Status: Accepted

## Context

Coding agents rebuild repository context on almost every turn by re-reading files. That is
slow, token-expensive, and non-deterministic. Modonome already reads a host repo for
adoption (stack, protected paths, git churn), but it had no compact, verifiable
representation an agent could load instead of walking the tree. The need is a shared
artifact that captures structure, public API, and status, stays reliable under change, and
updates automatically.

Three constraints shaped the design:

1. Zero runtime dependencies and portability (ADR-028). A real multi-language parser such as
   tree-sitter would add native dependencies, so the core cannot rely on one.
2. Determinism. The artifact is committed and checked in CI, so identical inputs must produce
   identical bytes.
3. Safety. Anything entering the artifact may be handed to a model, so secrets must be
   redacted and generation must stay read-only.

## Decision

Ship `modonome snapshot`, a utility that writes a tiered artifact under
`.modonome/snapshot/`:

- Tier 0 `signature.json`: a small fingerprint holding the Merkle root, stack, size,
  language mix, entrypoints, commands, protected paths, and governance posture. An unchanged
  `merkle_root` means an unchanged repo.
- Tier 1 `map.json` and `map.md`: modules with a one-line purpose, public API signatures
  (never bodies), import edges, and an attention ranking by degree centrality and PageRank.
  `map.md` is the LLM-native rendering; `map.json` is the machine form. The ranking uses only
  content-derived signals so the committed artifact stays deterministic across commits; git
  churn is a live overlay reserved for a later phase rather than baked into the map.

Design choices:

- Reliability comes from a content-addressed Merkle tree over files. `snapshot --verify`
  recomputes the root from disk; `snapshot --check` fails or warns when the committed
  artifact is stale, mirroring the drift and evidence gates.
- Compression comes from extracting signatures rather than bodies, a per-repo path and symbol
  dictionary referenced by short anchors, and a token budget per tier. Anchors resolve to an
  exact file and line so an agent can cite and act without re-reading.
- Language extraction uses a dependency-free, pluggable adapter registry (JavaScript and
  TypeScript plus a generic fallback in the first release). A tree-sitter backed adapter can
  register later without any core change, keeping portability intact.
- Secrets are redacted through the shared secret-pattern set before any content is written. A
  balanced default keeps example emails and fenced code; `--strict-redact` applies the full
  set.
- The freshness gate mode and signing are host-admin choices in `.modonome/config.yaml`
  (`snapshot.ci_mode`, `snapshot.sign`), defaulting to warn and unsigned so adoption is low
  friction. A git pre-commit hook regenerates the snapshot so it stays current.

Discovery is layered: a root `llms.txt`, a prompt module `prompts/modules/snapshot.md`, and
an MCP tool `modonome_snapshot` that returns a tier or a verify report on demand.

## Consequences

- Agents get repository understanding and runnable status from a small artifact instead of a
  full-tree read, which cuts tokens and turn latency.
- The artifact is diffable in pull requests and verifiable in CI, so drift is visible rather
  than silent.
- Heuristic extraction is approximate. Signatures are advisory context; anchors always
  resolve to ground truth in the file. The registry leaves an exact-parser upgrade path.
- Because this tool reads arbitrary, potentially untrusted repositories, every code path that
  touches repo-controlled input (ignore-file patterns, cached git revisions, walked file
  names) is hardened against that repo acting maliciously: the ignore-pattern compiler
  collapses adjacent wildcards to avoid a polynomial ReDoS, git revision values read from the
  local cache or `--since` are validated before use to avoid git argument injection, and
  per-file maps keyed by raw paths use `Object.create(null)` to avoid prototype pollution via
  a file literally named `__proto__`. `scaffold`'s `AGENTS.md` creation uses an atomic
  exclusive write to avoid a check-then-write race.
- Regeneration is incremental: a local gitignored cache (`.modonome/cache/`) plus git change
  detection re-reads only changed files, so cost scales with the change, not the repo size,
  while output stays byte-identical to a full rebuild (`--full` forces the latter). Adoption
  (`scaffold --write`) turns consumption on by default: it generates the first snapshot,
  installs a host pre-commit hook, and adds an `AGENTS.md` pointer when none exists, never
  overwriting host files.
- Dependency-free heuristic adapters cover JavaScript/TypeScript, Python, Go, Java, and a
  generic fallback, each locked by golden tests. An optional tree-sitter parser is available
  via `--parser tree-sitter` or `snapshot.parser`: it is loaded lazily and only when installed,
  falls back to the heuristic with a warning otherwise, and is never a hard dependency. Because
  the parser choice changes extraction output, the committed snapshot always uses the heuristic
  default so it stays reproducible across contributors; tree-sitter is for on-demand richer
  reads or a host that standardizes on it.
- Later phases add Tier 2 deep shards, signed delta packets, graph-backed snapshot queries,
  and a git-churn attention overlay surfaced on demand rather than committed. These are
  deferred so this change stays deterministic and low-risk.
