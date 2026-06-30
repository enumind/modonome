import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isModelIdentifierBranch, resolveBranchName } from '../scripts/lib/branch-name.mjs';

test('rejects model-identifier branch prefixes', () => {
  const rejected = [
    'claude/foo',
    'gpt/bar',
    'ai/x',
    'anthropic/y',
    'openai/z',
    'copilot/w',
    'gemini/v',
    'llm/u',
    'bot/t',
  ];
  for (const name of rejected) {
    assert.equal(isModelIdentifierBranch(name), true, `${name} should be rejected`);
  }
});

test('allows normal branch names', () => {
  const allowed = [
    'main',
    'npm-release-ssf-compliance-35l12w',
    'fix/registry',
    'release/v1',
    'feature/ai-adapter',
    'chore/deps',
  ];
  for (const name of allowed) {
    assert.equal(isModelIdentifierBranch(name), false, `${name} should be allowed`);
  }
});

test('matching is case-insensitive', () => {
  assert.equal(isModelIdentifierBranch('Claude/Foo'), true);
  assert.equal(isModelIdentifierBranch('GPT/main'), true);
});

test('handles empty and non-string input', () => {
  assert.equal(isModelIdentifierBranch(''), false);
  assert.equal(isModelIdentifierBranch(null), false);
  assert.equal(isModelIdentifierBranch(undefined), false);
});

test('resolveBranchName prefers head ref then ref name', () => {
  assert.equal(resolveBranchName({ GITHUB_HEAD_REF: 'claude/x', GITHUB_REF_NAME: 'main' }), 'claude/x');
  assert.equal(resolveBranchName({ GITHUB_REF_NAME: 'main' }), 'main');
  assert.equal(resolveBranchName({}), '');
});
