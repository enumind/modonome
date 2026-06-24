# Security model

Modonome ingests untrusted text (issues, pull requests, logs, web pages, package metadata)
and can take actions in a repo. The security model keeps that safe by making the controls
code that runs outside the agent, not promises inside a prompt.

## The trust boundary is external

- The arming levers (`autonomy_enabled`, `auto_merge`, `max_merges_per_day`,
  `repo_network_enabled`) are read from the environment or CI in armed mode. A file the
  engine can write cannot arm it.
- `prompts/`, `schemas/`, `scripts/`, `templates/`, and `.github/` are owner-reviewed through
  CODEOWNERS. The engine cannot widen its own caps, add itself to the trusted-author list, or
  weaken the ratchet without a human.
- The anti-gaming ratchet, the validators, and the drift guard run in CI, where the agent has
  no write access to the result.

## Untrusted input

- External text is data, not instructions.
- Trusted authorship is verified from platform metadata, not from text in an issue body.
- Fork pull requests, first-time contributors, and bots are untrusted unless repo policy says
  otherwise.
- The engine never builds URLs, shell commands, or package names from untrusted content
  without allowlist validation. A turn that read untrusted text makes outbound calls only to
  the allowlist.

## Secrets

- Secrets never enter a model-visible prompt or log.
- The engine refuses to read secret files into model context.
- Dry-run and shadow modes prefer read-only tokens.

## Cross-repo sharing

The cross-repo network is off by default. When enabled, a packet is published only after
`scripts/validate-knowledge-packet.mjs` passes. That script scans for secrets, personal data,
internal hostnames, code blocks, and identifier formats and blocks the publish when it finds
them. Classification defaults to restricted. Repo identity is hashed and run identifiers are
stripped unless an owner approves otherwise. A central catalog is out of scope for version 1.

## Supply chain

- Dependency changes go to human review. The engine does not auto-merge them.
- Package names surfaced from advisories are checked against a registry allowlist before any
  install is proposed.
- Vendored copies pin a release tag. Upgrades preserve host config and never arm an engine.

## Threat model

| Actor | Capability | Defeated by |
|-------|-----------|-------------|
| Malicious issue poster | Inject instructions into issue body to redirect engine behavior | External text is treated as data. Trusted authorship is verified from platform metadata, not from issue content. Outbound calls blocked after a turn that read untrusted text. |
| Compromised dependency | Introduce malicious code through a supply-chain update | Dependency changes require human review. Engine will not auto-merge dependency PRs. Package names from advisories checked against allowlist before any install is proposed. |
| Rogue MCP client | Call MCP tools to weaken ratchet, bypass config, or exfiltrate diffs | MCP tools run validators and the ratchet externally; they cannot modify them. Temp files are removed after each call. The AgentProof suite includes MCP-path adversarial scenarios. |
| Agent self-modification | Edit ratchet, validators, or drift guard to weaken its own controls | CODEOWNERS gates these files. The ratchet, validators, and drift guard run in CI where the agent has no write access to the result. |
| Prompt injection via PR body or file content | Override engine behavior through crafted content in reviewed files | Trusted authorship verified from platform metadata. Instructions in PR bodies or file content are not executed as commands. |

## Reporting

Open a [private security advisory](https://github.com/nateshpp/modonome/security/advisories/new)
on the GitHub repository. Please do not file public issues for vulnerabilities.
