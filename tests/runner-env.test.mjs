import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildRunnerEnv, planCycle } from '../scripts/agent/run-cycle.mjs';

test('buildRunnerEnv routes to a base_url when the model has one', () => {
  const env = buildRunnerEnv({ PATH: '/bin' }, { modelBaseUrl: 'http://localhost:11434' });
  assert.equal(env.ANTHROPIC_BASE_URL, 'http://localhost:11434');
  assert.equal(env.PATH, '/bin');
});

test('buildRunnerEnv leaves the endpoint unset when there is no base_url', () => {
  const env = buildRunnerEnv({ PATH: '/bin' }, { modelBaseUrl: undefined });
  assert.equal(env.ANTHROPIC_BASE_URL, undefined);
});

test('buildRunnerEnv does not mutate the input env', () => {
  const base = { PATH: '/bin' };
  buildRunnerEnv(base, { modelBaseUrl: 'http://x' });
  assert.equal(base.ANTHROPIC_BASE_URL, undefined);
});

test('buildRunnerEnv tolerates a missing role', () => {
  const env = buildRunnerEnv({ A: '1' }, null);
  assert.equal(env.A, '1');
  assert.equal(env.ANTHROPIC_BASE_URL, undefined);
});

const localCfg = {
  remote_model_budget_usd_per_day: 0,
  roles: { maker: { model: 'local-a' }, checker: { model: 'local-b' } },
  models: {
    'local-a': { provider: 'local', base_url: 'http://localhost:11434' },
    'local-b': { provider: 'local', base_url: 'http://localhost:11435' },
  },
};

test('a local-provider plan is not remote and needs no budget', () => {
  const plan = planCycle({ target: 'examples/demo-app' }, localCfg, 'run-1');
  assert.equal(plan.usesRemote, false);
  assert.equal(plan.maker.modelBaseUrl, 'http://localhost:11434');
  assert.equal(plan.checker.modelBaseUrl, 'http://localhost:11435');
});

test('the resolved local endpoint flows into the runner env', () => {
  const plan = planCycle({ target: 'examples/demo-app' }, localCfg, 'run-2');
  const env = buildRunnerEnv({}, plan.maker);
  assert.equal(env.ANTHROPIC_BASE_URL, 'http://localhost:11434');
});

test('an anthropic model with zero budget is still treated as remote', () => {
  const cfg = {
    remote_model_budget_usd_per_day: 0,
    roles: { maker: { model: 'a' }, checker: { model: 'b' } },
    models: { a: { provider: 'anthropic' }, b: { provider: 'anthropic' } },
  };
  const plan = planCycle({ target: 'examples/demo-app' }, cfg, 'run-3');
  assert.equal(plan.usesRemote, true);
  assert.equal(plan.remoteAllowed, false);
});
