#!/usr/bin/env node
// Modonome command line. Safe by default. The two commands you need first are
// `dry-run` (changes nothing) and `scaffold` (drops disabled, dry-run state).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, "..", "scripts");
const [cmd, ...rest] = process.argv.slice(2);

const HELP = `Modonome, governed autonomy for any repo.

Usage:
  npx modonome dry-run <dir>     read the repo and print proposed work. Changes nothing.
  npx modonome scaffold <dir>    drop .modonome state files. Disabled and dry-run. Add --write to apply.
  npx modonome adopt <dir>       alias for dry-run, writes an adoption summary to stdout.
  npx modonome validate <file>   validate a config or knowledge packet.
  npx modonome migrate <file>    add new config levers with safe defaults and bump the version.
  npx modonome help              show this message.

Modonome stays off until an owner arms it through the environment or CI.`;

function run(script, args) {
  const res = spawnSync("node", [join(scripts, script), ...args], { stdio: "inherit" });
  process.exit(res.status ?? 0);
}

switch (cmd) {
  case "dry-run":
  case "adopt":
    run("dry-run-sweep.mjs", rest);
    break;
  case "scaffold":
    run("scaffold.mjs", rest);
    break;
  case "validate": {
    const file = rest[0] || "";
    if (file.includes("packet")) run("validate-knowledge-packet.mjs", rest);
    else run("validate-config.mjs", rest);
    break;
  }
  case "migrate":
    run("migrate-config.mjs", rest);
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    console.log(HELP);
    break;
  default:
    console.error(`Unknown command: ${cmd}\n`);
    console.log(HELP);
    process.exit(2);
}
