# Modonome org-provisioning module

Terraform for provisioning the enforcement surfaces Modonome Guard relies on
across the repositories in a GitHub organization you control: a branch ruleset
that requires the `gate-integrity` status check, and a `.github/CODEOWNERS` file
over your governance paths.

This module is covered by [ADR-040](../docs/adr/ADR-040-terraform-module.md).

## Host-only constraint (read this first)

This module is applied by you, against your organization, using your own
Terraform credentials. Modonome does not run this, receives nothing from it, and
aggregates nothing across your repositories on its own behalf. There is no
Modonome-operated backend and no central service in the loop. The tool ships in
the package; you run it against your own infrastructure. This matches the
zero-runtime-dependency, adapt-do-not-absorb boundary of
[ADR-032](../docs/adr/ADR-032-oss-adapter-boundary.md) and the artifact-based,
human-invoked cross-repo pattern of
[ADR-036](../docs/adr/ADR-036-policy-attestation.md) and
[ADR-037](../docs/adr/ADR-037-policy-pack-adoption.md).

The module is packaged in the repo but excluded from the published npm package
(`terraform/` is not in `package.json`'s `files` allow-list), so an npm install
of Modonome never ships Terraform an adopter did not ask for.

## What it provisions

Per repository named in `var.repositories`:

1. A `github_repository_ruleset` targeting the default branch, requiring the
   status check named by `var.required_check_context` (default `gate-integrity`).
   Optionally it also requires code-owner review.
2. A `.github/CODEOWNERS` file (`github_repository_file`) with a global
   catch-all plus one line per path in `var.protected_paths`, each assigned the
   owners in `var.codeowners`.

It deliberately does not set `MODONOME_ARMED`. Arming is an operator's out-of-band
act by design, the same design `scripts/arm.mjs` follows (it sets the config key
but only prints the CI-secret command, never sets it). The provider cannot declare
a secret's existence without a value, and fabricating a value would arm an
adopter's engine from Terraform. The exact command is surfaced as the `arm_command`
output instead.

## Usage

```hcl
module "modonome_org" {
  source = "github.com/enumind/modonome//terraform"

  organization = "your-org"
  repositories = ["service-a", "service-b"]

  # Optional overrides shown with their defaults:
  # required_check_context          = "gate-integrity"
  # codeowners                      = ["@your-org/maintainers"]
  # protected_paths                 = ["/.github/", "/bin/", "/prompts/", "/schemas/", "/scripts/", "/site/", "/templates/"]
  # ruleset_name                    = "modonome-gate-integrity"
  # enforcement                     = "active"
  # require_codeowner_review        = true
  # required_approving_review_count = 1
}
```

Authenticate the provider with the `GITHUB_TOKEN` environment variable (a personal
access token or GitHub App token you control with admin rights on the repos). The
module never embeds a credential.

Because the provider commits the CODEOWNERS file through the GitHub API, apply
this module with a token that can write to the default branch. If a repo already
enforces pull requests on its default branch, provision CODEOWNERS before you set
the ruleset to `active`, or apply with an admin token.

## Inputs

| Variable | Type | Default | Purpose |
| --- | --- | --- | --- |
| `organization` | string | (required) | The org login you control. Used as the provider owner. |
| `repositories` | list(string) | (required) | Repos to provision. One ruleset and one CODEOWNERS file each. |
| `required_check_context` | string | `"gate-integrity"` | Required status-check context. Keys on the workflow job name. |
| `codeowners` | list(string) | `["@your-org/maintainers"]` | Owner entries written against every protected path. |
| `protected_paths` | list(string) | Tier-2 governance paths | Paths written into CODEOWNERS. |
| `ruleset_name` | string | `"modonome-gate-integrity"` | Name given to each ruleset. |
| `enforcement` | string | `"active"` | `active`, `evaluate`, or `disabled`. |
| `require_codeowner_review` | bool | `true` | Also require code-owner review in the ruleset. |
| `required_approving_review_count` | number | `1` | Approvals required when code-owner review is on. |

### On `required_check_context`

The required-check context keys on the workflow's `jobs:` name, not the Action's
display name. This repository's canonical adopter workflow (see the "Two products,
one repo" section of the root `README.md`) names that job literally
`gate-integrity`, which is why that is the default. Override it only if your
workflow names the job something else.

## Outputs

| Output | Purpose |
| --- | --- |
| `arm_command` | The exact `gh secret set MODONOME_ARMED --body true` command, as a plain string. Terraform never runs it. |
| `arming_note` | Why arming is not part of this apply. |
| `required_check_context` | Echoes the required context so you can confirm it matches your workflow job. |
| `ruleset_ids` | Map of repo to created ruleset id. |
| `codeowners_files` | Map of repo to provisioned CODEOWNERS path. |

## Provider version

`versions.tf` pins `integrations/github` to `~> 6.0` and Terraform to `>= 1.5.0`.
These are sensible recent constraints, not a claim about your environment. Review
the pin against the provider's current release before a real apply.

## Verifying this module

There is no cloud or GitHub credential in the environment that ships this code, so
do not run `terraform apply` from CI. Before a real apply, run locally:

```sh
cd terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```

A cheap, credential-free shape test also runs in the repo's own suite:
`tests/terraform-module-shape.test.mjs` asserts the expected `.tf` files exist,
that `main.tf` still references the `gate-integrity` literal, and that
`variables.tf` declares the documented variables.

## Companion tool: Fleet Ledger

Once several repos enforce the gate and publish their
`.modonome/policy-attestation.json` (ADR-036), `scripts/fleet-ledger.mjs` renders
a single static posture table over a directory of already-collected attestation
files:

```sh
node scripts/fleet-ledger.mjs ./collected-attestations --out fleet.html
```

Like this Terraform module, Fleet Ledger is host-only: it reads files you already
placed in a local directory, reaches no network, clones no repo, and knows nothing
about how the files got there. That collection step is your job, for example a
coordinating repo's own Action that clones sibling repos read-only and drops their
attestation files into a directory before invoking the tool locally. Output is
deterministic (rows sorted by repo name, no wall-clock timestamp) so two runs over
identical input produce identical HTML.

## Deferred: ADO bridge and Backstage plugin

Two enterprise connectors are consciously deferred, not dropped:

- **Azure DevOps bridge**: a pipeline task wrapping `scripts/guard-ratchet.mjs` the
  same zero-dependency way `action.yml` wraps it for GitHub Actions, ported to
  ADO's task schema. No ADO code exists yet.
- **Backstage plugin**: a static card that reads the same
  `.modonome/policy-attestation.json` Fleet Ledger reads, rendered inside a
  Backstage catalog entity page. No plugin code exists yet.

Both are follow-up epics. See also the enterprise-adoption notes in
[docs/enterprise.md](../docs/enterprise.md).
