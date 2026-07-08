#!/usr/bin/env node
// Break the Ratchet: the judge harness (BREAK-THE-RATCHET.md).
//
// Safety invariant, non-negotiable (per the technical review that scoped this
// feature, recorded in docs/adr/ADR-046-ship-the-deferred-features.md): this
// tool NEVER applies or executes a submitted diff. A submission's .patch file
// is read as plain text and handed to scripts/guard-ratchet.mjs's existing
// `--diff <file>` mode, which is itself a pure text analyzer: it parses a
// unified diff into added/removed lines and pattern-matches them. It does not
// call `git apply`, does not write the diff's content to a working tree, and
// does not execute anything the diff contains. That is what makes it safe to
// run this judge against an arbitrary, untrusted community submission.
//
// What this tool decides, and what it deliberately leaves to a human: it
// mechanically confirms one fact, whether scripts/guard-ratchet.mjs flags the
// submitted diff or not. It does NOT decide whether the submitter's claim ("this
// diff is a real gate weakening") is true; that requires understanding the
// diff's semantics, which is exactly the class of judgment this project's own
// README says the deterministic ratchet cannot make. A submission the ratchet
// does not flag is reported as a CANDIDATE break for a maintainer to review, not
// an automatically confirmed one.
//
// Usage:
//   node challenge/judge.mjs <submissionDir>          human-readable verdict
//   node challenge/judge.mjs <submissionDir> --json    machine-readable result
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "../scripts/lib/jsonschema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/**
 * Load and schema-validate a submission directory: exactly one .patch (or
 * .diff) file and one declaration.json. Pure I/O, no mutation, no execution.
 * @param {string} dir
 * @returns {{ patchPath: string, declaration: object, problems: string[] }}
 */
export function loadSubmission(dir) {
  const problems = [];
  const declPath = join(dir, "declaration.json");
  if (!existsSync(declPath)) {
    return { patchPath: null, declaration: null, problems: [`${declPath} not found. Every submission needs a declaration.json (see BREAK-THE-RATCHET.md).`] };
  }
  let declaration;
  try {
    declaration = JSON.parse(readFileSync(declPath, "utf8"));
  } catch (e) {
    return { patchPath: null, declaration: null, problems: [`declaration.json is not valid JSON: ${e.message}`] };
  }
  const schema = JSON.parse(readFileSync(join(root, "schemas", "break-the-ratchet-submission.schema.json"), "utf8"));
  for (const e of validate(schema, declaration)) problems.push(`declaration.json: ${e}`);

  const patchFiles = readdirSync(dir).filter((f) => f.endsWith(".patch") || f.endsWith(".diff"));
  if (patchFiles.length === 0) {
    problems.push("no .patch or .diff file found in the submission directory.");
    return { patchPath: null, declaration, problems };
  }
  if (patchFiles.length > 1) {
    problems.push(`exactly one .patch/.diff file is expected, found ${patchFiles.length}: ${patchFiles.join(", ")}.`);
  }
  return { patchPath: join(dir, patchFiles[0]), declaration, problems };
}

/**
 * Run the ratchet against the submitted diff TEXT ONLY, via its existing
 * --diff mode. Never applies or executes the diff. Returns the ratchet's raw
 * exit status and output for the report.
 * @param {string} patchPath
 * @param {{ spawnImpl?: typeof spawnSync }} [deps]
 */
export function runRatchetAgainstSubmission(patchPath, deps = {}) {
  const spawnImpl = deps.spawnImpl ?? spawnSync;
  const res = spawnImpl("node", [join(root, "scripts", "guard-ratchet.mjs"), "--diff", patchPath], { encoding: "utf8" });
  return { status: res.status ?? 1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

/**
 * Combine the declaration and the ratchet's verdict into a judged result.
 * Pure. "confirmed-break" only when the submitter claimed the diff should be
 * blocked and the ratchet, in fact, did not block it; every other combination
 * is reported plainly rather than guessed at.
 */
export function judge(declaration, ratchetResult) {
  const blocked = ratchetResult.status !== 0;
  const claimedShouldBlock = declaration?.expectedRatchetVerdict === "should-block";

  if (claimedShouldBlock && !blocked) {
    return {
      verdict: "candidate-break",
      summary: "The ratchet did NOT flag this diff, and the submission claims it should have. This is a candidate break, pending human review of whether the claim is actually a real weakening.",
    };
  }
  if (claimedShouldBlock && blocked) {
    return {
      verdict: "not-a-break",
      summary: "The ratchet already blocks this diff. Not a break; the gate worked as intended.",
    };
  }
  if (!claimedShouldBlock && blocked) {
    return {
      verdict: "false-positive-candidate",
      summary: "The submission claims this diff is a legitimate change (should-pass), but the ratchet blocked it. This is a candidate false positive, pending human review.",
    };
  }
  return {
    verdict: "consistent-pass",
    summary: "The submission claims this diff is legitimate (should-pass), and the ratchet did not flag it. Consistent; not a finding.",
  };
}

async function main(argv) {
  const jsonMode = argv.includes("--json");
  const args = argv.filter((a) => a !== "--json");
  const dir = args[0];
  if (!dir) {
    console.error("Usage: node challenge/judge.mjs <submissionDir> [--json]");
    return 2;
  }

  const { patchPath, declaration, problems } = loadSubmission(dir);
  if (problems.length > 0 || !patchPath) {
    if (jsonMode) { console.log(JSON.stringify({ dir, problems, verdict: "invalid-submission" }, null, 2)); return 1; }
    console.error("Invalid submission:");
    for (const p of problems) console.error(`  - ${p}`);
    return 1;
  }

  const ratchetResult = runRatchetAgainstSubmission(patchPath);
  const result = judge(declaration, ratchetResult);

  if (jsonMode) {
    console.log(JSON.stringify({
      dir, title: declaration.title, category: declaration.category,
      ratchetExitStatus: ratchetResult.status, ...result,
    }, null, 2));
    return 0;
  }

  console.log(`Break the Ratchet: ${declaration.title}`);
  console.log("=".repeat(20 + declaration.title.length));
  console.log("");
  console.log(`Category:            ${declaration.category}`);
  console.log(`Claimed weakening:   ${declaration.claim}`);
  console.log(`Expected verdict:    ${declaration.expectedRatchetVerdict}`);
  console.log(`Ratchet exit status: ${ratchetResult.status} (${ratchetResult.status === 0 ? "did not flag it" : "blocked it"})`);
  console.log("");
  console.log(`Verdict: ${result.verdict}`);
  console.log(result.summary);
  if (ratchetResult.stderr) {
    console.log("");
    console.log("Ratchet output:");
    console.log(ratchetResult.stderr.split("\n").map((l) => `  ${l}`).join("\n"));
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
