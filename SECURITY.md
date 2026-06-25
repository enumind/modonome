# Security model

Modonome ingests untrusted text (issues, pull requests, logs, web pages, package metadata)
and can take actions in a repo. The security model keeps that safe by holding the controls
in code that runs outside the agent.

## The trust boundary is external

- The arming levers (`autonomy_enabled`, `auto_merge`, `max_merges_per_day`,
  `repo_network_enabled`) are gated by the `MODONOME_ARMED` environment variable, enforced
  at runtime in `bin/modonome.mjs`. With the variable unset, `autonomy_enabled` is forced to
  false regardless of what the config file says. Arming requires the environment variable,
  which lives outside any file the engine can write.
- `bin/`, `prompts/`, `schemas/`, `scripts/`, `templates/`, and `.github/` are owner-reviewed
  through CODEOWNERS. A human owner approves any change that would widen caps, add a trusted
  author, or alter the ratchet.
- The anti-gaming ratchet and the house-style linter run in CI from a trusted base-branch
  copy, and the config and packet validators and the drift guard run in CI under CODEOWNERS
  protection. The agent's run stays clear of the result.

## Complementary controls

Modonome runs alongside the security tooling you already have. Pull requests it opens flow
through your existing SAST, DAST, secret scanning, and dependency review unchanged, and the
anti-gaming ratchet adds one more required check beside them. Arming reads from your existing
secrets store through an environment variable, and protected-path review reuses your
CODEOWNERS. Modonome extends these controls and works within them.

## Untrusted input

- External text is data, not instructions.
- Trusted authorship is verified from platform metadata, not from text in an issue body.
- Fork pull requests, first-time contributors, and bots are untrusted unless repo policy says
  otherwise.
- The engine builds URLs, shell commands, and package names only after allowlist
  validation. A turn that read untrusted text makes outbound calls only to the allowlist.

## Secrets

- Secrets stay out of model-visible prompts and logs.
- The engine keeps secret files out of model context.
- Dry-run mode prefers read-only tokens.

## Cross-repo sharing

The cross-repo network is off by default. When enabled, a packet is published only after
`scripts/validate-knowledge-packet.mjs` passes. That script scans for secrets, personal data,
internal hostnames, code blocks, and identifier formats and blocks the publish when it finds
them. Classification defaults to restricted. Repo identity is hashed and run identifiers are
stripped unless an owner approves otherwise. A central catalog is out of scope for version 1.

## Supply chain

- Dependency changes go to human review and land only with owner approval.
- Package names surfaced from advisories are checked against a registry allowlist before any
  install is proposed.
- Vendored copies pin a release tag. Upgrades preserve host config and leave an engine
  disarmed unless an owner arms it.

## Threat model

| Actor | Capability | Defeated by |
|-------|-----------|-------------|
| Malicious issue poster | Inject instructions into issue body to redirect engine behavior | External text is treated as data. Trusted authorship is verified from platform metadata, not from issue content. Outbound calls blocked after a turn that read untrusted text. |
| Compromised dependency | Introduce malicious code through a supply-chain update | Dependency changes require human review. Dependency PRs wait for an owner before merge. Package names from advisories checked against allowlist before any install is proposed. |
| Rogue MCP client | Call MCP tools to weaken ratchet, bypass config, or exfiltrate diffs | MCP tools run validators and the ratchet externally; they cannot modify them. Temp files are removed after each call. diff_path inputs are validated against an extension allowlist and must be regular files. |
| Agent self-modification | Edit ratchet, validators, or drift guard to weaken its own controls | CODEOWNERS gates these files. The ratchet and the house-style linter run in CI from a base-branch copy, and the validators and drift guard run in CI under CODEOWNERS protection. |
| Prompt injection via PR body or file content | Override engine behavior through crafted content in reviewed files | Trusted authorship verified from platform metadata. The engine treats instructions in PR bodies or file content as data only. |

## Reporting

Open a [private security advisory](https://github.com/nateshpp/modonome/security/advisories/new)
on the GitHub repository. Please keep vulnerability reports to the private advisory channel.
