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
  npx modonome dry-run <dir>              read the repo and print proposed work. Changes nothing.
  npx modonome scaffold <dir>             drop .modonome state files. Disabled and dry-run. Add --write to apply.
  npx modonome adopt <dir>               alias for dry-run, writes an adoption summary to stdout.
  npx modonome validate <file>           validate a config or knowledge packet (type inferred from filename).
  npx modonome validate <file> --type config   explicitly validate as a config file.
  npx modonome validate <file> --type packet   explicitly validate as a knowledge packet.
  npx modonome migrate <file>            add new config levers with safe defaults and bump the version.
  npx modonome report [dir]              print governance activity summary and AgentProof score.
  npx modonome agentproof                run the AgentProof adversarial benchmark suite (16 scenarios).
  npx modonome help                      show this message.

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
    const typeIdx = rest.indexOf("--type");
    const explicitType = typeIdx !== -1 ? rest[typeIdx + 1] : null;
    const passthroughArgs = rest.filter((a, i) => a !== "--type" && i !== typeIdx + 1);
    const file = passthroughArgs.find((a) => !a.startsWith("-")) || "";
    const isPacket = explicitType === "packet" || (!explicitType && file.includes("packet"));
    if (isPacket) run("validate-knowledge-packet.mjs", passthroughArgs);
    else run("validate-config.mjs", passthroughArgs);
    break;
  }
  case "report":
    run("report.mjs", rest);
    break;
  case "agentproof":
    spawnSync("node", [join(here, "..", "agentproof", "runner.mjs"), ...rest], { stdio: "inherit" }); process.exit(0);
    break;
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
