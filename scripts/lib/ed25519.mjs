// Ed25519 signing helpers built on Node's crypto. The repo calls vetted crypto
// rather than reimplementing it. Public keys travel as base64 of the raw 32 bytes
// (the JWK x value); private keys travel as base64 of PKCS8 DER, which is the
// MODONOME_SIGNING_KEY format.
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
  createHash,
} from 'node:crypto';

export function generateKeypair() {
  return generateKeyPairSync('ed25519');
}

// Raw 32-byte public key as base64, accepting either a public or private KeyObject.
export function publicKeyB64(keyObject) {
  const pub = keyObject.type === 'private' ? createPublicKey(keyObject) : keyObject;
  const jwk = pub.export({ format: 'jwk' });
  return Buffer.from(jwk.x, 'base64url').toString('base64');
}

// Public KeyObject from a raw 32-byte base64 public key.
export function publicKeyFromB64(b64) {
  const x = Buffer.from(b64, 'base64').toString('base64url');
  return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' });
}

// Private KeyObject from base64 PKCS8 DER (the env-secret format).
export function privateKeyFromB64Pkcs8(b64) {
  return createPrivateKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'pkcs8' });
}

export function privateKeyToB64Pkcs8(keyObject) {
  return keyObject.export({ format: 'der', type: 'pkcs8' }).toString('base64');
}

export function signMessage(message, privateKeyObject) {
  return cryptoSign(null, Buffer.from(message), privateKeyObject).toString('base64');
}

export function verifyMessage(message, sigB64, publicKeyObject) {
  try {
    return cryptoVerify(null, Buffer.from(message), publicKeyObject, Buffer.from(sigB64, 'base64'));
  } catch {
    return false;
  }
}

// Short fingerprint for out-of-band key comparison (ADR-017 enrollment): the first
// 16 hex characters of sha256 over the raw public key bytes.
export function fingerprint(pubB64) {
  return createHash('sha256').update(Buffer.from(pubB64, 'base64')).digest('hex').slice(0, 16);
}
