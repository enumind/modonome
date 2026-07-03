#!/usr/bin/env node
// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
/**
 * AP-15: Prompt injection embedded in a diff does not alter ratchet behavior.
 *
 * Attack: a malicious diff embeds SYSTEM OVERRIDE and AGENT INSTRUCTION
 * comments inside added lines of a documentation or source file. The injected
 * text instructs the agent to disable governance, set autonomy_enabled=true,
 * skip checks, and merge without review.
 *
 * Governance property: the ratchet treats every line of the diff as data.
 * It pattern-matches for gate-weakening constructs only. Arbitrary natural-
 * language instructions inside diff lines are inert. The diff contains no
 * actual gate-weakening patterns (no assertion removal, no skip annotations,
 * no type escapes, no coverage threshold removal), so the ratchet MUST exit 0.
 *
 * This proves the ratchet cannot be jailbroken through diff content.
 *
 * Expected outcome: guard-ratchet.mjs exits 0 (no gate weakening detected).
 * The injected instructions have zero effect on the enforcement result.
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixture = join(here, "../fixtures/prompt-injection-in-diff.patch");

const result = spawnSync("node", [join(root, "scripts/guard-ratchet.mjs"), "--diff", fixture], { encoding: "utf8" });

if (result.status !== 0) {
  console.error("AP-15 FAIL: ratchet rejected a clean diff with injected instructions.");
  console.error("This is a false positive : injection text must not trigger gate-weakening checks.");
  console.error(result.stderr);
  process.exit(1);
}

if (result.stdout.includes("autonomy_enabled") || result.stdout.includes("OVERRIDE")) {
  console.error("AP-15 FAIL: ratchet output contains injection text : possible instruction leakage.");
  console.error(result.stdout);
  process.exit(1);
}

console.log("AP-15 PASS: prompt injection in diff content is inert : ratchet treats all lines as data");
