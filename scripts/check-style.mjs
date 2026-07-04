#!/usr/bin/env node
// House-style linter. Keeps shipped text plain and free of machine-prose tells
// and AI authorship signatures. Runs over Markdown and source text.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { AI_SIGNATURE_RE } from "./lib/detect-attribution.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

const ROOT = process.argv[2] || ".";
const TEXT_EXT = new Set([".md", ".mjs", ".js", ".ts", ".json", ".yaml", ".yml", ".astro", ".css", ".html", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", "build"]);
// The linter and the shared detector define the banned patterns, so neither may
// scan itself: their source and comments necessarily contain the literals they ban.
const SKIP_FILES = new Set(["check-style.mjs", "detect-attribution.mjs"]);

const RULES = [
  { name: "em dash", re: /—/, hint: "Use a period, comma, colon, or parentheses.", id: "gate.style.em-dash" },
  { name: "phrase: not just", re: /\bnot just\b/i, hint: "State the point directly.", id: "gate.style.not-just" },
  { name: "phrase: not only", re: /\bnot only\b/i, hint: "State the point directly.", id: "gate.style.not-only" },
  { name: "phrase: it is not X it is Y", re: /\bit('?s| is) not\b[^.]*\bit('?s| is)\b/i, hint: "Say what it is.", id: "gate.style.it-is-not-x-it-is-y" },
  // The AI-signature pattern lives in scripts/lib/detect-attribution.mjs so the
  // linter and the Governed Remediation detector share one source of truth.
  { name: "AI signature", re: AI_SIGNATURE_RE, hint: "Remove AI authorship signatures.", id: "gate.style.ai-signature" },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    // Skip the regenerated, gitignored snapshot cache: it holds extracted docstrings
    // from source, not authored text, so it is not subject to house style.
    const norm = full.split(/[\\/]/).join("/");
    if (norm === ".modonome/cache" || norm.endsWith("/.modonome/cache")) continue;
    if (s.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(entry)) && !SKIP_FILES.has(entry)) out.push(full);
  }
  return out;
}

let problems = 0;
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        problems++;
        console.error(formatMessage(rule.id, { file, line: i + 1 }, overrides).message);
      }
    }
  });
}

if (problems > 0) {
  console.error(formatMessage("gate.style.fail-summary", { count: problems }, overrides).message);
  process.exit(1);
}
console.log("Style check passed.");
