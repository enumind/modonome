# Outputs. The arming command is surfaced here as a plain string, never executed,
# mirroring scripts/arm.mjs, which also only ever prints this command.

output "arm_command" {
  description = "The out-of-band command an operator runs by hand to set the second arming key. Terraform never runs this and never sets MODONOME_ARMED itself."
  value       = "gh secret set MODONOME_ARMED --body true"
}

output "arming_note" {
  description = "Why the arm command is not part of this apply."
  value       = "MODONOME_ARMED is the operator's deliberate second key. It lives in CI or operator scope, outside this module. Run arm_command yourself, per repo or org, only when you intend to arm."
}

output "required_check_context" {
  description = "The status-check context the provisioned rulesets require. Confirm your workflow's job name matches this."
  value       = var.required_check_context
}

output "ruleset_ids" {
  description = "Map of repository name to the created ruleset id."
  value       = { for repo, rs in github_repository_ruleset.gate_integrity : repo => rs.ruleset_id }
}

output "codeowners_files" {
  description = "Map of repository name to the provisioned CODEOWNERS path."
  value       = { for repo, f in github_repository_file.codeowners : repo => f.file }
}
