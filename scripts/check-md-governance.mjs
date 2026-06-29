#!/usr/bin/env node
// Markdown governance gate (ADR-031). Enforces the objective rules in
// docs/guidelines/markdown-governance.md so documentation sprawl and incoherence
// cannot creep back in. No external call. Runs in CI.
//
// Blocking checks:
//   1. Root allow-list: only approved Markdown files at the repo root.
//   2. Protected-file manifest: agent-critical files exist at their declared path.
//   3. Link integrity: every relative Markdown link under root and docs/ resolves.
//   4. ADR number uniqueness: no ADR-NNN reused across docs/adr/ and docs/research/.
//   5. Audit naming: docs/audits/ files follow <type>-YYYY-MM-DD.md.
//   6. Canonical uniqueness: no two active docs claim the same canonical topic key.
//
// Advisory checks (warn only, during the migration window):
//   kebab-case naming, front-matter presence, docs index coverage, absolute self-links.
//
// Usage: node scripts/check-md-governance.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, extname, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const violations = [];
const warnings = [];

const ROOT_ALLOW_LIST = new Set([
  'RATCHET-SPEC.md',
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "GOVERNANCE.md",
  "AGENTS.md",
  "RELEASE-EVIDENCE.md",
  "QUICKSTART.md",
  "ADOPTION-GUIDE.md",
  "ARCHITECTURE.md",
  "ROADMAP.md",
]);

// Agent-critical files that a future cleanup pass must never silently relocate.
const PROTECTED_FILES = [
  "AGENTS.md",
  "RELEASE-EVIDENCE.md",
  "ROADMAP.md",
  ".modonome/STATUS.md",
  ".modonome/DECISIONS.md",
  ".modonome/LEARNINGS.md",
  ".modonome/NETWORK.md",
  ".modonome/control-panel.md",
  ".modonome/config.yaml",
  "prompts/modonome.core.md",
];

function walkMd(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walkMd(full, out);
    else if (extname(entry) === ".md") out.push(full);
  }
  return out;
}

// 1. Root allow-list
for (const entry of readdirSync(root)) {
  if (extname(entry) !== ".md") continue;
  const s = statSync(join(root, entry));
  if (s.isDirectory()) continue;
  if (!ROOT_ALLOW_LIST.has(entry)) {
    violations.push(
      `[root-allowlist] ${entry} is not permitted at the repository root. ` +
        `Move it under docs/ or add it to ROOT_ALLOW_LIST in scripts/check-md-governance.mjs.`
    );
  }
}

// 2. Protected-file manifest
for (const p of PROTECTED_FILES) {
  if (!existsSync(join(root, p))) {
    violations.push(
      `[protected-file] ${p} is missing. This file is agent-critical and must exist at this path. ` +
        `If it was moved, update the manifest and every script that reads it.`
    );
  }
}

// 3. Link integrity across root and docs/ Markdown.
const linkFiles = [
  ...readdirSync(root)
    .filter((e) => extname(e) === ".md" && statSync(join(root, e)).isFile())
    .map((e) => join(root, e)),
  ...walkMd(join(root, "docs")),
];
const mdLink = /\[[^\]]*\]\(([^)]+)\)/g;
const htmlHref = /<a\s+[^>]*href="([^"]+)"/gi;

function checkTarget(fileDir, rawTarget, srcFile) {
  let target = rawTarget.trim();
  if (!target) return;
  // Strip a trailing anchor or query.
  const hashIdx = target.indexOf("#");
  if (hashIdx === 0) return; // pure in-page anchor
  if (hashIdx > 0) target = target.slice(0, hashIdx);
  if (!target) return;
  if (/^[a-z]+:/i.test(target)) return; // http:, https:, mailto:, etc.
  // Only validate Markdown file links and directory links; skip assets and bare anchors.
  const isDir = target.endsWith("/");
  if (!isDir && extname(target) !== ".md") return;
  const resolved = resolve(fileDir, target);
  if (!existsSync(resolved)) {
    violations.push(
      `[link] ${relative(root, srcFile)} links to "${rawTarget}" which does not resolve ` +
        `(${relative(root, resolved)}).`
    );
  }
}

for (const file of linkFiles) {
  const text = readFileSync(file, "utf8");
  const fileDir = dirname(file);
  let m;
  while ((m = mdLink.exec(text)) !== null) checkTarget(fileDir, m[1], file);
  while ((m = htmlHref.exec(text)) !== null) checkTarget(fileDir, m[1], file);
  // Advisory: absolute self-links to in-repo blobs break on forks.
  // Require a delimiter before the URL so the pattern cannot match a URL embedded
  // inside an arbitrary hostname (e.g. evil.com/https://github.com/...).
  if (/(?:^|[\s"'(])https:\/\/github\.com\/[^/]+\/modonome\/blob\//m.test(text)) {
    warnings.push(`[self-link] ${relative(root, file)} hardcodes a github.com blob URL to an in-repo file.`);
  }
}

// 4. ADR number uniqueness across docs/adr and docs/research.
function adrNumbers(dir) {
  const nums = new Map();
  for (const f of walkMd(dir)) {
    const b = basename(f);
    const mm = b.match(/^ADR-(\d{3})/);
    if (mm) nums.set(mm[1], f);
  }
  return nums;
}
const adrMain = adrNumbers(join(root, "docs", "adr"));
const adrResearch = adrNumbers(join(root, "docs", "research"));
for (const [num, f] of adrResearch) {
  if (adrMain.has(num)) {
    violations.push(
      `[adr-number] ADR-${num} is used in both docs/adr/ and docs/research/ (${relative(root, f)}). ` +
        `Research must use the RD-NNN prefix so numbers are never reused.`
    );
  }
}

// 5. Audit naming.
const auditDir = join(root, "docs", "audits");
const auditRe = /^[a-z][a-z0-9-]+-\d{4}-\d{2}-\d{2}\.md$/;
if (existsSync(auditDir)) {
  for (const f of readdirSync(auditDir)) {
    if (extname(f) !== ".md" || f === "README.md") continue;
    if (!auditRe.test(f)) {
      violations.push(`[audit-naming] docs/audits/${f} must match <type>-YYYY-MM-DD.md.`);
    }
  }
}

// Front-matter parsing for canonical uniqueness and advisory presence.
function parseFrontMatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;
  const block = text.slice(4, end);
  const fm = {};
  for (const line of block.split("\n")) {
    const mm = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!mm) continue;
    const key = mm[1];
    let val = mm[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return fm;
}

// 6. Canonical uniqueness and advisory front-matter / naming coverage.
const docsFiles = walkMd(join(root, "docs"));
const canonicalOwners = new Map();
let missingFrontMatter = 0;
for (const file of docsFiles) {
  const b = basename(file);
  const text = readFileSync(file, "utf8");
  const fm = parseFrontMatter(text);

  // Advisory: kebab-case naming (allow README, ADR-, RD-).
  if (b !== "README.md" && !/^ADR-\d{3}-[a-z0-9-]+\.md$/.test(b) && !/^RD-\d{3}-[a-z0-9-]+\.md$/.test(b)) {
    if (!/^[a-z0-9][a-z0-9-]*\.md$/.test(b)) {
      warnings.push(`[naming] ${relative(root, file)} is not lowercase-kebab-case.`);
    }
  }

  // Advisory: front-matter presence (skip ADR and RD records, which use a header convention).
  if (b !== "README.md" && !/^(ADR|RD)-\d{3}/.test(b)) {
    if (!fm) missingFrontMatter++;
  }

  // Blocking: canonical uniqueness among active docs.
  if (fm && Array.isArray(fm.canonical) && fm.status !== "superseded" && fm.status !== "deprecated") {
    for (const key of fm.canonical) {
      if (canonicalOwners.has(key)) {
        violations.push(
          `[canonical] topic "${key}" is claimed by both ${relative(root, canonicalOwners.get(key))} ` +
            `and ${relative(root, file)}. A topic has exactly one active source of truth.`
        );
      } else {
        canonicalOwners.set(key, file);
      }
    }
  }
}
if (missingFrontMatter > 0) {
  warnings.push(
    `[front-matter] ${missingFrontMatter} doc(s) under docs/ have no front-matter. ` +
      `Add status/owner/last_reviewed per docs/guidelines/markdown-governance.md (advisory during migration).`
  );
}

// Advisory: docs index coverage for top-level docs files.
const indexPath = join(root, "docs", "README.md");
if (!existsSync(indexPath)) {
  warnings.push("[index] docs/README.md is missing.");
} else {
  const indexText = readFileSync(indexPath, "utf8");
  for (const f of readdirSync(join(root, "docs"))) {
    if (extname(f) !== ".md" || f === "README.md") continue;
    if (!indexText.includes(f)) {
      warnings.push(`[index] docs/${f} is not linked from docs/README.md.`);
    }
  }
}

// Report.
console.log("Markdown governance (ADR-031)");
console.log("=============================");
for (const w of warnings) console.warn("  warn: " + w);
if (violations.length === 0) {
  console.log(`PASS: root allow-list, protected files, links, ADR numbers, audits, and canonical keys all clean.`);
  if (warnings.length > 0) console.log(`(${warnings.length} advisory warning(s); not blocking.)`);
  process.exit(0);
}
console.error(`\nFAIL: ${violations.length} governance violation(s):\n`);
for (const v of violations) console.error("  - " + v);
process.exit(1);
