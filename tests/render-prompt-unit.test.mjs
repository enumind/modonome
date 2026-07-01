import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderPrompt } from '../scripts/agent/render-prompt.mjs';

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
