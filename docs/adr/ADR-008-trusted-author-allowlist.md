# ADR-008: Trusted Author Allowlist

**Status:** Accepted
**Date:** 2026-06-24

## Context

CODEOWNERS requires a human approval for Tier 2 files. In practice, the repo owner may
also run the agent under their own GitHub identity (via a PAT or OAuth session), which
means the agent's commits can carry the owner's email. Without an explicit trusted-author
policy, the CODEOWNERS gate could be satisfied by the agent itself on behalf of the owner,
defeating the separation-of-duties guarantee.

## Decision

The following trusted-author rules apply:

1. **Agent identity is distinct.** The agent must commit using the repo's noreply address
   (`<id>+<username>@users.noreply.github.com`) or a dedicated bot account. It must not
   commit using the owner's personal email.
2. **CODEOWNERS approval requires a human review action.** A push from the agent's
   noreply address does not count as a CODEOWNERS approval even if the address is listed
   in CODEOWNERS. Approval requires a human GitHub review action (approve) from a listed
   owner.
3. **Allowlist is explicit.** The `CODEOWNERS` file is the allowlist. Adding a new trusted
   reviewer requires a Tier 2 PR (touching `.github/CODEOWNERS`) and therefore itself
   requires a human CODEOWNERS approval.
4. **Auto-merge on Tier 2 is disabled.** The `auto_merge` config lever must be `false` for
   any item with `touches_protected_path: true`.

## Consequences

- The agent can open Tier 2 PRs but cannot merge them, regardless of how it is
  authenticated.
- The commit-email rule is enforced by the `check-style.mjs` AI signature pattern: if the
  commit message contains a personal email trailers in a way that bypasses this rule,
  the style gate will catch the trailer.
- Owners who want to run the agent under their own session must configure their git
  identity to use the noreply address for agent-initiated commits.
