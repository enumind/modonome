import { execSync } from 'child_process';
import fs from 'fs';

const baseBranch = process.argv[2] || 'origin/main';

try {
  // 1. Get the list of changed files
  const changedFilesStr = execSync(`git diff --name-only ${baseBranch}...HEAD`, { encoding: 'utf8' });
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

  // 3. Triviality check for actual code lines
  const diff = execSync(`git diff ${baseBranch}...HEAD`, { encoding: 'utf8' });
  const addedLines = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).length;

  if (addedLines < 5) {
    console.log("Change is trivial (< 5 lines). Governance check requires substantive change.");
    process.exit(1);
  }

  console.log("Change is governance-relevant and substantive.");
  process.exit(0);
} catch (error) {
  console.error("Governance check script execution failure:", error.message);
  process.exit(1);
}
