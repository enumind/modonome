#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixture = join(here, "../fixtures/ratchet-dotnet-skip-injection.patch");

const result = spawnSync("node", [join(root, "scripts/guard-ratchet.mjs"), "--diff", fixture], { encoding: "utf8" });

if (result.status !== 1) {
  console.error(`AP-14 FAIL: expected exit 1, got ${result.status}`);
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(1);
}

if (!result.stderr.includes("adds a skipped or focused test")) {
  console.error("AP-14 FAIL: expected skip-injection violation message");
  console.error(result.stderr);
  process.exit(1);
}

console.log("AP-14 PASS: C# [Ignore]/[Fact(Skip)] injection caught by ratchet");
