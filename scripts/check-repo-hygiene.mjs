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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const issues = [];

// 1. Check for safe-to-delete files
console.log('Checking for safe-to-delete files...');
const allFiles = execSync('find . -type f -name "*safe-to-delete*" 2>/dev/null', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

allFiles.forEach(file => {
  const issue = {
    type: 'LOOSE_END',
    file,
    message: `File marked for deletion exists: ${file}. Should either be deleted or moved back.`
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
      message: `ADR ${file} is "Proposed" but has no Milestone assignment. Either accept+assign to milestone or move to research/.`
    });
    console.log(`  ✗ ${file} (Proposed, no milestone)`);
  }
});

// 3. Check for work items queued >90 days
console.log('\nChecking work queue age...');
const workItems = fs.readdirSync(path.join(repoRoot, '.modonome', 'work-items')).filter(f => f.endsWith('.json'));
const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

workItems.forEach(file => {
  const stats = fs.statSync(path.join(repoRoot, '.modonome', 'work-items', file));
  if (stats.mtime < ninetyDaysAgo) {
    const item = JSON.parse(fs.readFileSync(path.join(repoRoot, '.modonome', 'work-items', file), 'utf8'));
    if (item.state === 'queued') {
      issues.push({
        type: 'STALE_WORK_ITEM',
        file,
        message: `Work item ${item.id} has been queued for >90 days. Archive it or move to active work.`
      });
      console.log(`  ✗ ${item.id} (queued since ${new Date(stats.mtime).toISOString()})`);
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
      message: `ROADMAP references Milestone ${num} but it's not defined.`
    });
    console.log(`  ✗ Milestone ${num} referenced but not defined`);
  }
});

// Report
console.log('\n' + '='.repeat(70));
if (issues.length === 0) {
  console.log('✓ Repo hygiene check passed. No loose ends detected.');
  process.exit(0);
} else {
  console.log(`✗ Repo hygiene check FAILED. ${issues.length} issue(s) found:\n`);
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. [${issue.type}] ${issue.file}`);
    console.log(`   ${issue.message}\n`);
  });
  console.log('Fix these before shipping. Loose ends kill credibility over time.');
  process.exit(1);
}

// Helper
function execSync(cmd, opts) {
  const { execSync: es } = require('child_process');
  return es(cmd, { cwd: repoRoot, ...opts });
}
