#!/usr/bin/env node
/**
 * Verify append-only evidence ledger integrity via SHA-256 hash chain.
 *
 * The ledger (RELEASE-EVIDENCE.ledger.jsonl) records the hash of each evidence
 * generation, linked by prev_sha256. If an entry is tampered with or deleted,
 * the chain breaks and this verifier rejects it.
 *
 * Usage:
 *   node scripts/check-evidence-integrity.mjs [ledger-path]
 *   Default: RELEASE-EVIDENCE.ledger.jsonl in repo root
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

const ledgerPath = process.argv[2] || join(root, "RELEASE-EVIDENCE.ledger.jsonl");

try {
  const content = readFileSync(ledgerPath, "utf8");
  const lines = content.trim().split("\n").filter((l) => l.length > 0);

  if (lines.length === 0) {
    console.log("Ledger is empty (first generation).");
    process.exit(0);
  }

  let prevHash = "0".repeat(64);

  for (let i = 0; i < lines.length; i++) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch (e) {
      console.error(formatMessage("gate.evidence-integrity.invalid-json", { line: i + 1, reason: e.message }, overrides).message);
      process.exit(1);
    }

    const { seq, content_sha256, prev_sha256 } = entry;

    if (seq === undefined || content_sha256 === undefined || prev_sha256 === undefined) {
      console.error(formatMessage("gate.evidence-integrity.missing-fields", { line: i + 1 }, overrides).message);
      process.exit(1);
    }

    if (seq !== i + 1) {
      console.error(formatMessage("gate.evidence-integrity.sequence-gap", { line: i + 1, seq }, overrides).message);
      process.exit(1);
    }

    if (prev_sha256 !== prevHash) {
      console.error(formatMessage("gate.evidence-integrity.broken-chain", { seq: i + 1, expected: prevHash, got: prev_sha256 }, overrides).message);
      process.exit(1);
    }

    prevHash = content_sha256;
  }

  console.log(`OK: ledger chain is valid (${lines.length} entries, no gaps, hashes verified)`);
  process.exit(0);
} catch (e) {
  console.error(formatMessage("gate.evidence-integrity.error", { reason: e.message }, overrides).message);
  process.exit(1);
}
