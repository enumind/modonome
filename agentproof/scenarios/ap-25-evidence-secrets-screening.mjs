#!/usr/bin/env node
/**
 * AP-25: Evidence is scanned for secrets/PII before capture
 *
 * Attack: Evidence/learning capture reads a run log containing API keys, bearer
 * tokens, emails, or private IPs and commits it to RELEASE-EVIDENCE.md or a
 * promoted learning : leaking credentials into the public repo. validate-knowledge-packet.mjs
 * already screens packets (AP-08), but the broader evidence/learning capture path is unprotected.
 *
 * Governance property: Any text destined for committed evidence/learning MUST pass
 * deterministic secret/PII scan (AWS keys, bearer tokens, private keys, emails, internal IPs)
 * before capture. Content matching patterns MUST block capture (exit 1), not be redacted-and-committed.
 *
 * Expected outcome: check-evidence-secrets.mjs scans metrics fixtures.
 * Secret-laden fixture → exit 1 naming pattern class.
 * Clean fixture → exit 0.
 *
 * Regression: AP-08 packet validator must still catch its existing raw-code-leak
 * fixture after the secret-patterns refactor extracted shared patterns into
 * scripts/lib/secret-patterns.mjs.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const scanner = join(root, "scripts/check-evidence-secrets.mjs");
const packetValidator = join(root, "scripts/validate-knowledge-packet.mjs");
const fixtures = join(here, "../fixtures");

// ── pre-flight ────────────────────────────────────────────────────────────────

if (!existsSync(scanner)) {
  console.error("FAIL: scripts/check-evidence-secrets.mjs does not exist (control not implemented)");
  process.exit(1);
}

if (!existsSync(packetValidator)) {
  console.error("FAIL: scripts/validate-knowledge-packet.mjs does not exist (AP-08 regression cannot run)");
  process.exit(1);
}

// ── AP-25-A: secret-laden evidence fixture must be rejected (exit 1) ──────────

const withSecrets = spawnSync(
  "node",
  [scanner, join(fixtures, "evidence-with-secret-metrics.jsonl")],
  { encoding: "utf8" },
);

if (withSecrets.status === 0) {
  console.error("FAIL: scanner did not detect secrets in evidence (exit 0, expected 1)");
  process.exit(1);
}

// The rejection output must name the matched pattern class so the operator
// knows which category of secret triggered the block.
const secretOutput = withSecrets.stdout + withSecrets.stderr;
const PATTERN_CLASSES = [
  "private key",
  "AWS access key",
  "bearer or api token",
  "email address",
  "private IPv4",
  "internal hostname",
  "code fence",
];
const namedClass = PATTERN_CLASSES.some((cls) => secretOutput.includes(cls));
if (!namedClass) {
  console.error("FAIL: scanner output does not name a pattern class (expected one of: " + PATTERN_CLASSES.join(", ") + ")");
  console.error("Actual output:", secretOutput);
  process.exit(1);
}

// ── AP-25-B: clean evidence fixture must be accepted (exit 0) ─────────────────

const clean = spawnSync(
  "node",
  [scanner, join(fixtures, "evidence-clean-metrics.jsonl")],
  { encoding: "utf8" },
);

if (clean.status !== 0) {
  console.error("FAIL: scanner rejected clean evidence (exit 1, expected 0)");
  console.error(clean.stderr);
  process.exit(1);
}

// ── AP-08 regression: packet validator must still catch the raw-code-leak ─────
// After the secret-patterns refactor moved patterns into a shared lib, confirm
// validate-knowledge-packet.mjs still imports from that lib correctly and
// rejects the code-fence fixture that AP-08 was originally written against.

const packetResult = spawnSync(
  "node",
  [packetValidator, join(fixtures, "packet-raw-code-leak.json")],
  { encoding: "utf8" },
);

if (packetResult.status === 0) {
  console.error("FAIL (AP-08 regression): packet validator accepted a packet containing a raw code fence after secret-patterns refactor (exit 0, expected 1)");
  process.exit(1);
}

const packetMsg = packetResult.stderr + packetResult.stdout;
if (!packetMsg.toLowerCase().includes("code") && !packetMsg.toLowerCase().includes("redact")) {
  console.error("FAIL (AP-08 regression): rejection output does not mention code content or redaction requirement");
  console.error(packetMsg);
  process.exit(1);
}

console.log("PASS: evidence is scanned for secrets/PII before capture");
console.log("PASS (AP-08 regression): packet validator still catches raw-code-leak fixture after secret-patterns refactor");
