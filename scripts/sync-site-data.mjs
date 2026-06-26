#!/usr/bin/env node
// Sync live data from RELEASE-EVIDENCE.md and work items into site/index.html.
// Pulls: gate count, work queue counts, promoted learnings, armed status.
// Ensures site always reflects real repo state, never hand-edited fiction.
//
// Usage:
//   node scripts/sync-site-data.mjs            read evidence and update site
//   node scripts/sync-site-data.mjs --verify   fail if site data is stale
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const verify = process.argv.includes("--verify");

// Parse RELEASE-EVIDENCE.md to extract gate counts and autonomy status
function parseEvidence() {
  const evidencePath = join(root, "RELEASE-EVIDENCE.md");
  if (!existsSync(evidencePath)) {
    return { gates: 0, armed: false, learnings: [] };
  }

  const content = readFileSync(evidencePath, "utf8");
  let gateCount = 0;
  let armed = false;
  const learnings = [];

  // Parse "Autonomy posture: ARMED" or "dry-run / off"
  const autonomyMatch = content.match(/Autonomy posture:\s*(\w+)/);
  if (autonomyMatch) armed = autonomyMatch[1].toUpperCase() === "ARMED";

  // Count gate results (lines matching "| gateName | pass/FAIL |")
  const gateLines = content.match(/\|\s*\w+[\w\s-]*\s*\|\s*(pass|FAIL)\s*\|/g) || [];
  gateCount = gateLines.filter((l) => l.includes("pass")).length;

  // Parse promoted learnings
  const learningLines = content.match(/^-\s+(\w+-\d+):\s+(.+?)$/gm) || [];
  for (const line of learningLines) {
    const match = line.match(/^-\s+(\w+-\d+):\s+(.+)$/);
    if (match) learnings.push({ id: match[1], lesson: match[2] });
  }

  return { gates: gateCount, armed, learnings };
}

// Count work items by state
function countWorkItems() {
  const wiDir = join(root, ".modonome", "work-items");
  if (!existsSync(wiDir)) return {};

  const byState = {};
  for (const f of readdirSync(wiDir).filter((f) => f.endsWith(".json"))) {
    try {
      const item = JSON.parse(readFileSync(join(wiDir, f), "utf8"));
      const state = item.state || "unknown";
      byState[state] = (byState[state] || 0) + 1;
    } catch (e) {
      // Skip invalid items
    }
  }

  return byState;
}

// Parse version from .modonome/version
function readVersion() {
  const vPath = join(root, ".modonome", "version");
  if (existsSync(vPath)) {
    return readFileSync(vPath, "utf8").trim();
  }
  return "v0.1.0";
}

// Update site/index.html with live data
function updateSite(data) {
  const sitePath = join(root, "site", "index.html");
  if (!existsSync(sitePath)) {
    console.warn("site/index.html not found; skipping update.");
    return;
  }

  let html = readFileSync(sitePath, "utf8");

  // Replace engineBase values
  const engineLine = `this.engineBase = { lessons: ${data.learnings.length}, rules: ${data.rules || 0}, gates: ${data.gates}, queue: ${data.queue || 0}, version: '${data.version}', armed: ${data.armed} };`;
  html = html.replace(
    /this\.engineBase\s*=\s*\{[^}]+\};/,
    engineLine
  );

  writeFileSync(sitePath, html);
  console.log("Updated site/index.html with live data.");
}

// Verify site data matches evidence (used in CI gate)
function verifySiteData(data) {
  const sitePath = join(root, "site", "index.html");
  if (!existsSync(sitePath)) {
    console.error("site/index.html not found.");
    return false;
  }

  const html = readFileSync(sitePath, "utf8");
  const match = html.match(/this\.engineBase\s*=\s*\{\s*lessons:\s*(\d+),\s*rules:\s*(\d+),\s*gates:\s*(\d+),\s*queue:\s*(\d+)/);

  if (!match) {
    console.error("Could not parse engineBase in site/index.html.");
    return false;
  }

  const [, lessons, rules, gates, queue] = match.map(Number);
  const expected = {
    lessons: data.learnings.length,
    gates: data.gates,
  };

  if (lessons !== expected.lessons || gates !== expected.gates) {
    console.error(
      `Site data is stale or incorrect:\n` +
      `  Lessons: expected ${expected.lessons}, found ${lessons}\n` +
      `  Gates: expected ${expected.gates}, found ${gates}`
    );
    return false;
  }

  console.log("✓ Site data matches live evidence.");
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const evidence = parseEvidence();
    const workItems = countWorkItems();
    const version = readVersion();

    const data = {
      ...evidence,
      rules: workItems.completed || 0,
      queue: workItems.queued || 0,
      version,
    };

    if (verify) {
      const ok = verifySiteData(data);
      process.exit(ok ? 0 : 1);
    } else {
      updateSite(data);
      console.log(`Synced: ${data.learnings.length} learnings, ${data.gates} gates, ${data.queue} queued, armed=${data.armed}`);
      process.exit(0);
    }
  } catch (e) {
    console.error(`sync-site-data failed: ${e.message}`);
    process.exit(1);
  }
}
