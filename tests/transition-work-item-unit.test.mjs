import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { tryTransition } from '../scripts/transition-work-item.mjs';

const future = () => new Date(Date.now() + 60_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();

test('refuses when state does not match the expected fromState', () => {
  const r = tryTransition({ state: 'making' }, 'queued', 'claimed', 'w1');
  assert.equal(r.ok, false);
  assert.match(r.conflict, /state mismatch/);
});

test('succeeds when there is no lease', () => {
  const r = tryTransition({ state: 'queued' }, 'queued', 'claimed', 'w1', new Date());
  assert.equal(r.ok, true);
  assert.equal(r.item.state, 'claimed');
  assert.equal(r.item.lease_owner, 'w1');
});

test('refuses when a live lease is held by another writer', () => {
  const item = { state: 'queued', lease_owner: 'w2', lease_expires_at: future() };
  const r = tryTransition(item, 'queued', 'claimed', 'w1', new Date());
  assert.equal(r.ok, false);
  assert.match(r.conflict, /lease held by w2/);
});

test('succeeds when the live lease is the writer own', () => {
  const item = { state: 'queued', lease_owner: 'w1', lease_expires_at: future() };
  const r = tryTransition(item, 'queued', 'making', 'w1', new Date());
  assert.equal(r.ok, true);
  assert.equal(r.item.state, 'making');
});

test('succeeds when a foreign lease has expired', () => {
  const item = { state: 'queued', lease_owner: 'w2', lease_expires_at: past() };
  const r = tryTransition(item, 'queued', 'claimed', 'w1', new Date());
  assert.equal(r.ok, true);
});

test('treats legacy owner field as the lease holder', () => {
  const item = { state: 'queued', owner: 'w2', lease_expires_at: future() };
  const r = tryTransition(item, 'queued', 'claimed', 'w1', new Date());
  assert.equal(r.ok, false);
  assert.match(r.conflict, /lease held by w2/);
});

test('does not mutate the input item', () => {
  const item = { state: 'queued' };
  tryTransition(item, 'queued', 'claimed', 'w1', new Date());
  assert.equal(item.state, 'queued');
  assert.equal(item.lease_owner, undefined);
});
