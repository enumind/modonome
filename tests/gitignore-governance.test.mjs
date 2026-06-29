import fs from 'fs';
import test from 'node:test';
import assert from 'node:assert';

test('governance: verify core gitignore blocklist rules are structurally present', () => {
  const content = fs.readFileSync('.gitignore', 'utf8');
  
  // Real architectural assertions that protect your repository configuration
  assert.ok(content.includes('.claude/'), 'Missing security boundary pattern: .claude/');
  assert.ok(content.includes('CLAUDE.md'), 'Missing security boundary pattern: CLAUDE.md');
  assert.ok(content.includes('runs/'), 'Missing cache boundary pattern: runs/');
});

test('governance: verify core npmignore publication blocklist rules are structurally present', () => {
  const content = fs.readFileSync('.npmignore', 'utf8');
  assert.ok(content.includes('tests/'), 'Missing publication boundary pattern: tests/');
  assert.ok(content.includes('modonome/'), 'Missing publication boundary pattern: modonome/');
});

test('governance: verify project lockfile is structurally present for deployment safety', () => {
  const hasLockfile = fs.existsSync('package-lock.json');
  assert.strictEqual(hasLockfile, true, 'Missing critical package-lock.json asset dependency configuration');
});
