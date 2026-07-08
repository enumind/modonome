# Support

Modonome is maintained by a small team (see `.github/CODEOWNERS`), not a company with a support
desk. This page states plainly what to expect, so a contributor's expectations match reality
rather than a generic template.

## No SLA

There is no guaranteed response time on issues, pull requests, or AgentProof scenario
submissions. Security reports are the exception: see [SECURITY.md](SECURITY.md) for the
disclosure process and its own timeline. Everything else gets attention as maintainer time
allows, roughly triaged by:

1. A real bug in a shipped capability (the ratchet, the CLI, the Gauntlet, the Action).
2. A gap the [claims audits](docs/audits/) or a user report shows between what is documented and
   what is enforced.
3. A new AgentProof scenario that demonstrates a real gap (see the issue form).
4. Everything else: feature requests, roadmap items, documentation polish.

## What filing something commits the maintainers to

Read this before opening a PR, not after it sits unreviewed:

- **A merged AgentProof scenario is code the maintainers now run in CI on every pull request,
  forever**, until it is deliberately retired. A scenario with a narrow, well-understood attack
  and a clean fixture is a small commitment. A scenario that requires ongoing tuning or produces
  false positives is a standing cost, and it may be reverted rather than iterated on indefinitely.
- **A merged adapter integration** (see [docs/adapters.md](docs/adapters.md)) is a contract the
  maintainers now support: if the external CLI's flags change upstream, someone has to notice and
  fix the integration. Propose an adapter when you are willing to help maintain it, not to add it
  once and move on.
- **A merged doc change** to a root doc (`README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`) is
  subject to the project's own governance gates (`check-md-governance`, the lexicon gate, the
  claims-audit culture): expect requests to cite evidence for any claim, not describe intent alone.

None of this is a barrier meant to discourage contribution. It is the same standard the project
holds its own commits to, stated up front so it is not a surprise.

## Where to go

- **Bug in a shipped capability:** open a bug report issue.
- **A diff that games a gate integrity check and slips past the ratchet:** open an AgentProof
  scenario issue. This is the most valuable kind of report this project can receive.
- **A question about adopting Modonome:** start with [QUICKSTART.md](QUICKSTART.md) and the
  [ADOPTION-GUIDE.md](ADOPTION-GUIDE.md); open a discussion or issue if those do not answer it.
- **A security concern:** follow [SECURITY.md](SECURITY.md). Do not open a public issue for a
  vulnerability.
- **Everything else:** open an issue and be patient. See "No SLA" above.

## Stale issues and PRs

An issue or PR with no maintainer activity and no updates from the author for an extended period
may be closed as stale rather than left open indefinitely. Closed does not mean rejected: reopen
it, or open a new one, if it is still relevant and you can add new information.
