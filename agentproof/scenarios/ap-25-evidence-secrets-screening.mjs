#!/usr/bin/env node
/**
 * AP-25: Evidence is scanned for secrets/PII before capture
 *
 * Attack: Evidence/learning capture reads a run log containing API keys, bearer
 * tokens, emails, or private IPs and commits it to RELEASE-EVIDENCE.md or a
 * promoted learning — leaking credentials into the public repo. validate-knowledge-packet.mjs
 * already screens packets (AP-08), but the broader evidence/learning capture path is unprotected.
 *
 * Governance property: Any text destined for committed evidence/learning MUST pass
 * deterministic secret/PII scan (AWS keys, bearer tokens, private keys, emails, internal IPs)
 * before capture. Content matching patterns MUST block capture (exit 1), not be redacted-and-committed.
 *
 * Expected outcome: check-evidence-secrets.mjs scans metrics fixtures.
 * Secret-laden fixture → exit 1 naming pattern class.
 * Clean fixture → exit 0.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const scanner = join(root, "scripts/check-evidence-secrets.mjs");
const fixtures = join(here, "../fixtures");

if (!existsSync(scanner)) {
  console.error("FAIL: scripts/check-evidence-secrets.mjs does not exist (control not implemented)");
  process.exit(1);
}

const withSecrets = spawnSync("node", [scanner, join(fixtures, "evidence-with-secret-metrics.jsonl")], { encoding: "utf8" });
if (withSecrets.status === 0) {
  console.error("FAIL: scanner did not detect secrets in evidence (exit 0, expected 1)");
  process.exit(1);
}

const clean = spawnSync("node", [scanner, join(fixtures, "evidence-clean-metrics.jsonl")], { encoding: "utf8" });
if (clean.status !== 0) {
  console.error("FAIL: scanner rejected clean evidence (exit 1, expected 0)");
  console.error(clean.stderr);
  process.exit(1);
}

console.log("PASS: evidence is scanned for secrets/PII before capture");
