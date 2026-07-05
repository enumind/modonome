#!/usr/bin/env node
// Drop the .modonome state templates into a target repo. Boots disabled and
// dry-run. Never overwrites an existing file. Touches nothing else.
// Usage: node scripts/scaffold.mjs <targetDir> [--write] [--no-snapshot] [--ratchet] [--tripwires]
// --ratchet is for non-agent adoption: installs only the anti-gaming pre-commit
// hook, skipping the AGENTS.md pointer and repo snapshot that assume agent use.
// --tripwires installs the Tripwires editor hook packs (Claude Code, Cursor): a
// local, best-effort nudge that shells out to guard-ratchet.mjs before an agent
// writes a gate-weakening edit. It is advisory only; the CI ratchet run from the
// base branch is the real gate. See scripts/tripwire-check.mjs for the kernel.
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

  // Copilot code review guidance, so GitHub's own reviewer flags gate-weakening in the
  // ratchet's vocabulary. Never overwrite an existing instructions file. Written with
  // O_EXCL ("wx") so the existence check and the write are one syscall, the same
  // TOCTOU-closing idiom the AGENTS.md pointer above uses, rather than a separate
  // existsSync + writeFileSync that leaves a race window open.
  {
    const src = join(here, "..", "templates", ".github", "copilot-instructions.md");
    const dest = join(target, ".github", "copilot-instructions.md");
    const destRel = join(".github", "copilot-instructions.md");
    if (write) {
      mkdirSync(dirname(dest), { recursive: true });
      let created = false;
      try {
        writeFileSync(dest, readFileSync(src, "utf8"), { flag: "wx" });
        created = true;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
      }
      planned.push({ rel: destRel, action: created ? "create" : "keep" });
    } else {
      planned.push({ rel: destRel, action: existsSync(dest) ? "keep" : "create" });
    }
  }

  return planned;
}

// Install the Tripwires editor hook packs into a target repo: the two hook config
// templates (.claude/settings.json, .cursor/hooks.json) plus the shared kernel and
// the detector it shells out to, so a host that never installs modonome as a
// dependency still gets a working, self-contained hook pack. Never overwrites an
// existing file at any destination, the same rule every other scaffold surface
// follows. For modonome's own repo, scripts/tripwire-check.mjs and
// scripts/guard-ratchet.mjs already exist at these exact destinations, so this is a
// no-op there beyond the two hook config files.
function scaffoldTripwires(target, here) {
  const files = [
    { src: join(here, "..", "templates", ".claude", "settings.json"), dest: join(target, ".claude", "settings.json"), label: join(".claude", "settings.json") },
    { src: join(here, "..", "templates", ".cursor", "hooks.json"), dest: join(target, ".cursor", "hooks.json"), label: join(".cursor", "hooks.json") },
    { src: join(here, "tripwire-check.mjs"), dest: join(target, "scripts", "tripwire-check.mjs"), label: join("scripts", "tripwire-check.mjs") },
    { src: join(here, "guard-ratchet.mjs"), dest: join(target, "scripts", "guard-ratchet.mjs"), label: join("scripts", "guard-ratchet.mjs") },
  ];
  const results = [];
  for (const f of files) {
    mkdirSync(dirname(f.dest), { recursive: true });
    let created = false;
    try {
      writeFileSync(f.dest, readFileSync(f.src, "utf8"), { flag: "wx" });
      created = true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    results.push({ rel: f.label, action: created ? "create" : "keep" });
  }
  return results;
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
  if (write && process.argv.includes("--tripwires")) {
    console.log("\nInstalling Tripwires: local, best-effort editor hook packs for Claude Code and Cursor.");
    for (const r of scaffoldTripwires(target, here)) {
      console.log(`  ${r.action === "create" ? "created" : "kept"}: ${r.rel}`);
    }
    console.log("  note: Tripwires are advisory only. The CI ratchet (guard-ratchet.mjs, run from the base");
    console.log("  branch) is the real gate; these hooks are a best-effort local nudge, nothing more.");
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
