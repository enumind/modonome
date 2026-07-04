#!/usr/bin/env node
// Convert scored dry-run proposals into schema-valid queued work items. This is
// the missing step between `dry-run` (read-only proposals) and an armed engine
// picking up work: with no selection given it only prints the numbered picker,
// same as dry-run's own list, and writes nothing. Every item it writes starts in
// state "queued"; autonomy stays off until an owner arms the engine separately.
// Usage: node scripts/queue.mjs [dir] [1,3] [--all] [--max N]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sweepTarget, proposalToWorkItem } from "./dry-run-sweep.mjs";
import { validateWorkItem } from "./validate-work-item.mjs";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const args = process.argv.slice(2);
const all = args.includes("--all");
const maxIdx = args.indexOf("--max");
const max = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) : undefined;

// Every arg that is not a flag and not --max's own value is a candidate for the
// target dir or the selector. A selector is digits and commas only ("1,3");
// whichever remaining candidate is not the selector is the target dir.
const skipIdx = maxIdx !== -1 ? new Set([maxIdx + 1]) : new Set();
const positionals = args.filter((a, i) => !a.startsWith("-") && !skipIdx.has(i));
const selectorArg = positionals.find((a) => /^\d+(,\d+)*$/.test(a));
const target = positionals.find((a) => a !== selectorArg) || ".";

// This command's .modonome state (config, work-items, and message overrides)
// lives under the target dir being operated on, not this script's own install
// location, since a single modonome install can be pointed at many repos.
const overrides = loadMessageOverrides(join(target, ".modonome"));

const { scored } = sweepTarget(target);

if (scored.length === 0) {
  console.log(`No proposals to queue. Run \`npx modonome dry-run ${target}\` to see what a sweep would find.`);
  process.exit(0);
}

let selectedIndices;
if (all) {
  selectedIndices = scored.map((_, i) => i);
} else if (selectorArg) {
  selectedIndices = [...new Set(selectorArg.split(",").map((s) => parseInt(s, 10) - 1))];
} else {
  console.log("Modonome queue");
  console.log("==============");
  console.log(`Target: ${target}\n`);
  console.log("Scored proposals (highest priority first):");
  scored.forEach((s, i) => console.log(`  ${i + 1}. [score ${s.score.toFixed(1)}] ${s.proposal}`));
  console.log("");
  console.log(`Queue one or more:  npx modonome queue ${target} 1,3`);
  console.log(`Queue everything:   npx modonome queue ${target} --all`);
  process.exit(0);
}

if (typeof max === "number" && !Number.isNaN(max)) {
  selectedIndices = selectedIndices.slice(0, max);
}

const invalid = selectedIndices.filter((i) => i < 0 || i >= scored.length);
if (invalid.length > 0) {
  console.error(
    formatMessage("agent-run.queue.invalid-selection", { count: scored.length }, overrides).message
  );
  process.exit(1);
}

const stateDir = join(target, ".modonome");
if (!existsSync(stateDir)) {
  console.error(formatMessage("agent-run.queue.no-state-dir", { stateDir, target }, overrides).message);
  process.exit(1);
}

// scaffold's template set has no work-items/ subdirectory to copy (there is nothing
// to queue until a sweep finds something), so this command creates it the first
// time it actually has an item to write, rather than asking for a scaffold step
// that could never produce it.
const itemsDir = join(stateDir, "work-items");
mkdirSync(itemsDir, { recursive: true });

const configPath = join(target, ".modonome", "config.yaml");
const config = existsSync(configPath) ? parseFlatYaml(readFileSync(configPath, "utf8")) : {};
const existingIds = new Set(readdirSync(itemsDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));

let written = 0;
for (const i of selectedIndices) {
  const item = proposalToWorkItem(scored[i].proposal);
  let id = item.id;
  let n = 2;
  while (existingIds.has(id)) id = `${item.id}-${n++}`;
  item.id = id;
  existingIds.add(id);

  const errors = validateWorkItem(item, config);
  if (errors.length > 0) {
    console.error(
      formatMessage("agent-run.queue.item-skipped", { id, errors: errors.join("; ") }, overrides).message
    );
    continue;
  }

  writeFileSync(join(itemsDir, `${id}.json`), JSON.stringify(item, null, 2) + "\n");
  console.log(`queued ${id}: ${scored[i].proposal}`);
  written++;
}

console.log(`\n${written} work item(s) queued in ${itemsDir}.`);
console.log("Autonomy stays off until an owner arms the engine (`npx modonome arm`).");
