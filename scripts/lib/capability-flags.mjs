// The capability flags that expand the engine's authority and trust boundary (ADR-024).
// A single source of truth shared by the promotion-readiness gate
// (scripts/check-promotion-readiness.mjs), which fails if any ships default-on without an
// evidence-backed promotion ADR, and the policy attestation
// (scripts/lib/policy-manifest.mjs), which discloses each flag and its default. One list
// means the disclosed capability set can never drift from the gated one.
export const CAPABILITY_FLAGS = [
  "repo_network_enabled",
  "market_scan_enabled",
  "envisioner_enabled",
  "remediation_apply_enabled",
];
