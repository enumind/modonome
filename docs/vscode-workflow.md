# VS Code manual trigger workflow

Run modonome from VS Code on demand, one work item at a time, using your existing
Claude subscription (no API key required).

## Prerequisites

- VS Code with the Claude Code extension installed
- The modonome repo cloned locally (or opened via Remote SSH / WSL)
- Git identity set to your GitHub noreply address:

  ```bash
  git config user.email "<id>+<username>@users.noreply.github.com"
  ```

## One-item run (recommended starting point)

Open the VS Code integrated terminal and run:

```bash
claude --max-turns 10
```

Then paste this prompt:

```
Read .modonome/STATUS.md and pick the first queued item from .modonome/work-items/.
Read the work item JSON, make only the changes in allowed_edit_set, run all gates,
commit on a new branch named after the work item ID, and push. Stop after one item.
```

The `--max-turns 10` cap prevents runaway sessions. A Tier 1 item (docs) typically
uses 4-6 turns; a Tier 2 item (scripts) uses 8-12.

## Choosing the right model

Before running, set the model in VS Code:

- Haiku: pure text or docs items (WI-002, WI-003, WI-013, WI-014, WI-016, WI-018, WI-019)
- Sonnet: code, tests, or schema changes (WI-001, WI-006, WI-007, WI-015, WI-017)
- Opus: ratchet, arming enforcement, or security-critical scripts (WI-005, WI-009, WI-010)

To switch models in the Claude Code extension, use the `/model` command in the chat panel.

## Reviewing and merging

After the session pushes a branch:

1. Open GitHub and review the pull request.
2. Confirm the diff touches only files in the work item's `allowed_edit_set`.
3. Merge via squash-merge and delete the branch.

Tier 2 items (`touches_protected_path: true`) require a CODEOWNERS approval before merge.
You cannot approve your own PR; ask a collaborator or use GitHub's required reviewer setting.

## Tips for low token use

- Use `--max-turns 10` and stay at the correct model tier (Haiku for docs).
- One item per session: starting a new session for each item keeps context small.
- Avoid asking Claude to explain or summarize at the end; just let it stop after the push.
- If a session stalls or uses unexpected turns, check `.modonome/work-items/` for the
  item state; if it is `claimed`, reset it to `queued` manually before retrying.

## Running from a remote machine (Mac mini, cloud VM)

If your VS Code is connected to a remote host via SSH:

1. The Claude Code extension runs on the remote machine.
2. No extra setup is needed; the extension uses the same subscription-based billing.
3. Set the git noreply email on the remote, not on your local machine.
