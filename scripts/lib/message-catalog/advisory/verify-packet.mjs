export const MESSAGES = {
  "advisory.verify-packet.no-peer-key": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: 'no peer key for alias "{alias}"',
  },
  "advisory.verify-packet.key-not-active": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: 'peer key "{alias}" is {status}',
  },
  "advisory.verify-packet.key-not-yet-valid": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: 'peer key "{alias}" is not valid before {notBefore}',
  },
  "advisory.verify-packet.key-expired": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: 'peer key "{alias}" expired at {notAfter}',
  },
  "advisory.verify-packet.content-gate-failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "content gate failed: {errors}",
  },
  "advisory.verify-packet.signature-malformed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "signature absent or malformed (signing mode requires a signature)",
  },
  "advisory.verify-packet.pubkey-mismatch": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "embedded public key does not match the allowlisted key for this alias",
  },
  "advisory.verify-packet.signature-invalid": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "signature does not verify over the canonical bytes",
  },
  "advisory.verify-packet.usage": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Usage: node scripts/verify-packet.mjs <packet.json> [peer-keys.json]",
  },
  "advisory.verify-packet.verification-failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Verification failed: {reason}",
  },
  "advisory.verify-packet.failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "verify-packet: {error}",
  },
};
