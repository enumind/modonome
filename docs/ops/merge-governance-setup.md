# Merge governance setup (owner action)

The merger in this repo is a deterministic GitHub rule set, not a person and not the
agent that authored a change. The maker only pushes a wave branch and opens a pull
request. GitHub merges it once the required status checks pass. This keeps the loop
autonomous while making it impossible for a maker to merge its own work.

These are one-time settings on `main`. They cost no compute and no tokens. They must be
applied by a repository owner in GitHub settings, because the GitHub administration API
is not reachable from the agent's execution environment.

## 1. Branch protection on `main`

Settings -> Branches -> add a rule for `main`:

- Require status checks to pass before merging. Required checks:
  - `verify` (the `ci` workflow `verify` job: drift, hygiene, self-application,
    learning traceability, promotion readiness, work-item validation, checker
    engagement, release evidence, style, tests, packaging, AgentProof)
  - `ratchet` (the `ci` workflow `ratchet` job: anti-gaming ratchet, loaded from base)
  - `modonome/independent-checker` (the in-loop distinct-model checker's sign-off)
- Require branches to be up to date before merging.
- Do NOT require pull request reviews from a human. A human approval requirement would
  break autonomy. Separation of duties is enforced by the independent checker status and
  by `scripts/check-work-items.mjs`, which fails the merge unless `maker_id != checker_id`
  and `maker_model != checker_model`.
- Include administrators, so the rule set also binds privileged tokens.
- Do not allow force pushes or deletions of `main`.

The agent's token must not have direct push access to `main`. Merge authority lives only
in the rule set.

## 2. Auto-merge

Settings -> General -> Pull Requests:

- Allow auto-merge.

Each wave pull request enables auto-merge. GitHub merges it the moment the required
checks pass. Until branch protection above defines required checks, enabling auto-merge
on a pull request has no effect and the pull request waits.

## 3. Prune merged branches

Settings -> General -> Pull Requests:

- Automatically delete head branches.

On merge, GitHub deletes the wave branch so the remote stays at `main` plus any in-flight
wave branch.

## Why the agent cannot set these

`api.github.com` is blocked by the execution environment's egress policy, and the
connected GitHub tool surface exposes no branch-protection or rule-set operation. The
agent can enable auto-merge on an individual pull request once the repository allows it,
but it cannot create the protection rule that makes auto-merge safe. Apply the settings
above once and the loop runs hands-off from then on.
