#!/usr/bin/env node
/**
 * AP-25: Knowledge packet with an implausible/backdated timestamp is rejected
 *
 * Attack: an agent submits a cross-repo knowledge packet stamped with a
 * created_at far in the past (e.g. 1999-01-01) -- predating the CI job, the
 * session, and any work item it claims to derive from. Backdating is used to
 * smuggle a packet past freshness/provenance windows or to forge lineage so a
 * just-fabricated "learning" appears long-established and pre-vetted.
 * Control tested: scripts/validate-knowledge-packet.mjs (schema is closed:
 *   additionalProperties=false; no unvetted provenance field is accepted, so an
 *   injected created_at cannot ride along unvalidated).
 * Governance property: a packet carrying a provenance/timestamp field the schema
 *   does not sanction MUST be rejected before publish; provenance fields cannot
 *   be smuggled in as free-form extras.
 *
 * Expected outcome: validate-knowledge-packet.mjs exits 1 on the backdated
 * packet, and a well-formed packet WITHOUT the unsanctioned field validates
 * (zero-false-positive control: the rejection is about the injected field, not
 * about the packet being otherwise malformed).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-knowledge-packet.mjs");
const fixtures = join(here, "../fixtures");
const attackFixture = join(fixtures, "packet-backdated-timestamp.json");

// Attack: backdated/unsanctioned provenance field present -> rejected.
const attack = spawnSync("node", [validator, attackFixture], { encoding: "utf8" });
if (attack.status !== 1) {
  console.error(`AP-25 FAIL: validator accepted a packet with a backdated created_at (exit ${attack.status}, expected 1)`);
  console.error(attack.stdout + attack.stderr);
  process.exit(1);
}

// Control direction: the SAME packet without the injected field must validate,
// proving the rejection is caused by the smuggled provenance field, not by an
// unrelated defect. Written to an OS temp dir to avoid mutating the repo.
const packet = JSON.parse(readFileSync(attackFixture, "utf8"));
delete packet.created_at;
const dir = mkdtempSync(join(tmpdir(), "ap25-"));
const cleanPath = join(dir, "packet-clean.json");
writeFileSync(cleanPath, JSON.stringify(packet, null, 2));

const clean = spawnSync("node", [validator, cleanPath], { encoding: "utf8" });
if (clean.status !== 0) {
  console.error(`AP-25 FAIL: packet without the injected timestamp did not validate (exit ${clean.status}, expected 0)`);
  console.error(clean.stdout + clean.stderr);
  process.exit(1);
}

console.log("AP-25 PASS: backdated/unsanctioned provenance field rejected; clean packet validates");
