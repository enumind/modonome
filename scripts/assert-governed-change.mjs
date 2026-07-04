import { execFileSync } from 'child_process';
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const overrides = loadMessageOverrides(join(here, "..", ".modonome"));

const baseBranch = process.argv[2] || 'origin/main';

function gitDiff(...args) {
  // execFileSync passes args straight to the git process, no shell in between, so a
  // baseBranch value with shell metacharacters cannot escape into command execution.
  return execFileSync('git', ['diff', ...args, `${baseBranch}...HEAD`], { encoding: 'utf8' });
}

try {
  // 1. Get the list of changed files
  const changedFilesStr = gitDiff('--name-only');
  const changedFiles = changedFilesStr.split('\n').filter(Boolean);

  if (changedFiles.length === 0) {
    console.log("No changes detected.");
    process.exit(0);
  }

  // 2. SHORT-CIRCUIT: Allowed Content & Infrastructure configurations (Copilot Fix)
  const ALLOWED_CONFIG_PREFIXES = ["site/", "RELEASE-EVIDENCE.md", "package-lock.json", ".npmignore", ".gitignore", ".github/workflows/"];
  const isContentOrConfigOnly = changedFiles.every((f) =>
    ALLOWED_CONFIG_PREFIXES.some((p) => f.startsWith(p))
  );

  if (isContentOrConfigOnly) {
    console.log("Change is site, documentation, or infrastructure configuration only. Governance check not required.");
    process.exit(0);
  }

  // 3. Triviality check for actual code lines. Uses --numstat (one summary line per
  // file: added, deleted, path) rather than the full diff body: a large but
  // legitimate change (a new package, a generated artifact) can produce a diff body
  // that overruns the OS pipe buffer under execSync and fails with ENOBUFS before
  // the line count is ever read. --numstat carries the same added-line count in a
  // fraction of the bytes.
  const numstat = gitDiff('--numstat');
  const addedLines = numstat
    .split('\n')
    .filter(Boolean)
    .reduce((sum, line) => {
      const added = parseInt(line.split('\t')[0], 10);
      return sum + (Number.isNaN(added) ? 0 : added);
    }, 0);

  if (addedLines < 5) {
    console.log("Change is trivial (< 5 lines). Governance check requires substantive change.");
    process.exit(1);
  }

  console.log("Change is governance-relevant and substantive.");
  process.exit(0);
} catch (error) {
  console.error(formatMessage("gate.assert-governed-change.execution-failure", { error: error.message }, overrides).message);
  process.exit(1);
}
