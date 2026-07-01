import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { runGateCapped } from '../scripts/lib/run-gate-capped.mjs';

test('captures status and stdout of a successful command', () => {
  const r = runGateCapped(['node', '-e', 'process.stdout.write("ok")']);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'ok');
  assert.equal(r.timedOut, false);
});

test('reports a non-zero status', () => {
  const r = runGateCapped(['node', '-e', 'process.exit(3)']);
  assert.equal(r.status, 3);
  assert.equal(r.timedOut, false);
});

test('flags a command that exceeds the timeout', () => {
  const r = runGateCapped(['node', '-e', 'setTimeout(()=>{}, 5000)'], { timeoutMs: 100 });
  assert.equal(r.timedOut, true);
});
