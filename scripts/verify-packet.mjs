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
import { signedBytes } from './lib/canonical-json.mjs';
import { verifyMessage, publicKeyFromB64, fingerprint } from './lib/ed25519.mjs';
import { validatePacket } from './validate-knowledge-packet.mjs';

// Resolve an alias to an active, in-window key entry in the allowlist.
export function resolveActiveKey(peerKeys, alias, now = new Date()) {
  const entry = (peerKeys.keys || []).find((k) => k.alias === alias);
  if (!entry) return { ok: false, reason: `no peer key for alias "${alias}"` };
  if (entry.status !== 'active') return { ok: false, reason: `peer key "${alias}" is ${entry.status}` };
  const t = now.getTime();
  if (entry.not_before && new Date(entry.not_before).getTime() > t) {
    return { ok: false, reason: `peer key "${alias}" is not valid before ${entry.not_before}` };
  }
  if (entry.not_after && new Date(entry.not_after).getTime() < t) {
    return { ok: false, reason: `peer key "${alias}" expired at ${entry.not_after}` };
  }
  return { ok: true, entry };
}

// Full ordered verification. options.skipContentGate runs only the signature checks
// (steps 3 to 5), used when the caller already ran the schema and redaction gate.
export function verifyPacket(packet, peerKeys, { now = new Date(), skipContentGate = false } = {}) {
  if (!skipContentGate) {
    const contentErrors = validatePacket(packet);
    if (contentErrors.length > 0) {
      return { ok: false, reason: `content gate failed: ${contentErrors.join('; ')}` };
    }
  }

  const sig = packet.signature;
  if (!sig || sig.alg !== 'ed25519' || !sig.key_alias || !sig.pubkey_b64 || !sig.sig_b64) {
    return { ok: false, reason: 'signature absent or malformed (signing mode requires a signature)' };
  }

  const res = resolveActiveKey(peerKeys, sig.key_alias, now);
  if (!res.ok) return res;

  if (res.entry.ed25519_pubkey_b64 !== sig.pubkey_b64) {
    return { ok: false, reason: 'embedded public key does not match the allowlisted key for this alias' };
  }

  const pub = publicKeyFromB64(sig.pubkey_b64);
  if (!verifyMessage(signedBytes(packet), sig.sig_b64, pub)) {
    return { ok: false, reason: 'signature does not verify over the canonical bytes' };
  }

  return { ok: true, key_alias: sig.key_alias, fingerprint: fingerprint(sig.pubkey_b64) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [packetPath, keysPath = '.modonome/peer-keys.json'] = process.argv.slice(2);
  if (!packetPath) {
    console.error('Usage: node scripts/verify-packet.mjs <packet.json> [peer-keys.json]');
    process.exit(2);
  }
  try {
    const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
    const peerKeys = JSON.parse(readFileSync(keysPath, 'utf8'));
    const result = verifyPacket(packet, peerKeys);
    if (result.ok) {
      console.log(`Verified: signed by "${result.key_alias}" (fingerprint ${result.fingerprint}).`);
      process.exit(0);
    }
    console.error(`Verification failed: ${result.reason}`);
    process.exit(1);
  } catch (e) {
    console.error(`verify-packet: ${e.message}`);
    process.exit(1);
  }
}
