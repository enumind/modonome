#!/usr/bin/env node
// Modonome command line. Safe by default. The two commands you need first are
// `dry-run` (changes nothing) and `scaffold` (drops disabled, dry-run state).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig } from "../scripts/validate-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, "..", "scripts");

const HELP = `Modonome, governed autonomy for any repo.

Usage:
  npx modonome dry-run <dir>              read the repo and print proposed work. Changes nothing.
  npx modonome scaffold <dir>             drop .modonome state files. Disabled and dry-run. Add --write to apply.
  npx modonome adopt <dir>               alias for dry-run, writes an adoption summary to stdout.
  npx modonome validate <file>           validate a config or knowledge packet (type inferred from filename).
  npx modonome validate <file> --type config   explicitly validate as a config file.
  npx modonome validate <file> --type packet   explicitly validate as a knowledge packet.
  npx modonome migrate <file>            add new config levers with safe defaults and bump the version.
  npx modonome tick [stateDir]           expire stale in-flight work items whose lease has passed.
  npx modonome status [dir]              print the effective arming posture for the target repo.
  npx modonome report [dir]              print governance activity summary and AgentProof score.
  npx modonome compliance <dir>          write a read-only OpenSSF, SLSA, and NIST evidence pack for the repo.
  npx modonome snapshot <dir>            write a tiered, Merkle-verified repo snapshot for LLM context.
  npx modonome snapshot <dir> --check   fail or warn (per config) if the committed snapshot is stale.
  npx modonome snapshot <dir> --pack    write a single portable .msnap bundle for sharing.
  npx modonome snapshot <dir> --since <ref>  print the file-level delta since a git ref.
  npx modonome agentproof                run the AgentProof adversarial benchmark suite (16 scenarios).
  npx modonome help                      show this message.

Modonome stays off until an owner arms it through the environment or CI.`;

// The authoritative arming gate. A config file the agent can write can never arm
// the engine on its own: arming requires the MODONOME_ARMED=true environment
// variable, which lives in CI or operator scope, outside the agent's write set.
// config.autonomy_enabled is advisory; the env var is the forcing function.
export function resolveArming(targetDir, env = process.env) {
  const envArmed = env.MODONOME_ARMED === "true";
  let configSaysArmed = false;
  const configPath = join(targetDir || ".", ".modonome", "config.yaml");
  if (existsSync(configPath)) {
    try {
      configSaysArmed = loadConfig(configPath).autonomy_enabled === true;
    } catch {
      // An unreadable or malformed config is treated as not armed.
      configSaysArmed = false;
    }
  }
  // Arming requires both operator intent (env var) and config opt-in. With the
  // env var absent, autonomy_enabled is forced to false regardless of the file.
  const effectiveArmed = envArmed && configSaysArmed;
  const warning = configSaysArmed && !envArmed
    ? "[modonome] MODONOME_ARMED not set; running in dry-run mode."
    : null;
  return { envArmed, configSaysArmed, effectiveArmed, warning };
}

function run(script, args) {
  const res = spawnSync("node", [join(scripts, script), ...args], { stdio: "inherit" });
  process.exit(res.status ?? 0);
}

// Commands that operate on a target repo and must honor the arming gate. Before
// these run, we emit the dry-run warning if the config claims an armed posture
// the environment has not authorized.
const TARGET_DIR_COMMANDS = new Set(["dry-run", "adopt", "scaffold", "report", "tick", "status"]);

function targetDirFrom(rest) {
  return rest.find((a) => !a.startsWith("-")) || ".";
}

function main(argv) {
  const [cmd, ...rest] = argv;

  if (TARGET_DIR_COMMANDS.has(cmd)) {
    const { warning } = resolveArming(targetDirFrom(rest));
    if (warning) console.error(warning);
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
      const passthroughArgs = rest.filter((a, i) => a !== "--type" && (typeIdx === -1 || i !== typeIdx + 1));
      const file = passthroughArgs.find((a) => !a.startsWith("-")) || "";
      const isPacket = explicitType === "packet" || (!explicitType && file.includes("packet"));
      if (isPacket) run("validate-knowledge-packet.mjs", passthroughArgs);
      else run("validate-config.mjs", passthroughArgs);
      break;
    }
    case "status": {
      const targetDir = targetDirFrom(rest);
      const { envArmed, configSaysArmed, effectiveArmed } = resolveArming(targetDir);
      console.log("Modonome arming status");
      console.log("======================");
      console.log(`Target:              ${targetDir}`);
      console.log(`Config autonomy:     ${configSaysArmed ? "enabled" : "disabled"} (advisory)`);
      console.log(`MODONOME_ARMED env:  ${envArmed ? "set" : "not set"} (authoritative)`);
      console.log(`Effective state:     ${effectiveArmed ? "ARMED" : "dry-run"}`);
      process.exit(0);
      break;
    }
    case "report":
      run("report.mjs", rest);
      break;
    case "compliance":
      run("build-compliance-evidence.mjs", rest);
      break;
    case "snapshot":
      run("snapshot.mjs", rest);
      break;
    case "agentproof":
      process.exit(spawnSync("node", [join(here, "..", "agentproof", "runner.mjs"), ...rest], { stdio: "inherit" }).status ?? 1);
      break;
    case "migrate":
      run("migrate-config.mjs", rest);
      break;
    case "tick":
      run("tick.mjs", rest);
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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
