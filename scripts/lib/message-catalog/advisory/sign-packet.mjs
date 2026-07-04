export const MESSAGES = {
  "advisory.sign-packet.key-alias-required": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "sign-packet: keyAlias is required.",
  },
  "advisory.sign-packet.signed-at-required": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "sign-packet: signedAt is required.",
  },
  "advisory.sign-packet.usage": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Usage: node scripts/sign-packet.mjs <packet.json> <key_alias>",
  },
  "advisory.sign-packet.no-signing-key": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "sign-packet: MODONOME_SIGNING_KEY is not set. It must be a CI secret, not a file.",
  },
  "advisory.sign-packet.failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "sign-packet: {error}",
  },
};
