#!/usr/bin/env node
// Rename an already-scaffolded host repo's .modonome/LEARNINGS.md to LESSONS.md: the
// file-rename half of the LEARNINGS -> LESSONS lexicon rename (see docs/LEXICON.md). A
// repo scaffolded before this rename shipped needs this one-time step; a fresh scaffold
// already gets LESSONS.md straight from the template. No-op if already migrated.
// Usage: node scripts/migrate-lessons-rename.mjs [dir] [--write]
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const write = args.includes("--write");
const target = args.find((a) => !a.startsWith("-")) || ".";

const oldPath = join(target, ".modonome", "LEARNINGS.md");
const newPath = join(target, ".modonome", "LESSONS.md");

if (existsSync(newPath)) {
  console.log(`${newPath} already exists. Nothing to migrate.`);
  process.exit(0);
}
if (!existsSync(oldPath)) {
  console.log(`${oldPath} not found. Nothing to migrate.`);
  process.exit(0);
}

if (!write) {
  console.log(`Would rename ${oldPath} -> ${newPath}.`);
  console.log("Re-run with --write to apply.");
  process.exit(0);
}

renameSync(oldPath, newPath);
console.log(`Renamed ${oldPath} -> ${newPath}.`);
console.log("Commit this with git: it tracks the rename by content similarity automatically.");
