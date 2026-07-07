#!/usr/bin/env node
// Sign a knowledge packet with Ed25519 over the domain-separated JCS bytes
// (ADR-017). The private key is read from MODONOME_SIGNING_KEY (base64 PKCS8 DER),
// a CI secret injected like ANTHROPIC_API_KEY (ADR-011); it is never written to an
// agent-readable file. The signature object travels embedded in the packet but
// covers only the packet with the signature removed.
//
// Usage: MODONOME_SIGNING_KEY=<b64-pkcs8> node scripts/sign-packet.mjs <packet.json> <key_alias>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { signedBytes } from './lib/canonical-json.mjs';
import {
  signMessage,
  publicKeyB64,
  privateKeyFromB64Pkcs8,
  fingerprint,
} from './lib/ed25519.mjs';
import { formatMessage, loadMessageOverrides } from './lib/messages.mjs';

// Pure: attach a signature object to a packet using the given private key.
// `overrides` (from loadMessageOverrides()) is an optional caller-supplied
// parameter rather than something this function reads itself, so it stays
// pure and test-friendly.
export function signPacket(packet, privateKeyObject, { keyAlias, signedAt }, overrides = {}) {
  if (!keyAlias) throw new Error(formatMessage('advisory.sign-packet.key-alias-required', {}, overrides).message);
  if (!signedAt) throw new Error(formatMessage('advisory.sign-packet.signed-at-required', {}, overrides).message);
  const { signature, ...rest } = packet;
  void signature;
  const pubkey_b64 = publicKeyB64(privateKeyObject);
  const sig_b64 = signMessage(signedBytes(rest), privateKeyObject);
  return {
    ...rest,
    signature: { alg: 'ed25519', key_alias: keyAlias, pubkey_b64, sig_b64, signed_at: signedAt },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const overrides = loadMessageOverrides(join(here, '..', '.modonome'));
  const [path, keyAlias] = process.argv.slice(2);
  if (!path || !keyAlias) {
    console.error(formatMessage('advisory.sign-packet.usage', {}, overrides).message);
    process.exit(2);
  }
  const envKey = process.env.MODONOME_SIGNING_KEY;
  if (!envKey) {
    console.error(formatMessage('advisory.sign-packet.no-signing-key', {}, overrides).message);
    process.exit(1);
  }
  try {
    const privateKey = privateKeyFromB64Pkcs8(envKey);
    const packet = JSON.parse(readFileSync(path, 'utf8'));
    const signed = signPacket(packet, privateKey, {
      keyAlias,
      signedAt: new Date().toISOString(),
    }, overrides);
    writeFileSync(path, JSON.stringify(signed, null, 2) + '\n');
    console.log(`Signed ${path} as "${keyAlias}" (key fingerprint ${fingerprint(signed.signature.pubkey_b64)}).`);
  } catch (e) {
    console.error(formatMessage('advisory.sign-packet.failed', { error: e.message }, overrides).message);
    process.exit(1);
  }
}
