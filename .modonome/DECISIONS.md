# Modonome decisions

Every decision defaults to hold when unanswered.

## Open

- id: self-maintenance-scope
  question: Which surfaces should Modonome maintain on its own repo autonomously (vs. owner-only)?
  options:
    - docs-and-examples: ADOPTION-GUIDE, ENTERPRISE, QUICKSTART, examples, dry-run transcripts.
    - tests-and-fixtures: test coverage gaps, new fixture cases.
    - owner-only: prompts, schemas, scripts, templates, .github (protected paths, always human).
  recommendation: docs-and-examples and tests-and-fixtures are safe for Tier 1 autonomous work.
    Protected paths require owner review per CODEOWNERS.
  default_on_timeout: hold
  context: This repo adopts its own engine. The question is how far Tier 1 autonomy should reach
    on the project's own docs and test surfaces before an owner arms it.
