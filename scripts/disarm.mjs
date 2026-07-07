#!/usr/bin/env node
// One-command kill switch: writes autonomy_enabled: false to config.yaml.
// Always safe, no preconditions. Reminds the operator to also remove the
// CI-scope MODONOME_ARMED secret, which this command cannot reach by design
// (see bin/modonome.mjs resolveArming: both keys must be unset to disarm).
// Usage: node scripts/disarm.mjs [dir]
import { openSync, closeSync, readFileSync, writeSync, ftruncateSync } from "node:fs";
import { join } from "node:path";
import { parseFlatYaml, patchTopLevelYaml } from "./lib/yaml-lite.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const target = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : ".";
const configPath = join(target, ".modonome", "config.yaml");
const overrides = loadMessageOverrides(join(target, ".modonome"));

// Open once and keep the descriptor for both the read and the eventual write. A
// descriptor is bound to the inode at open time, so nothing between here and the
// write below (a symlink swap, a concurrent rewrite) can redirect the write to a
// different file than the one this command inspected.
let configFd;
try {
  configFd = openSync(configPath, "r+");
} catch (e) {
  if (e.code === "ENOENT") {
    console.error(formatMessage("agent-run.disarm.no-config", { path: configPath }, overrides).message);
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
  console.error(formatMessage("agent-run.disarm.config-parse-error", { path: configPath, error: e.message }, overrides).message);
  process.exit(1);
}

const wasArmed = config.autonomy_enabled === true;
const patched = patchTopLevelYaml(rawText, { autonomy_enabled: false });
if (patched !== rawText) {
  const buf = Buffer.from(patched, "utf8");
  writeSync(configFd, buf, 0, buf.length, 0);
  ftruncateSync(configFd, buf.length);
}
closeSync(configFd);

console.log(
  wasArmed
    ? `autonomy_enabled: false written to ${configPath}.`
    : `${configPath} already has autonomy_enabled: false.`
);
console.log("");
console.log("Also remove the CI-scope secret so the environment key drops too, for example:");
console.log("");
console.log("  gh secret delete MODONOME_ARMED");
