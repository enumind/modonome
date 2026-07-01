import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPrompt, snapshotContext } from '../scripts/agent/render-prompt.mjs';

const fullEnv = {
  MAKER_ID: 'maker-1',
  MAKER_MODEL: 'model-a',
  CHECKER_ID: 'checker-1',
  CHECKER_MODEL: 'model-b',
  PROMOTED_LEARNINGS: '(none)',
  RUN_BRANCH: 'run/x',
};

test('rejects an invalid role name', () => {
  assert.throws(() => renderPrompt('Maker'), /invalid role/);
  assert.throws(() => renderPrompt('maker2'), /invalid role/);
});

test('substitutes every placeholder for the maker role', () => {
  const out = renderPrompt('maker', fullEnv);
  assert.ok(!out.includes('${'), 'no placeholder remains');
  assert.ok(out.includes('maker-1'));
});

test('substitutes every placeholder for the checker role', () => {
  const out = renderPrompt('checker', fullEnv);
  assert.ok(!out.includes('${'));
  assert.ok(out.includes('checker-1'));
});

test('throws when a referenced variable is unset', () => {
  const env = { ...fullEnv };
  delete env.RUN_BRANCH;
  assert.throws(() => renderPrompt('maker', env), /RUN_BRANCH/);
});

test('throws when a referenced variable is empty', () => {
  assert.throws(() => renderPrompt('maker', { ...fullEnv, MAKER_ID: '' }), /MAKER_ID/);
});

test('snapshotContext returns empty when no snapshot exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ctx-none-'));
  try {
    assert.equal(snapshotContext(dir), '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('snapshotContext summarizes the signature and states the concurrency protocol', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ctx-'));
  try {
    mkdirSync(join(dir, '.modonome', 'snapshot'), { recursive: true });
    writeFileSync(join(dir, '.modonome', 'snapshot', 'signature.json'), JSON.stringify({
      merkle_root: 'sha256:' + 'a'.repeat(64),
      snapshot_version: 3,
      stack: { name: 'Node or TypeScript', pm: 'npm' },
      size: { files: 12 },
      commands: { test: 'npm test', build: '', lint: '' },
      entrypoints: ['bin/x.mjs'],
    }));
    const out = snapshotContext(dir);
    assert.match(out, /merkle_root: sha256:a{64}/);
    assert.match(out, /snapshot_version: 3/);
    assert.match(out, /--verify/, 'states the re-verify step');
    assert.match(out, /--since/, 'states the reconcile step');
    assert.match(out, /open the live file before editing/i, 'read live before edit');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
