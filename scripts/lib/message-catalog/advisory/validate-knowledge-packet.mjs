export const MESSAGES = {
  "advisory.knowledge-packet.secret-detected": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "packet may contain {name}; remove it before publish.",
  },
  "advisory.knowledge-packet.classification-not-publishable": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "packet classification {classification} is not publishable.",
  },
  "advisory.knowledge-packet.local-validation-required": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "local_validation_required must be true.",
  },
  "advisory.knowledge-packet.invalid-timestamp": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "published_at is not a valid ISO timestamp: {publishedAt}",
  },
  "advisory.knowledge-packet.backdated-timestamp": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template:
      "published_at timestamp {publishedAt} predates the earliest valid system epoch ({earliest}); backdated packets are rejected.",
  },
  "advisory.knowledge-packet.usage": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Usage: node scripts/validate-knowledge-packet.mjs <packet.json>",
  },
  "advisory.knowledge-packet.not-publishable": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Packet not publishable: {path}",
  },
};
