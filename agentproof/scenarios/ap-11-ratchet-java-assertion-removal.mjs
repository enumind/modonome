#!/usr/bin/env node
// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixture = join(here, "../fixtures/ratchet-java-assertion-removal.patch");

const result = spawnSync("node", [join(root, "scripts/guard-ratchet.mjs"), "--diff", fixture], { encoding: "utf8" });

/* c8 ignore start -- fires only if the ratchet control itself regresses */
if (result.status !== 1) {
  console.error(`AP-11 FAIL: expected exit 1, got ${result.status}`);
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(1);
}
/* c8 ignore stop */

/* c8 ignore start -- fires only if the rejection message wording regresses */
if (!result.stderr.includes("removes more test assertions")) {
  console.error("AP-11 FAIL: expected assertion-removal violation message");
  console.error(result.stderr);
  process.exit(1);
}
/* c8 ignore stop */

console.log("AP-11 PASS: Java assertion removal caught by ratchet");
