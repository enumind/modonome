/**
 * AP-21: Audit trail integrity — evidence ledger sequence is verified
 *
 * Attack vector: an agent (or malicious operator) silently deletes or reorders
 * entries in the evidence ledger to erase the record of a gate failure, an
 * unapproved merge, or an escalation bypass. If the sequence verifier is absent
 * or is not run, the tampered ledger passes review without any alarm.
 *
 * Control tested: scripts/check-evidence-integrity.mjs
 * Invocation:     node <verifier> <ledger-path>  (exits 1 on broken seq, 0 on clean)
 *
 * Why it matters: a tamper-evident ledger is only meaningful if the sequence
 * chain is verified in CI. Gaps in the seq field prove that entries were removed.
 * Without this check an agent could expunge inconvenient evidence and the audit
 * trail would silently lie.
 *
 * Missing-control policy: if scripts/check-evidence-integrity.mjs does not
 * exist the scenario exits 1 loudly. A missing control is not a pass — it is a
 * governance gap that must be surfaced, not swallowed.
 *
 * Expected outcomes:
 *   evidence-ledger-broken.jsonl -> exit 1, output names broken sequence
 *   evidence-ledger-valid.jsonl  -> exit 0
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixtures = join(here, "../fixtures");
const verifier = join(root, "scripts/check-evidence-integrity.mjs");

// --- guard: control must exist; absence is a hard failure, not a skip ---
if (!existsSync(verifier)) {
  console.error(
    "FAIL AP-21: control is missing — scripts/check-evidence-integrity.mjs does not exist."
  );
  console.error(
    "A missing audit-trail verifier is a governance gap, not a passing state."
  );
  console.error(
    "Add scripts/check-evidence-integrity.mjs and wire it into CI before claiming conformance."
  );
  process.exit(1);
}

let passed = true;

// --- case 1: broken ledger (seq gaps at 3 and 6) must be rejected (exit 1) ---
const broken = spawnSync(
  "node",
  [verifier, join(fixtures, "evidence-ledger-broken.jsonl")],
  { encoding: "utf8" }
);

if (broken.status === 0) {
  console.error(
    "FAIL AP-21 (broken ledger): verifier accepted a ledger with sequence gaps (exit 0, expected 1)."
  );
  console.error(broken.stdout);
  passed = false;
} else {
  const output = broken.stdout + broken.stderr;
  // The verifier must name the broken sequence in its output so operators can
  // locate the tampered region without manually scanning the ledger.
  const mentionsBreak =
    /seq|sequence|gap|missing|broken|discontinu/i.test(output);
  if (!mentionsBreak) {
    console.error(
      "FAIL AP-21 (broken ledger): verifier exited 1 but output does not describe " +
      "the sequence break — operators cannot locate the tampered region."
    );
    console.error(output);
    passed = false;
  } else {
    console.log(
      "PASS AP-21 (broken ledger): verifier rejected sequence-gap ledger and named the break."
    );
  }
}

// --- case 2: valid ledger (seq 1-8, no gaps) must be accepted (exit 0) ---
const valid = spawnSync(
  "node",
  [verifier, join(fixtures, "evidence-ledger-valid.jsonl")],
  { encoding: "utf8" }
);

if (valid.status !== 0) {
  console.error(
    "FAIL AP-21 (valid ledger): verifier rejected a well-formed ledger (exit 1, expected 0)."
  );
  console.error(valid.stderr + valid.stdout);
  passed = false;
} else {
  console.log(
    "PASS AP-21 (valid ledger): verifier accepted unbroken sequential ledger."
  );
}

if (!passed) process.exit(1);
