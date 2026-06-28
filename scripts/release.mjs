#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', ...opts }).trim();
}

const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: npm run release -- patch|minor|major');
  process.exit(1);
}

// Assert clean working tree
const dirty = run('git status --porcelain');
if (dirty) {
  console.error('Working tree is not clean. Commit or stash changes first.');
  process.exit(1);
}

// Assert on main branch
const branch = run('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  console.error(`Must be on main branch (currently on "${branch}").`);
  process.exit(1);
}

// Read current version, strip any prerelease suffix to get a clean base
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const base = pkg.version.replace(/-.*$/, '');
const [major, minor, patch] = base.split('.').map(Number);

let newVersion;
if (bumpType === 'major') newVersion = `${major + 1}.0.0`;
else if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

// Check not already published
try {
  const found = run(`npm view modonome@${newVersion} version 2>/dev/null || echo ""`);
  if (found === newVersion) {
    console.error(`${newVersion} is already published on npm. Bump again or unpublish first.`);
    process.exit(1);
  }
} catch {
  // not found — safe to proceed
}

// Update package.json version
pkg.version = newVersion;
writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// Auto-update CHANGELOG.md
let lastTag;
try {
  lastTag = run('git describe --tags --abbrev=0');
} catch {
  lastTag = run('git rev-list --max-parents=0 HEAD');
}
const logLines = run(`git log --oneline ${lastTag}..HEAD`);
const today = new Date().toISOString().slice(0, 10);
const changelogEntry = `## v${newVersion} (${today})\n\n${logLines || '(no commits since last release)'}\n`;

const changelogPath = join(root, 'CHANGELOG.md');
let existing = '';
try { existing = readFileSync(changelogPath, 'utf8'); } catch { /* first time */ }
writeFileSync(changelogPath, changelogEntry + '\n' + existing);

// Stage and commit
run('git add package.json CHANGELOG.md');
run(`git commit -m "chore(release): v${newVersion}"`);

// Create annotated tag
run(`git tag -a "v${newVersion}" -m "Release v${newVersion}\n\n${changelogEntry}"`);

console.log(`\nRelease v${newVersion} prepared.`);
console.log(`\nNext step — push to trigger CI publish:\n`);
console.log(`  git push --follow-tags origin main\n`);
