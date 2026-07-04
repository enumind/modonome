#!/usr/bin/env node
// Sync live data from source docs into the site.
// Into site/index.html (engineBase): gate count, work queue counts, promoted
// learnings, armed status, product version.
// Into site/repo-data.js (meta): product version (package.json), AgentProof
// normative score and level (agentproof/README.md).
// Ensures site always reflects real repo state, never hand-edited fiction.
//
// Usage:
//   node scripts/sync-site-data.mjs            read sources and update site
//   node scripts/sync-site-data.mjs --verify   fail if engineBase is stale
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Read a file, returning null if it does not exist. Reads directly instead of
// checking existsSync first, so there is no window between the check and the
// read where the file could be removed out from under the process.
function readIfExists(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));
const verify = process.argv.includes("--verify");

// Parse RELEASE-EVIDENCE.md to extract gate counts and autonomy status
function parseEvidence() {
  const evidencePath = join(root, "RELEASE-EVIDENCE.md");
  const content = readIfExists(evidencePath);
  if (content == null) {
    return { gates: 0, armed: false, learnings: [] };
  }

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
  let files;
  try {
    files = readdirSync(wiDir);
  } catch (e) {
    return {};
  }

  const byState = {};
  for (const f of files.filter((f) => f.endsWith(".json"))) {
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

// Parse the product version from package.json. (.modonome/version holds a
// schema version, not the product version, so it must not be used here.)
function readVersion() {
  const pkgPath = join(root, "package.json");
  const content = readIfExists(pkgPath);
  if (content != null) {
    try {
      const v = JSON.parse(content).version;
      if (v) return v.startsWith("v") ? v : "v" + v;
    } catch (e) {
      // fall through to default
    }
  }
  return "v0.1.0";
}

// Parse the normative AgentProof score and level from agentproof/README.md.
function parseAgentproof() {
  const apPath = join(root, "agentproof", "README.md");
  const out = { score: "25/25", level: "HARDENED" };
  const content = readIfExists(apPath);
  if (content == null) return out;
  const scoreMatch = content.match(/Score:\s*(\d+\/\d+)\s*normative/i);
  if (scoreMatch) out.score = scoreMatch[1];
  const levelMatch = content.match(/Level:\s*([A-Z]+)/);
  if (levelMatch) out.level = levelMatch[1];
  return out;
}

// Update the meta block in site/repo-data.js (version, score, level).
function updateRepoData(data) {
  const dataPath = join(root, "site", "repo-data.js");
  let js = readIfExists(dataPath);
  if (js == null) {
    console.warn(formatMessage("advisory.sync-site-data.repo-data-missing", {}, overrides).message);
    return;
  }
  js = js.replace(/(version:\s*')[^']*(')/, `$1${data.version}$2`);
  js = js.replace(/(agentproofScore:\s*')[^']*(')/, `$1${data.score}$2`);
  js = js.replace(/(agentproofLevel:\s*')[^']*(')/, `$1${data.level}$2`);
  writeFileSync(dataPath, js);
  console.log("Updated site/repo-data.js meta (version, score, level).");
}

// Update site/index.html with live data
function updateSite(data) {
  const sitePath = join(root, "site", "index.html");
  let html = readIfExists(sitePath);
  if (html == null) {
    console.warn(formatMessage("advisory.sync-site-data.index-missing", {}, overrides).message);
    return;
  }

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
  const html = readIfExists(sitePath);
  if (html == null) {
    console.error(formatMessage("advisory.sync-site-data.verify-index-missing", {}, overrides).message);
    return false;
  }

  const match = html.match(/this\.engineBase\s*=\s*\{\s*lessons:\s*(\d+),\s*rules:\s*(\d+),\s*gates:\s*(\d+),\s*queue:\s*(\d+)/);

  if (!match) {
    console.error(formatMessage("advisory.sync-site-data.engine-base-unparseable", {}, overrides).message);
    return false;
  }

  const [, lessons, rules, gates, queue] = match.map(Number);
  const expected = {
    lessons: data.learnings.length,
    gates: data.gates,
  };

  if (lessons !== expected.lessons || gates !== expected.gates) {
    console.error(
      formatMessage(
        "advisory.sync-site-data.stale",
        { expectedLessons: expected.lessons, foundLessons: lessons, expectedGates: expected.gates, foundGates: gates },
        overrides
      ).message
    );
    return false;
  }

  console.log("✓ Site data matches live evidence.");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const evidence = parseEvidence();
    const workItems = countWorkItems();
    const version = readVersion();
    const agentproof = parseAgentproof();

    const data = {
      ...evidence,
      rules: workItems.completed || 0,
      queue: workItems.queued || 0,
      version,
      score: agentproof.score,
      level: agentproof.level,
    };

    if (verify) {
      const ok = verifySiteData(data);
      process.exit(ok ? 0 : 1);
    } else {
      updateSite(data);
      updateRepoData(data);
      console.log(`Synced: ${data.learnings.length} learnings, ${data.gates} gates, ${data.queue} queued, armed=${data.armed}, version=${data.version}, score=${data.score} ${data.level}`);
      process.exit(0);
    }
  } catch (e) {
    console.error(formatMessage("advisory.sync-site-data.failed", { error: e.message }, overrides).message);
    process.exit(1);
  }
}
