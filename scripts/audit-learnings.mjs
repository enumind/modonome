#!/usr/bin/env node
// Learning audit tool (ADR-026). Traces a rule or gate back to the learning that
// produced it and the correction signal behind that learning, so an auditor can ask
// "why does this rule exist?" and get a complete chain.
//
// Usage:
//   node scripts/audit-learnings.mjs              list every promoted learning
//   node scripts/audit-learnings.mjs <substring>  show the chain for matches
//
// A match is any promoted learning whose id, gate, gate_location, or lesson contains
// the substring (case-insensitive).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readPromotedLearnings } from "./lib/learnings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const query = (process.argv[2] || "").toLowerCase();

// surface a clean error if LEARNINGS.md is missing rather than crashing.
let learnings;
try {
  learnings = readPromotedLearnings(root);
} catch (e) {
  console.error(`audit-learnings: ${e.message}`);
  process.exit(1);
}

function matches(l) {
  if (!query) return true;
  return [l.id, l.gate_added, l.gate_location, l.lesson]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(query));
}

const hits = learnings.filter(matches);

if (hits.length === 0) {
  console.log(query ? `No promoted learning matches "${process.argv[2]}".` : "No promoted learnings recorded.");
  process.exit(query ? 1 : 0);
}

for (const l of hits) {
  console.log(`\n${l.id}: ${l.lesson}`);
  console.log("  chain: signal -> observation -> learning -> gate");
  console.log(`    signal       ${l.correction_signal_id}`);
  console.log(`    observed     ${l.observation_date}  (${l.evidence_summary})`);
  console.log(`    promoted     ${l.promotion_date}`);
  console.log(`    gate         ${l.gate_added}`);
  console.log(`    gate at      ${l.gate_location}`);
}
console.log("");
