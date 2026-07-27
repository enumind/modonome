---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-27
canonical: [risk-surface-guard]
---

# Risk Surface Guard

An alpha-stage deterministic diff scanner that flags pull request changes which expand execution, credential, workflow, model/dataset loading, container, or sandbox risk. It is a complementary control that works alongside SAST, secret scanning, dependency review, and cloud security tooling.

## What it detects

Risk Surface Guard scans added lines in a pull request diff and flags patterns that expand the repository's blast radius when merged:

- **Execution risk**: dynamic code execution (eval, exec, pickle.loads), unsafe deserialization (unsafe yaml.load), shell=True subprocess calls, curl or wget piped to bash.
- **Credential surface expansion**: newly-added `secrets.*` references, wildcard IAM policies, cloud credential identifier patterns (AWS env vars, Azure identities, the cloud instance metadata service address `169.254.169.254`).
- **Workflow risk**: GitHub Actions pull_request_target and workflow_run triggers, permission expansion (write-all, contents: write), unpinned third-party Actions.
- **Model and dataset loading risk**: `trust_remote_code=True` patterns in model or dataset load calls.
- **Container and Kubernetes privilege**: --privileged flag, hostPath mounts, hostNetwork, runAsUser: 0, capability additions, Docker socket exposure.
- **TLS verification disabled**: rejectUnauthorized: false, NODE_TLS_REJECT_UNAUTHORIZED, curl -k, Python verify=False.
- **Network egress expansion**: outbound allow-all patterns (`0.0.0.0/0`) added near an egress rule in Terraform or Kubernetes network policy files.
- **Security-sensitive path changes**: any modification to .github/workflows/, action.yml, scripts/lib/, SECURITY.md, CODEOWNERS, Dockerfile, docker-compose.yml, k8s/, terraform/, .modonome/, or similar paths, regardless of content.

The tool reports **id** (e.g., RS101), **severity** (low, medium, high, critical), **category**, **file**, **line**, **matched_text** (redacted for safety), **reason**, **reviewer_guidance**, and **limitation** for each finding.

## What it does not detect

Risk Surface Guard is a deterministic, line-based pattern scanner. It does not detect:

- **Live infrastructure compromise** or runtime behavior (it reads a git diff only; it never executes code or calls network services).
- **Semantic intent** (it is not an AST or semantic analyzer, so obfuscated patterns can evade it).
- **Removals of risky code** (only added lines are flagged, never removals).
- **Code in comments or markdown** within prose files (though security-sensitive file paths are always flagged regardless of content).
- **Anything outside the pull request diff** being reviewed.

## Why this complements the anti-gaming ratchet

The anti-gaming ratchet (`scripts/guard-ratchet.mjs`) detects structural test-weakening: removed assertions, injected skips, coverage lowering. Risk Surface Guard is a separate script and rule catalog that flags a different kind of structural change: one that expands what the repository's execution, credential, workflow, or infrastructure surface can do, even when every test gate stays intact.

They run independently and never share rule logic. The ratchet prevents agents from gaming tests. Risk Surface Guard helps reviewers notice risk-surface expansion before merge.

## How to enable it in GitHub Actions

The shipped composite action (`action.yml`) includes a new input `risk-surface` with three allowed values:

- `off`: skip the check entirely.
- `warn` (default in alpha): run the check, add findings to the job summary without failing the job.
- `fail`: fail the job when a high or critical finding exists.

Example workflow:

```yaml
- uses: enumind/modonome@v1
  with:
    risk-surface: warn    # or 'fail', or 'off'
```

The check also runs as a standalone CLI:

```bash
node scripts/risk-surface-guard.mjs origin/main --mode warn
node scripts/risk-surface-guard.mjs origin/main --mode fail --sarif
node scripts/risk-surface-guard.mjs origin/main --mode warn --json
node scripts/risk-surface-guard.mjs --staged --mode warn
node scripts/risk-surface-guard.mjs --diff <file> --mode fail
```

Exit codes: 0 when no findings, or in warn mode even with findings; 1 in fail mode when a high or critical finding exists; 2 for usage or internal errors.

## How to interpret findings

Each finding includes:

- **id**: Rule identifier (e.g., RS101, RS411). Pinned across versions for stable CI tooling.
- **severity**: low, medium, high, or critical. The action's fail mode checks high and critical findings.
- **category**: One of 15 categories: dynamic-code-execution, unsafe-deserialization, shell-execution, remote-model-or-dataset-code, workflow-permission-expansion, workflow-trigger-risk, credential-surface-expansion, privileged-container, kubernetes-privilege, docker-socket-access, network-egress-expansion, tls-verification-disabled, install-from-network, sandbox-weakening, protected-security-config.
- **file**: The file in the diff containing the finding.
- **line**: The actual line number in the modified file (tracked from the diff's hunk headers, not a placeholder).
- **matched_text**: The matched pattern, truncated to 200 characters and replaced with a fixed placeholder whenever it looks like it might contain real secret material.
- **reason**: A short explanation of the risk flagged.
- **reviewer_guidance**: Suggested questions or alternatives for the reviewer.
- **limitation**: Constraints on what this rule can detect (e.g., "does not catch commented or obfuscated patterns").

The CLI can emit findings as SARIF 2.1.0 (`--sarif`) or plain JSON (`--json`) for scripting. Unlike the anti-gaming ratchet, the GitHub Action does not currently upload Risk Surface Guard's SARIF output to the Security tab; that is a possible future enhancement, not something this version does.

## Why warn mode is the default in alpha

The tool is new and its real-world false-positive rate is not yet proven at scale. Warn mode reports findings to the job summary without blocking the job, giving teams time to confirm the finding rate matches their actual risk and to refine any local rule exemptions before switching to fail mode.

Run in warn mode for a PR cycle or two. If the findings align with your risk model and false positives are rare, move to fail mode.

## How to move to fail mode

After running in warn mode and confirming the finding rate is low and accurate:

1. Set the GitHub Action's `risk-surface` input to `fail`:

```yaml
- uses: enumind/modonome@v1
  with:
    risk-surface: fail
```

2. Or invoke the CLI directly with `--mode fail` in your own CI step:

```bash
node scripts/risk-surface-guard.mjs origin/main --mode fail
```

The job will exit with code 1 if any high or critical finding exists, blocking merge. Findings with low or medium severity are reported but do not fail the job, allowing reviewers to judge them case by case.

## Limits and non-goals

Risk Surface Guard does not prevent breaches. It does not replace SAST, secret scanning, dependency review, cloud security posture tooling, sandboxing, or human review. It is a deterministic, line-based pattern matcher that helps surface candidates for human review before a pull request merges.

The tool scans diffs, not running code. Semantic obfuscation can evade it. A determined actor can rewrite a risky pattern to slip past the patterns the rules check. Reviewers must still read the diff.

False-positive discipline applies: only added lines are flagged; removals of risky code never trigger a finding; same-line comments are skipped; and pinned official GitHub Actions and SHA-pinned third-party actions are exempted from the unpinned-action rule.

No inline suppression comments are supported in this version. If a finding is a false positive specific to your repository, discuss it in a GitHub issue or reach out to the maintainers.
