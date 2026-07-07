export const MESSAGES = {
  "gate.evidence-integrity.invalid-json": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: line {line} is not valid JSON: {reason}",
  },
  "gate.evidence-integrity.missing-fields": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: line {line} missing required fields (seq, content_sha256, prev_sha256)",
  },
  "gate.evidence-integrity.sequence-gap": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: sequence gap at seq {line} (expected {seq})",
  },
  "gate.evidence-integrity.broken-chain": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: broken hash chain at seq {seq}. Expected prev_sha256={expected}, got {got}",
  },
  "gate.evidence-integrity.error": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {reason}",
  },
};
