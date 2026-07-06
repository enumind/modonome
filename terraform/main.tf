# Modonome org-provisioning module (ADR-043).
#
# Host-only constraint: this module is applied by you, against your own GitHub
# organization, using your own Terraform credentials. Modonome does not run it,
# does not receive its plan or state, and aggregates nothing on its own behalf.
# It provisions the enforcement surfaces Modonome Guard relies on:
#   1. A branch ruleset requiring the gate-integrity status check.
#   2. A .github/CODEOWNERS file over the governance paths.
# It deliberately does NOT set MODONOME_ARMED. See the note at the bottom.

provider "github" {
  owner = var.organization
  # Authenticate with the GITHUB_TOKEN environment variable, a personal access
  # token or GitHub App token you control with admin rights on the org's repos.
  # This module never embeds a credential and never reads one from Modonome.
}

locals {
  owners_line = join(" ", var.codeowners)

  # CODEOWNERS body: a global catch-all plus one line per protected path, each
  # assigned the same owner set. Generated from inputs so the file stays a
  # function of var.protected_paths and var.codeowners, not a hand-edited blob.
  codeowners_content = join("\n", concat(
    [
      "# Managed by the Modonome Terraform module (terraform/). Do not edit by",
      "# hand: change var.protected_paths or var.codeowners and re-apply.",
      "",
      "# Global catch-all: every path requires a listed owner's review.",
      "* ${local.owners_line}",
      "",
      "# Modonome-protected governance paths.",
    ],
    [for p in var.protected_paths : "${p} ${local.owners_line}"],
    [""],
  ))
}

# Branch ruleset requiring the gate-integrity check on each repo's default branch.
#
# DRIFT NOTE: the required-check context below keys on the workflow JOB name, not
# the Action's display name. This repo's canonical adopter workflow (README.md,
# "Two products, one repo") names that job literally "gate-integrity". If that
# job is ever renamed in the example workflow or in action.yml, update
# var.required_check_context's default AND tests/terraform-module-shape.test.mjs,
# which greps this file for the "gate-integrity" literal as a coupling check.
resource "github_repository_ruleset" "gate_integrity" {
  for_each = toset(var.repositories)

  name        = var.ruleset_name
  repository  = each.value
  target      = "branch"
  enforcement = var.enforcement

  conditions {
    ref_name {
      # ~DEFAULT_BRANCH resolves to each repo's own default branch.
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    required_status_checks {
      required_check {
        context = var.required_check_context
      }
      strict_required_status_checks_policy = true
    }

    dynamic "pull_request" {
      for_each = var.require_codeowner_review ? [1] : []
      content {
        require_code_owner_review       = true
        required_approving_review_count = var.required_approving_review_count
      }
    }
  }
}

# CODEOWNERS provisioning for each repo. overwrite_on_create keeps a pre-existing
# file from turning the first apply into an error; subsequent applies reconcile it
# to the generated content above.
resource "github_repository_file" "codeowners" {
  for_each = toset(var.repositories)

  repository          = each.value
  file                = ".github/CODEOWNERS"
  content             = local.codeowners_content
  commit_message      = "Provision CODEOWNERS via the Modonome Terraform module"
  overwrite_on_create = true
}

# MODONOME_ARMED is intentionally NOT provisioned here.
#
# Arming is a deliberate, out-of-band operator act, the same design scripts/arm.mjs
# follows: that script sets autonomy_enabled in config but never sets the CI secret
# itself, only prints the `gh secret set` command. The github provider cannot
# declare a secret's existence without a value, and fabricating a value would arm
# an adopter's engine from Terraform, which this module must never do. The exact
# command an operator runs by hand is surfaced in outputs.tf instead.
