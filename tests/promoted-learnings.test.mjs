import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPromotedLearnings, REQUIRED_FIELDS } from '../scripts/lib/learnings.mjs';

function withRoot(learningsBody) {
  const root = mkdtempSync(join(tmpdir(), 'modonome-learnings-'));
  mkdirSync(join(root, '.modonome'), { recursive: true });
  writeFileSync(join(root, '.modonome', 'LEARNINGS.md'), learningsBody);
  return root;
}

test('REQUIRED_FIELDS lists the audit-trail fields', () => {
  assert.ok(REQUIRED_FIELDS.includes('correction_signal_id'));
  assert.ok(REQUIRED_FIELDS.includes('gate_location'));
});

test('returns empty when there is no Promoted heading', () => {
  const root = withRoot('# Learnings\n\nNothing promoted yet.\n');
  try {
    assert.deepEqual(readPromotedLearnings(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('returns empty when the Promoted heading has no json fence', () => {
  const root = withRoot('## Promoted\n\nNo block here.\n');
  try {
    assert.deepEqual(readPromotedLearnings(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parses a promoted json block', () => {
  const body = '## Promoted\n\n```json\n[{"id":"L1","lesson":"x"}]\n```\n';
  const root = withRoot(body);
  try {
    const out = readPromotedLearnings(root);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'L1');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('throws on an unterminated json block', () => {
  const body = '## Promoted\n\n```json\n[{"id":"L1"}]\n';
  const root = withRoot(body);
  try {
    assert.throws(() => readPromotedLearnings(root), /unterminated/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
