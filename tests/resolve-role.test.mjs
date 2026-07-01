import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolveRole } from '../scripts/agent/resolve-role.mjs';

test('maker and checker resolve role-specific defaults from an empty config', () => {
  const maker = resolveRole({}, 'maker');
  assert.equal(maker.runner, 'container');
  assert.equal(maker.model, 'claude-sonnet-4-6');
  assert.equal(maker.modelProvider, 'anthropic');
  assert.equal(maker.modelBaseUrl, undefined);
  assert.deepEqual(maker.runnerLabels, ['ubuntu-latest']);
  assert.equal(maker.cliPath, 'claude');

  const checker = resolveRole({}, 'checker');
  assert.equal(checker.model, 'claude-opus-4-8');
});

test('unknown role falls back to the generic default', () => {
  const r = resolveRole({}, 'merger');
  assert.equal(r.runner, 'container');
  assert.equal(r.model, 'claude-sonnet-4-6');
});

test('config role values override defaults', () => {
  const cfg = { roles: { maker: { runner: 'local', model: 'm1' } } };
  const r = resolveRole(cfg, 'maker');
  assert.equal(r.runner, 'local');
  assert.equal(r.model, 'm1');
  assert.deepEqual(r.runnerLabels, ['self-hosted']);
});

test('unknown runner falls back to container runner defaults', () => {
  const cfg = { roles: { maker: { runner: 'mystery' } } };
  const r = resolveRole(cfg, 'maker');
  assert.deepEqual(r.runnerLabels, ['ubuntu-latest']);
  assert.equal(r.cliPath, 'claude');
});

test('runner config overrides labels and cli path', () => {
  const cfg = {
    roles: { maker: { runner: 'local', model: 'm' } },
    runners: { local: { labels: ['self-hosted', 'mac-mini'], cli_path: '/usr/bin/agent' } },
  };
  const r = resolveRole(cfg, 'maker');
  assert.deepEqual(r.runnerLabels, ['self-hosted', 'mac-mini']);
  assert.equal(r.cliPath, '/usr/bin/agent');
});

test('model provider and base_url are read from the models registry', () => {
  const cfg = {
    roles: { 'self-govern': { runner: 'local', model: 'local-default' } },
    models: { 'local-default': { provider: 'local', base_url: 'http://localhost:11434' } },
  };
  const r = resolveRole(cfg, 'self-govern');
  assert.equal(r.modelProvider, 'local');
  assert.equal(r.modelBaseUrl, 'http://localhost:11434');
});

test('provider defaults to anthropic when the model entry omits it', () => {
  const cfg = { roles: { maker: { model: 'x' } }, models: { x: {} } };
  const r = resolveRole(cfg, 'maker');
  assert.equal(r.modelProvider, 'anthropic');
  assert.equal(r.modelBaseUrl, undefined);
});
