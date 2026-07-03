#!/usr/bin/env node
// Guided arming ceremony. Checks the preconditions Modonome can verify locally,
// with no network call and no dependency, then writes autonomy_enabled: true to
// config.yaml. It never sets MODONOME_ARMED itself: that key lives in CI or
// operator scope by design (bin/modonome.mjs resolveArming requires both), so
// arming stays a two-key act split between this command and a human running the
// printed CI-secret command.
// Usage: node scripts/arm.mjs [dir]
import { existsSync, openSync, closeSync, readFileSync, writeSync, ftruncateSync } from "node:fs";
import { join } from "node:path";
import { parseFlatYaml, patchTopLevelYaml } from "./lib/yaml-lite.mjs";
import { modelFamily } from "./validate-work-item.mjs";

const target = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : ".";
const configPath = join(target, ".modonome", "config.yaml");
const codeownersPath = join(target, ".github", "CODEOWNERS");

let ok = true;
function pass(msg) {
  console.log(`PASS   ${msg}`);
}
function fail(msg) {
  console.error(`FAIL   ${msg}`);
  ok = false;
}

// Open once and keep the descriptor for both the read and the eventual write.
// A descriptor is bound to the inode at open time, so nothing between here and
// the write below (a symlink swap, a concurrent rewrite) can redirect the write
// to a different file than the one this command inspected.
let configFd;
try {
  configFd = openSync(configPath, "r+");
} catch (e) {
  if (e.code === "ENOENT") {
    console.error(`No config found at ${configPath}. Run \`npx modonome scaffold ${target} --write\` first.`);
    process.exit(1);
  }
  throw e;
}

const rawText = readFileSync(configFd, "utf8");
let config;
try {
  config = parseFlatYaml(rawText);
} catch (e) {
  closeSync(configFd);
  console.error(`Config at ${configPath} does not parse: ${e.message}`);
  process.exit(1);
}

console.log("Modonome arming preconditions");
console.log("=============================");

// 1. Maker and checker must use distinct models, and distinct model families
// (not merely distinct aliases of the same family), the same rule
// validate-work-item.mjs enforces on real work items (AP-34).
const makerModel = config.roles?.maker?.model;
const checkerModel = config.roles?.checker?.model;
if (!makerModel || !checkerModel) {
  fail("roles.maker.model and roles.checker.model must both be set.");
} else if (makerModel === checkerModel) {
  fail(`maker and checker use the identical model "${makerModel}".`);
} else {
  const makerFamily = modelFamily(makerModel);
  const checkerFamily = modelFamily(checkerModel);
  if (makerFamily && makerFamily === checkerFamily) {
    fail(`maker ("${makerModel}") and checker ("${checkerModel}") are the same model family (${makerFamily}).`);
  } else {
    pass(`maker (${makerModel}) and checker (${checkerModel}) are distinct model families.`);
  }
}

// 2. The two protected-path surfaces must agree: CODEOWNERS is what GitHub
// enforces, protected_paths_extra is what the engine reads. Skipped only when
// the config lists nothing extra to cross-check.
const ppx = (config.protected_paths_extra || []).map((p) => String(p).replace(/^\//, "").replace(/\/$/, ""));
if (ppx.length === 0) {
  console.log("NOTE   protected_paths_extra is empty; nothing to cross-check against CODEOWNERS.");
} else if (!existsSync(codeownersPath)) {
  fail(`protected_paths_extra lists ${ppx.length} path(s) but no CODEOWNERS file exists at ${codeownersPath}.`);
} else {
  const owners = new Set();
  for (const line of readFileSync(codeownersPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    owners.add(trimmed.split(/\s+/)[0].replace(/^\//, "").replace(/\/$/, ""));
  }
  const missing = ppx.filter((p) => !owners.has(p));
  if (missing.length > 0) {
    fail(`CODEOWNERS does not protect: ${missing.join(", ")} (listed in protected_paths_extra).`);
  } else {
    pass(`CODEOWNERS covers all ${ppx.length} protected_paths_extra entr${ppx.length === 1 ? "y" : "ies"}.`);
  }
}

// 3. The config's own stated separation-of-duties intent must still be on.
// Arming with one of these off waives a guarantee the defaults promise.
for (const key of [
  "require_branch_protection",
  "require_codeowner_review",
  "require_distinct_maker_checker",
  "require_distinct_maker_checker_model",
]) {
  if (config[key] === false) fail(`${key} is set to false.`);
  else pass(`${key} is enabled.`);
}

console.log("");
if (!ok) {
  closeSync(configFd);
  console.error("Arming refused: fix the failed check(s) above, then re-run `npx modonome arm`.");
  process.exit(1);
}

const wasArmed = config.autonomy_enabled === true;
const patched = patchTopLevelYaml(rawText, { autonomy_enabled: true });
if (patched !== rawText) {
  const buf = Buffer.from(patched, "utf8");
  writeSync(configFd, buf, 0, buf.length, 0);
  ftruncateSync(configFd, buf.length);
}
closeSync(configFd);

console.log(
  wasArmed
    ? `Preconditions hold. ${configPath} already has autonomy_enabled: true.`
    : `Preconditions hold. autonomy_enabled: true written to ${configPath}.`
);
console.log("");
console.log("This is one of two keys. Modonome stays in dry-run until MODONOME_ARMED=true is");
console.log("also set, in CI or operator scope only, never in this file. Run, for example:");
console.log("");
console.log("  gh secret set MODONOME_ARMED --body true");
console.log("");
console.log("Run `npx modonome disarm` to reverse both this config key and that CI secret.");
