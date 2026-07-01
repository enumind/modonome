#!/usr/bin/env node
// Architecture drift guard. ARCHITECTURE.md is the highest-traffic explanation of the
// system, and unlike prose-only drift, this kind is checkable: does the doc still name
// every execution-context-defining script, does every script path it cites still exist,
// and does its agent-loop section still name every real work-item state. This exists
// because ARCHITECTURE.md once claimed "three execution contexts" while a fourth
// (scripts/mcp-server.mjs) already shipped, undetected until a manual audit found it.
//
// Checks:
//   1. Every top-level .mjs file under scripts/agent/, plus scripts/mcp-server.mjs, is
//      mentioned somewhere in ARCHITECTURE.md. A new execution surface that ships
//      without a doc update fails this.
//   2. Every backtick-quoted scripts/*.mjs path ARCHITECTURE.md cites resolves to a real
//      file. A renamed or removed script that leaves a stale reference fails this.
//   3. Every state in schemas/work-item.schema.json's state enum appears, as a whole
//      word, in ARCHITECTURE.md's "## The agent loop" section. A schema state with no
//      matching mention in the loop's own narrative fails this.
//
// Usage: node scripts/check-architecture-drift.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.MODONOME_ROOT ? process.env.MODONOME_ROOT : join(here, "..");
const problems = [];

const archPath = join(root, "ARCHITECTURE.md");
if (!existsSync(archPath)) {
  console.log("ARCHITECTURE.md not present; nothing to check.");
  process.exit(0);
}
const arch = readFileSync(archPath, "utf8");

// 1. Every execution-context-defining script must be named in ARCHITECTURE.md.
const agentDir = join(root, "scripts", "agent");
const mustBeNamed = [];
if (existsSync(agentDir)) {
  for (const f of readdirSync(agentDir)) {
    if (extname(f) === ".mjs") mustBeNamed.push(f);
  }
}
if (existsSync(join(root, "scripts", "mcp-server.mjs"))) mustBeNamed.push("mcp-server.mjs");
for (const name of mustBeNamed) {
  if (!arch.includes(name)) {
    problems.push(
      `[unmentioned-script] ${name} exists but is not mentioned anywhere in ARCHITECTURE.md. ` +
        `A new file here is a new execution surface or a new agent-loop component; document it.`
    );
  }
}

// 2. Every scripts/*.mjs path ARCHITECTURE.md cites must exist.
const citedScriptRe = /`(scripts\/[a-zA-Z0-9_.\/-]+\.mjs)`/g;
let m;
while ((m = citedScriptRe.exec(arch)) !== null) {
  const rel = m[1];
  if (!existsSync(join(root, rel))) {
    problems.push(`[stale-reference] ARCHITECTURE.md cites \`${rel}\`, which does not exist. Update or remove the reference.`);
  }
}

// 3. Every work-item state must appear in the agent-loop section's own text.
const schemaPath = join(root, "schemas", "work-item.schema.json");
if (existsSync(schemaPath)) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const states = (schema.properties && schema.properties.state && schema.properties.state.enum) || [];
  const sectionStart = arch.indexOf("## The agent loop");
  if (sectionStart === -1) {
    if (states.length > 0) problems.push(`[agent-loop-section] ARCHITECTURE.md has no "## The agent loop" section to check states against.`);
  } else {
    const nextHeading = arch.indexOf("\n## ", sectionStart + 1);
    const section = nextHeading === -1 ? arch.slice(sectionStart) : arch.slice(sectionStart, nextHeading);
    for (const state of states) {
      const wordBoundary = new RegExp(`\\b${state}\\b`);
      if (!wordBoundary.test(section)) {
        problems.push(
          `[unmentioned-state] work-item state "${state}" (schemas/work-item.schema.json) is not named ` +
            `in ARCHITECTURE.md's "## The agent loop" section.`
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error("Architecture drift found:\n");
  for (const p of problems) console.error("  - " + p);
  console.error(`\n${problems.length} problem(s). ARCHITECTURE.md is the highest-traffic explanation of the system; keep it current.`);
  process.exit(1);
}
console.log("Architecture drift guard: every execution surface, script reference, and work-item state is accounted for in ARCHITECTURE.md.");
