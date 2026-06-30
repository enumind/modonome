import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isForbiddenIdentity, findForbiddenCommits } from '../scripts/lib/commit-identity.mjs';

test('rejects agent and vendor identities', () => {
  assert.equal(isForbiddenIdentity('Claude', 'noreply@anthropic.com'), true);
  assert.equal(isForbiddenIdentity('Some Name', 'bot@anthropic.com'), true);
  assert.equal(isForbiddenIdentity('claude-code', 'x@example.com'), true);
  assert.equal(isForbiddenIdentity('GitHub Copilot', 'x@example.com'), true);
});

test('allows human and ordinary automation identities', () => {
  assert.equal(isForbiddenIdentity('nateshpp', '107772539+nateshpp@users.noreply.github.com'), false);
  assert.equal(isForbiddenIdentity('dependabot[bot]', '49699333+dependabot[bot]@users.noreply.github.com'), false);
  assert.equal(isForbiddenIdentity('Jane Doe', 'jane@example.com'), false);
});

test('handles empty input', () => {
  assert.equal(isForbiddenIdentity('', ''), false);
  assert.equal(isForbiddenIdentity(null, undefined), false);
});

test('findForbiddenCommits flags offenders in a git log block', () => {
  const log = [
    'nateshpp\t107772539+nateshpp@users.noreply.github.com\tnateshpp\t107772539+nateshpp@users.noreply.github.com\taaaa111',
    'Claude\tnoreply@anthropic.com\tClaude\tnoreply@anthropic.com\tbbbb222',
  ].join('\n');
  const offenders = findForbiddenCommits(log);
  assert.equal(offenders.length, 1);
  assert.equal(offenders[0].sha, 'bbbb222');
});

test('findForbiddenCommits returns empty for clean history', () => {
  const log = 'nateshpp\t107772539+nateshpp@users.noreply.github.com\tnateshpp\t107772539+nateshpp@users.noreply.github.com\taaaa111';
  assert.deepEqual(findForbiddenCommits(log), []);
});
