import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { scanForSecrets, SECRET_PATTERNS } from '../scripts/lib/secret-patterns.mjs';

test('clean text yields no matches', () => {
  assert.deepEqual(scanForSecrets('just some ordinary prose with no secrets'), []);
});

test('detects a private key header', () => {
  const hits = scanForSecrets('-----BEGIN OPENSSH PRIVATE KEY-----');
  assert.ok(hits.some((h) => h.name === 'private key'));
});

test('detects an AWS access key', () => {
  const hits = scanForSecrets('key AKIAIOSFODNN7EXAMPLE here');
  assert.ok(hits.some((h) => h.name === 'AWS access key'));
});

test('detects a token assignment', () => {
  const hits = scanForSecrets('api_key = abc123def');
  assert.ok(hits.some((h) => h.name === 'bearer or api token'));
});

test('detects a private IPv4 address', () => {
  const hits = scanForSecrets('host at 10.0.3.14 internally');
  assert.ok(hits.some((h) => h.name === 'private IPv4'));
});

test('detects an internal hostname and a code fence', () => {
  assert.ok(scanForSecrets('db.internal').some((h) => h.name === 'internal hostname'));
  assert.ok(scanForSecrets('```\ncode\n```').some((h) => h.name === 'code fence'));
});

test('every pattern has a name and a regex', () => {
  for (const p of SECRET_PATTERNS) {
    assert.equal(typeof p.name, 'string');
    assert.ok(p.re instanceof RegExp);
  }
});
