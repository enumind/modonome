import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { canonicalize, signedBytes, PACKET_DOMAIN } from '../scripts/lib/canonical-json.mjs';
import {
  generateKeypair,
  publicKeyB64,
  publicKeyFromB64,
  privateKeyToB64Pkcs8,
  privateKeyFromB64Pkcs8,
  signMessage,
  verifyMessage,
  fingerprint,
} from '../scripts/lib/ed25519.mjs';
import { computePacketId, packetIdMatches } from '../scripts/lib/packet-id.mjs';
import { signPacket } from '../scripts/sign-packet.mjs';
import { verifyPacket, resolveActiveKey } from '../scripts/verify-packet.mjs';

// --- canonical-json ---

test('canonicalize is independent of key insertion order', () => {
  assert.equal(canonicalize({ b: 1, a: 2 }), canonicalize({ a: 2, b: 1 }));
  assert.equal(canonicalize({ a: 2, b: 1 }), '{"a":2,"b":1}');
});

test('canonicalize drops undefined members and handles arrays', () => {
  assert.equal(canonicalize({ a: 1, b: undefined }), '{"a":1}');
  assert.equal(canonicalize([1, 'x', { z: 1 }]), '[1,"x",{"z":1}]');
});

test('signedBytes prepends the domain tag and excludes the signature', () => {
  const a = signedBytes({ x: 1, signature: { sig_b64: 'zzz' } });
  const b = signedBytes({ x: 1 });
  assert.equal(a, b);
  assert.ok(a.startsWith(PACKET_DOMAIN));
});

// --- ed25519 ---

test('sign and verify round trip', () => {
  const { publicKey, privateKey } = generateKeypair();
  const sig = signMessage('hello', privateKey);
  assert.equal(verifyMessage('hello', sig, publicKey), true);
  assert.equal(verifyMessage('tampered', sig, publicKey), false);
});

test('public key base64 round trips to a working key object', () => {
  const { privateKey } = generateKeypair();
  const b64 = publicKeyB64(privateKey);
  const pub = publicKeyFromB64(b64);
  const sig = signMessage('m', privateKey);
  assert.equal(verifyMessage('m', sig, pub), true);
});

test('private key base64 pkcs8 round trips', () => {
  const { privateKey, publicKey } = generateKeypair();
  const reloaded = privateKeyFromB64Pkcs8(privateKeyToB64Pkcs8(privateKey));
  const sig = signMessage('m', reloaded);
  assert.equal(verifyMessage('m', sig, publicKey), true);
});

test('fingerprint is deterministic and short', () => {
  const { privateKey } = generateKeypair();
  const b64 = publicKeyB64(privateKey);
  assert.equal(fingerprint(b64), fingerprint(b64));
  assert.equal(fingerprint(b64).length, 16);
});

// --- packet-id ---

test('packet id is deterministic and excludes volatile fields', () => {
  const base = { schema_version: 1, topic: 't' };
  const id1 = computePacketId(base);
  const id2 = computePacketId({ ...base, id: 'sha256:whatever', signature: { sig_b64: 'x' } });
  assert.equal(id1, id2);
  assert.ok(id1.startsWith('sha256:'));
});

test('packet id changes when content changes', () => {
  assert.notEqual(computePacketId({ topic: 'a' }), computePacketId({ topic: 'b' }));
});

test('packetIdMatches validates a self-consistent id', () => {
  const p = { topic: 't' };
  p.id = computePacketId(p);
  assert.equal(packetIdMatches(p), true);
  assert.equal(packetIdMatches({ ...p, id: 'sha256:wrong' }), false);
});

// --- sign + verify orchestration ---

function setup() {
  const { privateKey } = generateKeypair();
  const pubB64 = publicKeyB64(privateKey);
  const peerKeys = {
    schema_version: 1,
    keys: [{ alias: 'peer-a', ed25519_pubkey_b64: pubB64, added_by: 'owner', added_at: '2026-01-01T00:00:00Z', status: 'active' }],
  };
  const packet = { schema_version: 1, id: 'x', topic: 'lesson', classification: 'public' };
  return { privateKey, pubB64, peerKeys, packet };
}

test('a signed packet verifies against the allowlist', () => {
  const { privateKey, peerKeys, packet } = setup();
  const signed = signPacket(packet, privateKey, { keyAlias: 'peer-a', signedAt: '2026-02-01T00:00:00Z' });
  const r = verifyPacket(signed, peerKeys, { skipContentGate: true });
  assert.equal(r.ok, true);
  assert.equal(r.key_alias, 'peer-a');
});

test('a tampered body fails verification', () => {
  const { privateKey, peerKeys, packet } = setup();
  const signed = signPacket(packet, privateKey, { keyAlias: 'peer-a', signedAt: '2026-02-01T00:00:00Z' });
  signed.topic = 'tampered';
  const r = verifyPacket(signed, peerKeys, { skipContentGate: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /does not verify/);
});

test('a missing signature is a hard failure', () => {
  const { peerKeys, packet } = setup();
  const r = verifyPacket(packet, peerKeys, { skipContentGate: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /absent or malformed/);
});

test('a revoked key fails', () => {
  const { privateKey, peerKeys, packet } = setup();
  peerKeys.keys[0].status = 'revoked';
  const signed = signPacket(packet, privateKey, { keyAlias: 'peer-a', signedAt: '2026-02-01T00:00:00Z' });
  const r = verifyPacket(signed, peerKeys, { skipContentGate: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /revoked/);
});

test('an out-of-window key fails', () => {
  const { privateKey, peerKeys, packet } = setup();
  peerKeys.keys[0].not_after = '2026-01-15T00:00:00Z';
  const signed = signPacket(packet, privateKey, { keyAlias: 'peer-a', signedAt: '2026-02-01T00:00:00Z' });
  const r = verifyPacket(signed, peerKeys, { now: new Date('2026-02-01T00:00:00Z'), skipContentGate: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /expired/);
});

test('a public key that does not match the allowlist fails', () => {
  const { privateKey, peerKeys, packet } = setup();
  const other = generateKeypair();
  peerKeys.keys[0].ed25519_pubkey_b64 = publicKeyB64(other.privateKey);
  const signed = signPacket(packet, privateKey, { keyAlias: 'peer-a', signedAt: '2026-02-01T00:00:00Z' });
  const r = verifyPacket(signed, peerKeys, { skipContentGate: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /does not match the allowlisted key/);
});

test('an unknown alias fails to resolve', () => {
  const { peerKeys } = setup();
  const r = resolveActiveKey(peerKeys, 'nobody');
  assert.equal(r.ok, false);
  assert.match(r.reason, /no peer key/);
});

test('the content gate runs when not skipped', () => {
  const { peerKeys } = setup();
  const r = verifyPacket({}, peerKeys, { skipContentGate: false });
  assert.equal(r.ok, false);
  assert.match(r.reason, /content gate failed/);
});
