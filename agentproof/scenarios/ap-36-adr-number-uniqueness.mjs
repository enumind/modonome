/**
 * AP-36: Markdown governance catches duplicate ADR numbers within docs/adr/
 *
 * Attack vector: two independent branches (human or agent-authored) each add a
 * new ADR at the same time, and each picks the same "next free number" without
 * seeing the other's uncommitted file. Both merge on the same day. If the
 * ADR-uniqueness gate only compares docs/adr/ against docs/research/ (the
 * cross-directory case ADR-031 was originally written for), a same-directory
 * collision is invisible to it: this is exactly what happened to this repo's
 * own ADR-032 before the fix that added this scenario.
 *
 * Governance property: check-md-governance.mjs must reject any pair (or larger
 * group) of files in docs/adr/ that share an ADR-NNN number, and it must not
 * false-positive on a repo where every ADR number is unique.
 *
 * Expected outcomes:
 *   docs/adr/ with two ADR-050-*.md files -> exit 1, message names both files
 *   docs/adr/ with distinct ADR numbers   -> exit 0, no [adr-number] violation
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const checker = join(root, "scripts/check-md-governance.mjs");

let passed = true;

// A minimal repo that satisfies every check other than the one under test, so a
// failure can only come from the ADR-number logic being exercised.
function makeMinimalRepo() {
  const tmp = mkdtempSync(join(tmpdir(), "ap-36-"));
  mkdirSync(join(tmp, ".modonome"), { recursive: true });
  mkdirSync(join(tmp, "prompts"), { recursive: true });
  mkdirSync(join(tmp, "docs", "adr"), { recursive: true });
  writeFileSync(join(tmp, "AGENTS.md"), "# Agents\n");
  writeFileSync(join(tmp, "RELEASE-EVIDENCE.md"), "# Release evidence\n");
  writeFileSync(join(tmp, "ROADMAP.md"), "# Roadmap\n");
  writeFileSync(join(tmp, ".modonome", "STATUS.md"), "# Status\n");
  writeFileSync(join(tmp, ".modonome", "DECISIONS.md"), "# Decisions\n");
  writeFileSync(join(tmp, ".modonome", "LEARNINGS.md"), "# Learnings\n");
  writeFileSync(join(tmp, ".modonome", "NETWORK.md"), "# Network\n");
  writeFileSync(join(tmp, ".modonome", "control-panel.md"), "# Control panel\n");
  writeFileSync(join(tmp, ".modonome", "config.yaml"), "schema_version: 1\n");
  writeFileSync(join(tmp, "prompts", "modonome.core.md"), "# Core prompt\n");
  return tmp;
}

function run(tmp) {
  return spawnSync("node", [checker], { encoding: "utf8", timeout: 30000, env: { ...process.env, MODONOME_ROOT: tmp } });
}

// --- case 1: two files in docs/adr/ sharing a number must be rejected ---
{
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "docs", "adr", "ADR-050-first-branch.md"), "# ADR-050: First branch\n\n**Status:** Accepted\n");
    writeFileSync(join(tmp, "docs", "adr", "ADR-050-second-branch.md"), "# ADR-050: Second branch\n\n**Status:** Accepted\n");
    const result = run(tmp);
    const output = result.stdout + result.stderr;
    if (result.status === 0) {
      console.error("FAIL: check-md-governance.mjs accepted two docs/adr/ files sharing ADR-050 (exit 0, expected 1)");
      passed = false;
    } else if (!output.includes("[adr-number]") || !output.includes("ADR-050")) {
      console.error("FAIL: check-md-governance.mjs failed for the wrong reason (no [adr-number] ADR-050 message)");
      console.error(output);
      passed = false;
    } else if (!output.includes("ADR-050-first-branch.md") || !output.includes("ADR-050-second-branch.md")) {
      console.error("FAIL: violation message does not name both colliding files");
      console.error(output);
      passed = false;
    } else {
      console.log("PASS: a same-directory ADR number collision is caught and both files are named");
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// --- case 2: clean control, distinct ADR numbers must not false-positive ---
{
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "docs", "adr", "ADR-001-first.md"), "# ADR-001: First\n");
    writeFileSync(join(tmp, "docs", "adr", "ADR-002-second.md"), "# ADR-002: Second\n");
    const result = run(tmp);
    const output = result.stdout + result.stderr;
    if (output.includes("[adr-number]")) {
      console.error("FAIL: distinct ADR numbers produced a false-positive [adr-number] violation");
      console.error(output);
      passed = false;
    } else {
      console.log("PASS: distinct ADR numbers in docs/adr/ produce no adr-number violation (clean control)");
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (!passed) process.exit(1);
