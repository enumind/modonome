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
