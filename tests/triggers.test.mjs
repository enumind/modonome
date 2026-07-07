import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  normalizeTrigger,
  normalizeSchedule,
  roleCrons,
  schedulableCrewRoles,
  deriveTriggerSequence,
  renderScheduleWorkflow,
} from '../scripts/agent/triggers.mjs';
import { resolveRoleSequence } from '../scripts/agent/run-cycle.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

test('normalizeTrigger handles string, object, and absent forms', () => {
  assert.deepEqual(normalizeTrigger('schedule'), { type: 'schedule', after: [], cron: null });
  assert.deepEqual(normalizeTrigger({ type: 'after-role', after: ['maker'] }), {
    type: 'after-role',
    after: ['maker'],
    cron: null,
  });
  assert.deepEqual(normalizeTrigger(undefined), { type: null, after: [], cron: null });
});

test('normalizeSchedule reads cron and optional timezone, else null', () => {
  assert.deepEqual(normalizeSchedule({ cron: '0 6 * * 1', timezone: 'UTC' }), {
    cron: '0 6 * * 1',
    timezone: 'UTC',
  });
  assert.deepEqual(normalizeSchedule({ cron: '0 6 * * 1' }), { cron: '0 6 * * 1', timezone: null });
  assert.equal(normalizeSchedule(undefined), null);
});

test('roleCrons merges schedule.cron and trigger.cron, sorted and de-duplicated', () => {
  assert.deepEqual(roleCrons({ schedule: { cron: '0 6 * * 1' } }), ['0 6 * * 1']);
  assert.deepEqual(
    roleCrons({ schedule: { cron: '0 6 * * 1' }, trigger: { type: 'schedule', cron: '0 6 * * 1' } }),
    ['0 6 * * 1'],
  );
  assert.deepEqual(roleCrons({}), []);
});

test('schedulableCrewRoles excludes the core pair and self-govern', () => {
  const cfg = { roles: { maker: {}, checker: {}, 'self-govern': {}, researcher: {}, envisioner: {} } };
  assert.deepEqual(schedulableCrewRoles(cfg), ['envisioner', 'researcher']);
});

test('deriveTriggerSequence returns null when no role chains (default unchanged)', () => {
  assert.equal(deriveTriggerSequence({ roles: { maker: {}, checker: {} } }), null);
  // resolveRoleSequence therefore keeps the maker/checker default exactly.
  assert.deepEqual(resolveRoleSequence({ roles: { maker: {}, checker: {} } }), ['maker', 'checker']);
});

test('deriveTriggerSequence orders after-role chains, keeping the maker->checker spine', () => {
  const cfg = {
    roles: {
      maker: {},
      checker: {},
      researcher: {},
      envisioner: { trigger: { type: 'after-role', after: ['researcher'] } },
    },
  };
  const seq = deriveTriggerSequence(cfg);
  assert.ok(seq.indexOf('maker') < seq.indexOf('checker'), 'maker before checker');
  assert.ok(seq.indexOf('researcher') < seq.indexOf('envisioner'), 'researcher before envisioner');
  // resolveRoleSequence surfaces the chained order.
  assert.deepEqual(resolveRoleSequence(cfg), seq);
});

test('resolveRoleSequence still honors an explicit --roles override over trigger chains', () => {
  const cfg = { roles: { a: { trigger: { type: 'after-role', after: ['b'] } }, b: {} } };
  assert.deepEqual(resolveRoleSequence(cfg, { roles: ['b'] }), ['b']);
});

test('deriveTriggerSequence fails closed on a dangling after target', () => {
  assert.throws(
    () => deriveTriggerSequence({ roles: { a: { trigger: { type: 'after-role', after: ['ghost'] } } } }),
    /not a configured role/,
  );
});

test('deriveTriggerSequence fails closed on a cycle', () => {
  assert.throws(
    () =>
      deriveTriggerSequence({
        roles: {
          a: { trigger: { type: 'after-role', after: ['b'] } },
          b: { trigger: { type: 'after-role', after: ['a'] } },
        },
      }),
    /cycle detected/,
  );
});

test('renderScheduleWorkflow is deterministic and preserves governance invariants', () => {
  const cfg = { roles: { maker: {}, checker: {}, researcher: { schedule: { cron: '0 6 * * 1' } } } };
  const a = renderScheduleWorkflow(cfg);
  const b = renderScheduleWorkflow(cfg);
  assert.equal(a, b, 'same config renders identical bytes');
  assert.ok(a.includes('DO NOT EDIT'), 'generated banner present');
  assert.ok(a.includes("- cron: '0 6 * * 1'"), 'role cron emitted');
  assert.ok(a.includes('--dry-run') && a.includes('MODONOME_SCHEDULE_EXECUTE'), 'dry-run default and execute gate');
  assert.ok(!/^  maker:/m.test(a) && !/^  checker:/m.test(a), 'core pair not scheduled here');
});

test('an empty config renders a valid no-op workflow rather than an invalid empty one', () => {
  const wf = renderScheduleWorkflow({ roles: {} });
  assert.ok(wf.includes('noop:'), 'no-op job present');
  assert.ok(wf.includes('workflow_dispatch:'), 'manual dispatch always available');
});

test('the committed .github/workflows/modonome-schedule.yml matches the current config', async () => {
  // Mirrors the snapshot/prompt freshness gates: the generated file must not drift from
  // what the schedule/trigger config implies. Regenerate with `triggers.mjs --write`.
  const { loadConfig } = await import('../scripts/validate-config.mjs');
  const cfg = loadConfig(join(root, '.modonome', 'config.yaml'));
  const expected = renderScheduleWorkflow(cfg);
  const actual = readFileSync(join(root, '.github', 'workflows', 'modonome-schedule.yml'), 'utf8');
  assert.equal(actual, expected, 'run: node scripts/agent/triggers.mjs --write');
});
