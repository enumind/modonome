#!/usr/bin/env node
/**
 * check-repo-hygiene.mjs
 *
 * Automated loose-ends detection for Modonome repo.
 * Fails the build if:
 * - Files marked safe-to-delete exist without a linked issue/decision
 * - ADRs marked "Proposed" lack a milestone assignment
 * - Work items queued for >90 days without progress
 * - References to non-existent milestones in ROADMAP
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync as nodeExecSync } from 'node:child_process';
import { isModelIdentifierBranch, resolveBranchName } from './lib/branch-name.mjs';
import { findForbiddenCommits } from './lib/commit-identity.mjs';
import { formatMessage, loadMessageOverrides } from './lib/messages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const overrides = loadMessageOverrides(path.join(repoRoot, '.modonome'));

const issues = [];

// 1. Check for safe-to-delete files
console.log('Checking for safe-to-delete files...');

function findSafeToDeleteFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSafeToDeleteFiles(full));
    } else if (entry.name.includes('safe-to-delete')) {
      results.push(`./${path.relative(repoRoot, full)}`);
    }
  }
  return results;
}

const allFiles = findSafeToDeleteFiles(repoRoot);

allFiles.forEach(file => {
  const issue = {
    type: 'LOOSE_END',
    file,
    message: formatMessage('gate.repo-hygiene.safe-to-delete-file', { file }, overrides).message
  };
  issues.push(issue);
  console.log(`  ✗ ${file}`);
});

// 2. Check for ADRs marked "Proposed" without milestone
console.log('\nChecking ADR assignments...');
const adrFiles = fs.readdirSync(path.join(repoRoot, 'docs', 'adr')).filter(f => f.startsWith('ADR-'));
adrFiles.forEach(file => {
  const content = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', file), 'utf8');
  const hasProposed = content.includes('**Status:** Proposed');
  const hasMilestone = /\*\*Milestone:\*\*|^## Milestone/m.test(content);
  
  if (hasProposed && !hasMilestone) {
    issues.push({
      type: 'UNASSIGNED_ADR',
      file,
      message: formatMessage('gate.repo-hygiene.unassigned-adr', { file }, overrides).message
    });
    console.log(`  ✗ ${file} (Proposed, no milestone)`);
  }
});

// 3. Check for work items queued >90 days
console.log('\nChecking work queue age...');
const workItems = fs.readdirSync(path.join(repoRoot, '.modonome', 'work-items')).filter(f => f.endsWith('.json'));
const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

workItems.forEach(file => {
  const filePath = path.join(repoRoot, '.modonome', 'work-items', file);
  const item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (item.state === 'queued') {
    let queuedTime;
    if (item.queued_at) {
      queuedTime = new Date(item.queued_at).getTime();
    } else {
      const stats = fs.statSync(filePath);
      queuedTime = stats.mtime.getTime();
      console.warn(formatMessage('gate.repo-hygiene.missing-queued-at', { file }, overrides).message);
    }
    if (queuedTime < ninetyDaysAgo) {
      issues.push({
        type: 'STALE_WORK_ITEM',
        file,
        message: formatMessage('gate.repo-hygiene.stale-work-item', { id: item.id }, overrides).message
      });
      console.log(`  ✗ ${item.id} (queued since ${new Date(queuedTime).toISOString()})`);
    }
  }
});

// 4. Check ROADMAP references
console.log('\nChecking ROADMAP consistency...');
const roadmap = fs.readFileSync(path.join(repoRoot, 'ROADMAP.md'), 'utf8');
const milestoneTitles = roadmap.match(/^## Milestone \d+/gm) || [];
const referencedMilestones = roadmap.match(/Milestone \d+/g) || [];

const uniqueRefs = new Set(referencedMilestones.map(m => m.match(/\d+/)[0]));
uniqueRefs.forEach(num => {
  if (!milestoneTitles.some(t => t.includes(`Milestone ${num}`))) {
    issues.push({
      type: 'MISSING_MILESTONE',
      file: 'ROADMAP.md',
      message: formatMessage('gate.repo-hygiene.missing-milestone', { num }, overrides).message
    });
    console.log(`  ✗ Milestone ${num} referenced but not defined`);
  }
});

// 5. Guard: package.json version field must not change except in a release commit
console.log('\nChecking package.json version field...');
try {
  const isCI = process.env.CI === 'true';
  const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
  if (isCI && isPR) {
    const baseRef = process.env.GITHUB_BASE_REF || 'main';
    const baseVersion = execSync(
      `git show origin/${baseRef}:package.json`,
      { encoding: 'utf8' }
    );
    const baseVer = JSON.parse(baseVersion).version;
    const headPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    if (baseVer !== headPkg.version) {
      // Allow only if the tip commit message starts with chore(release):
      const tipMsg = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
      if (!tipMsg.startsWith('chore(release):')) {
        issues.push({
          type: 'VERSION_FIELD_CHANGED',
          file: 'package.json',
          message: formatMessage(
            'gate.repo-hygiene.version-field-changed',
            { baseVersion: baseVer, headVersion: headPkg.version },
            overrides
          ).message
        });
        console.log(`  ✗ version changed: ${baseVer} → ${headPkg.version}`);
      }
    }
  }
} catch (e) {
  // Non-fatal in non-CI or when base branch isn't available
  console.log('  (skipped: not a PR context)');
}

// 6. Check for Math.random() in scripts (insecure randomness; use crypto.randomBytes)
console.log('\nChecking for insecure randomness in scripts...');
const scriptDir = path.join(repoRoot, 'scripts');
fs.readdirSync(scriptDir)
  .filter(f => f.endsWith('.mjs') && f !== 'check-repo-hygiene.mjs')
  .forEach(file => {
    const content = fs.readFileSync(path.join(scriptDir, file), 'utf8');
    if (content.includes('Math.random(')) {
      issues.push({
        type: 'INSECURE_RANDOMNESS',
        file: `scripts/${file}`,
        message: formatMessage('gate.repo-hygiene.insecure-randomness', { file }, overrides).message
      });
      console.log(`  ✗ ${file}`);
    }
  });

// 7. Guard: branch name must not carry a model-identifier prefix
console.log('\nChecking branch name...');
let branchName = resolveBranchName();
if (!branchName) {
  try {
    branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    branchName = '';
  }
}
if (branchName && branchName !== 'HEAD' && isModelIdentifierBranch(branchName)) {
  issues.push({
    type: 'MODEL_IDENTIFIER_BRANCH',
    file: branchName,
    message: formatMessage('gate.repo-hygiene.model-identifier-branch', { branch: branchName }, overrides).message
  });
  console.log(`  ✗ ${branchName}`);
} else {
  console.log('  (ok)');
}

// 8. Guard: commit author and committer identity must not belong to a coding agent
console.log('\nChecking commit author identity...');
try {
  const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
  const baseRef = isPR ? (process.env.GITHUB_BASE_REF || 'main') : 'main';
  const range = `origin/${baseRef}..HEAD`;
  const log = execSync(
    `git log ${range} --no-merges --format=%an%x09%ae%x09%cn%x09%ce%x09%h`,
    { encoding: 'utf8' }
  );
  const offenders = findForbiddenCommits(log);
  if (offenders.length > 0) {
    offenders.forEach((o) => {
      issues.push({
        type: 'AGENT_COMMIT_IDENTITY',
        file: o.sha,
        message: formatMessage(
          'gate.repo-hygiene.agent-commit-identity',
          { sha: o.sha, author: o.author, committer: o.committer },
          overrides
        ).message
      });
      console.log(`  ✗ ${o.sha} ${o.author}`);
    });
  } else {
    console.log('  (ok)');
  }
} catch {
  console.log('  (skipped: commit range not available)');
}

// Report
console.log('\n' + '='.repeat(70));
if (issues.length === 0) {
  console.log('✓ Repo hygiene check passed. No loose ends detected.');
  process.exit(0);
} else {
  console.log(formatMessage('gate.repo-hygiene.fail-summary', { count: issues.length }, overrides).message);
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. [${issue.type}] ${issue.file}`);
    console.log(`   ${issue.message}\n`);
  });
  console.log(formatMessage('gate.repo-hygiene.fail-footer', {}, overrides).message);
  process.exit(1);
}

// Helper
function execSync(cmd, opts) {
  return nodeExecSync(cmd, { cwd: repoRoot, ...opts });
}
