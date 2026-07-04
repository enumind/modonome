#!/usr/bin/env node
// Verify a knowledge packet signature against this repo's committed peer-key
// allowlist (ADR-017). Runs the ordered check: schema and redaction gate, then the
// signature must be present and well-formed (absence is a hard failure, never a
// downgrade to unsigned), the alias must resolve to an active in-window key whose
// bytes equal the embedded public key, and Ed25519 must verify over the recomputed
// domain-separated JCS bytes. The allowlist is the live revocation list, so a key
// flipped to revoked or moved out of its window fails here. Designed to run from the
// protected base branch in CI scope (ADR-019).
//
// Usage: node scripts/verify-packet.mjs <packet.json> [peer-keys.json]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { signedBytes } from './lib/canonical-json.mjs';
import { verifyMessage, publicKeyFromB64, fingerprint } from './lib/ed25519.mjs';
import { validatePacket } from './validate-knowledge-packet.mjs';
import { formatMessage, loadMessageOverrides } from './lib/messages.mjs';

// Resolve an alias to an active, in-window key entry in the allowlist.
// `overrides` (from loadMessageOverrides()) is an optional caller-supplied
// parameter rather than something this function reads itself, so it stays
// pure and test-friendly.
export function resolveActiveKey(peerKeys, alias, now = new Date(), overrides = {}) {
  const msg = (id, params) => formatMessage(id, params, overrides).message;
  const entry = (peerKeys.keys || []).find((k) => k.alias === alias);
  if (!entry) return { ok: false, reason: msg('advisory.verify-packet.no-peer-key', { alias }) };
  if (entry.status !== 'active') return { ok: false, reason: msg('advisory.verify-packet.key-not-active', { alias, status: entry.status }) };
  const t = now.getTime();
  if (entry.not_before && new Date(entry.not_before).getTime() > t) {
    return { ok: false, reason: msg('advisory.verify-packet.key-not-yet-valid', { alias, notBefore: entry.not_before }) };
  }
  if (entry.not_after && new Date(entry.not_after).getTime() < t) {
    return { ok: false, reason: msg('advisory.verify-packet.key-expired', { alias, notAfter: entry.not_after }) };
  }
  return { ok: true, entry };
}

// Full ordered verification. options.skipContentGate runs only the signature checks
// (steps 3 to 5), used when the caller already ran the schema and redaction gate.
export function verifyPacket(packet, peerKeys, { now = new Date(), skipContentGate = false, overrides = {} } = {}) {
  const msg = (id, params) => formatMessage(id, params, overrides).message;
  if (!skipContentGate) {
    const contentErrors = validatePacket(packet);
    if (contentErrors.length > 0) {
      return { ok: false, reason: msg('advisory.verify-packet.content-gate-failed', { errors: contentErrors.join('; ') }) };
    }
  }

  const sig = packet.signature;
  if (!sig || sig.alg !== 'ed25519' || !sig.key_alias || !sig.pubkey_b64 || !sig.sig_b64) {
    return { ok: false, reason: msg('advisory.verify-packet.signature-malformed', {}) };
  }

  const res = resolveActiveKey(peerKeys, sig.key_alias, now, overrides);
  if (!res.ok) return res;

  if (res.entry.ed25519_pubkey_b64 !== sig.pubkey_b64) {
    return { ok: false, reason: msg('advisory.verify-packet.pubkey-mismatch', {}) };
  }

  const pub = publicKeyFromB64(sig.pubkey_b64);
  if (!verifyMessage(signedBytes(packet), sig.sig_b64, pub)) {
    return { ok: false, reason: msg('advisory.verify-packet.signature-invalid', {}) };
  }

  return { ok: true, key_alias: sig.key_alias, fingerprint: fingerprint(sig.pubkey_b64) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const overrides = loadMessageOverrides(join(here, '..', '.modonome'));
  const [packetPath, keysPath = '.modonome/peer-keys.json'] = process.argv.slice(2);
  if (!packetPath) {
    console.error(formatMessage('advisory.verify-packet.usage', {}, overrides).message);
    process.exit(2);
  }
  try {
    const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
    const peerKeys = JSON.parse(readFileSync(keysPath, 'utf8'));
    const result = verifyPacket(packet, peerKeys, { overrides });
    if (result.ok) {
      console.log(`Verified: signed by "${result.key_alias}" (fingerprint ${result.fingerprint}).`);
      process.exit(0);
    }
    console.error(formatMessage('advisory.verify-packet.verification-failed', { reason: result.reason }, overrides).message);
    process.exit(1);
  } catch (e) {
    console.error(formatMessage('advisory.verify-packet.failed', { error: e.message }, overrides).message);
    process.exit(1);
  }
}
