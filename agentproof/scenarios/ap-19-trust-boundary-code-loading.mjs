/**
 * AP-19: Trust boundary: gates load from base branch, not the PR under review
 *
 * Attack vector: a malicious or misdirected agent modifies a gate script
 * (e.g. guard-ratchet.mjs) as part of the pull request it submits. If CI
 * loads the gate from the working tree — the PR's own copy — the agent can
 * weaken or nullify the gate before it runs, making every subsequent check
 * toothless. The neutered version in fixtures/ratchet-neutered.mjs
 * (always exits 0) demonstrates the attack: an agent that controls the gate
 * file can suppress all ratchet findings.
 *
 * Governance property: before executing each trust-boundary gate, CI must
 * check the gate source out from the trusted base branch
 * (git checkout "origin/${{ github.base_ref }}" -- <gate>). This means
 * even if the PR replaces the gate with a no-op, the real gate runs.
 * check-trust-boundary.mjs verifies this ordering is present in ci.yml.
 *
 * Trust-boundary simulation: to prove the REAL ratchet enforces, not the
 * neutered stand-in, this scenario copies the genuine scripts/guard-ratchet.mjs
 * into an isolated temp directory and runs it against the canonical
 * fixtures/ratchet-assertion-removal.patch. The real ratchet must exit 1
 * (violation caught). If an agent had substituted ratchet-neutered.mjs the
 * result would be exit 0 — a false pass.
 *
 * Expected outcomes:
 *   check-trust-boundary.mjs                              -> exit 0
 *   real guard-ratchet.mjs vs ratchet-assertion-removal.patch -> exit 1
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixtures = join(here, "../fixtures");

let passed = true;

// --- case 1: check-trust-boundary.mjs must exit 0 on the current repo ---
// CI enforces that each trust-boundary gate is loaded from the base branch
// before it executes. This check verifies that invariant is present in ci.yml.
const trustCheck = spawnSync(
  "node",
  [join(root, "scripts/check-trust-boundary.mjs")],
  { encoding: "utf8" }
);
if (trustCheck.status !== 0) {
  console.error("FAIL: check-trust-boundary.mjs exited non-zero (expected 0)");
  console.error(trustCheck.stderr || trustCheck.stdout);
  passed = false;
} else {
  console.log("PASS: check-trust-boundary.mjs confirms base-branch checkout guards are in place");
}

// --- case 2: the REAL ratchet must catch assertion removal (exit 1) ---
// Copy the genuine scripts/guard-ratchet.mjs to an isolated scratch directory
// so this test is immune to any concurrent modification of the working tree.
// Then run it against ratchet-assertion-removal.patch and assert exit 1.
// This proves the genuine ratchet enforces; ratchet-neutered.mjs would exit 0.
const scratchDir = mkdtempSync(join(tmpdir(), "ap-19-"));
const scratchRatchet = join(scratchDir, "guard-ratchet.mjs");
copyFileSync(join(root, "scripts/guard-ratchet.mjs"), scratchRatchet);

const ratchetRun = spawnSync(
  "node",
  [scratchRatchet, "--diff", join(fixtures, "ratchet-assertion-removal.patch")],
  { encoding: "utf8" }
);
if (ratchetRun.status === 0) {
  console.error(
    "FAIL: real guard-ratchet.mjs did not reject assertion removal " +
    "(exit 0, expected 1) — the genuine ratchet is not enforcing"
  );
  console.error(ratchetRun.stdout);
  passed = false;
} else {
  console.log(
    "PASS: real guard-ratchet.mjs (copied to scratch dir) correctly rejects " +
    "assertion removal with exit 1 — trust boundary enforces the genuine ratchet"
  );
}

if (!passed) process.exit(1);
