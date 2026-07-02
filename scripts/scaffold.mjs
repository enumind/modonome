#!/usr/bin/env node
// Drop the .modonome state templates into a target repo. Boots disabled and
// dry-run. Never overwrites an existing file. Touches nothing else.
// Usage: node scripts/scaffold.mjs <targetDir> [--write] [--no-snapshot] [--ratchet]
// --ratchet is for non-agent adoption: installs only the anti-gaming pre-commit
// hook, skipping the AGENTS.md pointer and repo snapshot that assume agent use.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { installHooks } from "./install-hooks.mjs";

// Minimal instruction file created only when the host has none, so agents discover
// the snapshot. An existing AGENTS.md is never modified.
const AGENTS_POINTER = `# Agent instructions

## Repo snapshot

For fast context, read \`.modonome/snapshot/map.md\` before reading source files. It lists
modules, public API signatures, and import edges. Check \`.modonome/snapshot/signature.json\`:
if \`merkle_root\` matches your last read, the repo is unchanged. Cite the F: and S: anchors
and open only the lines you need. After changing files, run \`npx modonome snapshot .\`.
`;

// Turn snapshot consumption on during adoption: generate the first snapshot, install
// a host pre-commit hook, and drop an AGENTS.md pointer when none exists. Skipped with
// --no-snapshot. Never overwrites an existing host file.
function enableSnapshot(target, here) {
  const snap = spawnSync("node", [join(here, "snapshot.mjs"), target], { stdio: "inherit" });
  if (snap.status !== 0) {
    console.log("  note: snapshot generation skipped (run `npx modonome snapshot .` manually).");
    return;
  }
  const agentsPath = join(target, "AGENTS.md");
  // Create only if absent, atomically: "wx" opens with O_CREAT|O_EXCL so the
  // check and the write are one syscall, closing the TOCTOU window a separate
  // existsSync + writeFileSync would leave open to a symlink swap.
  let created = false;
  try {
    writeFileSync(agentsPath, AGENTS_POINTER, { flag: "wx" });
    created = true;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  if (created) {
    console.log("  created: AGENTS.md (snapshot pointer)");
  } else if (!readFileSync(agentsPath, "utf8").includes(".modonome/snapshot/map.md")) {
    console.log("  note: point your AGENTS.md at .modonome/snapshot/map.md so agents read it first.");
  }
  const hook = installHooks(target, { self: false });
  if (hook === "installed") console.log("  installed: pre-commit hook (keeps the snapshot fresh)");
  else if (hook === "kept") console.log("  note: existing pre-commit hook kept; add `npx modonome snapshot .` to it.");
  console.log("  note: add `.modonome/cache/` to your .gitignore (local snapshot cache, not for commit).");
}

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = join(here, "..", "templates", ".modonome");
const ciTemplateDir = join(here, "..", "templates", ".github", "workflows");

function listTemplate(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? join(base, entry) : entry;
    if (statSync(full).isDirectory()) out.push(...listTemplate(full, rel));
    else out.push(rel);
  }
  return out;
}

export function scaffold(target, write) {
  const stateDir = join(target, ".modonome");
  const planned = [];

  for (const rel of listTemplate(templateDir)) {
    const dest = join(stateDir, rel);
    if (existsSync(dest)) {
      planned.push({ rel: join(".modonome", rel), action: "keep" });
      continue;
    }
    planned.push({ rel: join(".modonome", rel), action: "create" });
    if (write) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, readFileSync(join(templateDir, rel), "utf8"));
    }
  }

  for (const rel of listTemplate(ciTemplateDir)) {
    const dest = join(target, ".github", "workflows", rel);
    const destRel = join(".github", "workflows", rel);
    if (existsSync(dest)) {
      planned.push({ rel: destRel, action: "keep" });
      continue;
    }
    planned.push({ rel: destRel, action: "create" });
    if (write) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, readFileSync(join(ciTemplateDir, rel), "utf8"));
    }
  }

  return planned;
}

function writeRunLog(runsDir, command, payload) {
  try {
    mkdirSync(runsDir, { recursive: true });
    const ts = new Date().toISOString();
    const safe = ts.replace(/[:.]/g, "-");
    writeFileSync(join(runsDir, `${safe}-${command}.json`), JSON.stringify({ ts, command, ...payload }, null, 2));
    const all = readdirSync(runsDir).filter((f) => f.endsWith(".json")).sort();
    for (const old of all.slice(0, Math.max(0, all.length - 30))) {
      try { unlinkSync(join(runsDir, old)); } catch { /* ignore */ }
    }
  } catch { /* log writes must never crash the command */ }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const startMs = Date.now();
  const target = process.argv[2] || ".";
  const write = process.argv.includes("--write");
  const planned = scaffold(target, write);
  console.log(write ? "Scaffold applied." : "Scaffold preview (no files written). Pass --write to apply.");
  for (const p of planned) console.log(`  ${p.action === "create" ? (write ? "created" : "would create") : "kept"}: ${p.rel}`);
  console.log("\nThe engine stays disabled and dry-run until an owner arms it.");
  if (write && process.argv.includes("--ratchet")) {
    console.log("\nNon-agent adoption: installing the anti-gaming ratchet only.");
    const hook = installHooks(target, { self: false, mode: "ratchet" });
    if (hook === "installed") console.log("  installed: pre-commit hook (`npx modonome ratchet --staged`)");
    else if (hook === "kept") console.log("  note: existing pre-commit hook kept; add `npx modonome ratchet --staged` to it.");
    else if (hook === "no-git") console.log("  note: no .git directory found; hook not installed.");
  } else if (write && !process.argv.includes("--no-snapshot")) {
    console.log("\nEnabling repo snapshot for agent context:");
    enableSnapshot(target, here);
  } else {
    console.log("Next: run `npx modonome snapshot .` to write .modonome/snapshot/ and llms.txt,");
    console.log("then point your agent instructions (AGENTS.md or CLAUDE.md) at .modonome/snapshot/map.md.");
  }
  writeRunLog(join(target, ".modonome", "runs"), "scaffold", {
    argv: process.argv.slice(2),
    target,
    write,
    planned,
    exit_code: 0,
    duration_ms: Date.now() - startMs,
  });
}
