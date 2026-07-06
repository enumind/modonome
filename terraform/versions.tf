# Provider and Terraform version pins for the Modonome org-provisioning module.
#
# The GitHub provider major version below is a sensible recent constraint, not a
# guarantee about your environment. Review it against the provider's current
# release before a real apply, and run `terraform init` in a throwaway directory
# to confirm the lock file resolves the version you expect.
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
