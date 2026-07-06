# Inputs for the Modonome org-provisioning module. Every value here describes
# your own GitHub organization and your own governance choices. Nothing is sent
# to Modonome; you apply this with your own Terraform credentials.

variable "organization" {
  type        = string
  description = "The GitHub organization login you control and are provisioning against. Used as the provider owner."

  validation {
    condition     = length(trimspace(var.organization)) > 0
    error_message = "organization must be a non-empty GitHub org login."
  }
}

variable "repositories" {
  type        = list(string)
  description = "The repositories in the organization to provision. A branch ruleset and a .github/CODEOWNERS file are created for each."

  validation {
    condition     = length(var.repositories) > 0
    error_message = "repositories must list at least one repository name."
  }
}

variable "required_check_context" {
  type        = string
  description = <<-EOT
    The required status-check context the branch ruleset keys on. A ruleset
    matches the workflow JOB name, not the Action's display name. This repo's
    canonical adopter workflow (README.md, "Two products, one repo") names that
    job "gate-integrity", so that is the default. Override it only if your
    workflow names the job something else.
  EOT
  default     = "gate-integrity"
}

variable "codeowners" {
  type        = list(string)
  description = "The owner entries written against every protected path in CODEOWNERS (for example [\"@your-org/maintainers\"]). At least one is required for CODEOWNERS to be meaningful."
  default     = ["@your-org/maintainers"]

  validation {
    condition     = length(var.codeowners) > 0
    error_message = "codeowners must list at least one owner (a @user or @org/team)."
  }
}

variable "protected_paths" {
  type        = list(string)
  description = <<-EOT
    The paths written into each repo's .github/CODEOWNERS, each assigned the
    var.codeowners owners. The default mirrors the Tier-2 governance paths this
    repository protects in its own .github/CODEOWNERS (see also
    templates/.modonome/config.yaml protected_paths_extra, which ships empty so
    adopters start from an explicit list). Adjust for your own repo layout.
  EOT
  default = [
    "/.github/",
    "/bin/",
    "/prompts/",
    "/schemas/",
    "/scripts/",
    "/site/",
    "/templates/",
  ]
}

variable "ruleset_name" {
  type        = string
  description = "The name given to each repository ruleset."
  default     = "modonome-gate-integrity"
}

variable "enforcement" {
  type        = string
  description = "Ruleset enforcement level: active, evaluate, or disabled."
  default     = "active"

  validation {
    condition     = contains(["active", "evaluate", "disabled"], var.enforcement)
    error_message = "enforcement must be one of: active, evaluate, disabled."
  }
}

variable "require_codeowner_review" {
  type        = bool
  description = "Whether the ruleset also requires review from a code owner on the protected paths. Pairs with the provisioned CODEOWNERS file."
  default     = true
}

variable "required_approving_review_count" {
  type        = number
  description = "Number of approving reviews the pull-request rule requires. Only used when require_codeowner_review is true."
  default     = 1
}
