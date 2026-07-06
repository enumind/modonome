# ADR-043: Terraform module for org-level provisioning

**Status:** Accepted  
**Date:** 2026-07-04  
**Milestone:** 6 (Self-governance hardening)  
**Builds on:** ADR-032 (OSS adapter boundary), ADR-036 (policy attestation), ADR-037 (policy-pack adoption)

## Context

Adopting Modonome Guard across a whole GitHub organization means setting up the
same enforcement surfaces on every repository: a branch ruleset that requires the
`gate-integrity` status check, and a `.github/CODEOWNERS` file over the governance
paths. Doing that by hand is repetitive and drifts. Terraform is the tool teams
already use to manage GitHub organizations, so a small module is the natural way
to make the setup repeatable and reviewable.

The risk in shipping such a module is that it quietly turns Modonome into
something it has always refused to be: a service that acts on an adopter's
infrastructure or gathers data from it. Two existing decisions frame the answer.
ADR-032 fixes the package as zero-runtime-dependency and adapt-do-not-absorb: a
reused tool runs across a boundary, never folded into the published surface.
ADR-036 and ADR-037 built the cross-repo pattern as entirely artifact-based and
human-invoked, with "neither a config lever nor a network path" and no central
authority that can merge, arm, or override a repo.

A Terraform module could break that model in a specific way: by setting
`MODONOME_ARMED`. Arming is the operator's deliberate second key. `scripts/arm.mjs`
already encodes the discipline: it writes `autonomy_enabled` in config but never
sets the CI secret itself, only prints the `gh secret set` command for a human to
run. A module that provisioned that secret would arm an adopter's engine from
Terraform, from state an adopter might not have reviewed line by line.

## Decision

Add a top-level `terraform/` module, applied by the adopter against their own
organization with their own credentials. Modonome ships the code; the adopter runs
it. The module never executes on Modonome's behalf and returns nothing to Modonome.

- The module provisions, per repository in `var.repositories`, a
  `github_repository_ruleset` requiring the status check named by
  `var.required_check_context` (default `gate-integrity`, the workflow job name in
  this repo's own canonical adopter workflow) and a `github_repository_file`
  writing `.github/CODEOWNERS` from `var.protected_paths` and `var.codeowners`.
- The module does not set `MODONOME_ARMED`. The GitHub provider cannot declare a
  secret's existence without a value, and fabricating a value would arm an engine
  from Terraform. Instead the module exposes the exact `gh secret set` command as
  the `arm_command` output, the same way `scripts/arm.mjs` only prints it. Arming
  stays a two-key act split between config and a human running that command.
- The `terraform/` directory is excluded from the published npm package. It is not
  in `package.json`'s `files` allow-list, so an npm install of Modonome ships no
  Terraform an adopter did not ask for.

## Why host-only is the decision, not an afterthought

Modonome must never exist independent of a host repo and must never require a
Modonome-operated backend or central service. This module is a place that could
have quietly added one: a wrapper that "helps" by arming, or a step that phones
home a plan. It does neither. The provisioning runs in the adopter's Terraform,
against the adopter's org, under the adopter's token. The only value that crosses
back toward the operator is a printed command they choose to run. Reading this
module as a Modonome-run service would misplace trust; its whole shape is a local
tool the adopter owns end to end.

## Consequences

- Org-wide setup becomes a reviewable Terraform plan an adopter reads and applies,
  rather than a manual per-repo click-through that drifts.
- The `gate-integrity` literal now lives in one more place (`terraform/main.tf`),
  coupled to the workflow job name in `action.yml` and the README example. A drift
  test (`tests/terraform-module-shape.test.mjs`) greps `main.tf` for that literal
  so a future rename of the job or check surfaces as a failing test to update.
- Real `terraform apply` needs GitHub credentials this repo's CI does not carry,
  so the module is verified two ways short of an apply: a documented local
  `terraform fmt -check` plus `terraform validate` for the adopter, and the
  credential-free shape test in the repo's own suite.
- The provider pin (`~> 6.0`) is a recent constraint to review before a real
  apply, not a guarantee about the adopter's environment.

## Related

- ADR-032 (OSS adapter boundary): the zero-dependency, adapt-do-not-absorb rule this module respects.
- ADR-036 (Policy attestation): the host-only, artifact-based cross-repo pattern this follows; also the input Fleet Ledger renders.
- ADR-037 (Policy-pack adoption): the "no config lever, no network path" precedent for cross-repo tooling.
