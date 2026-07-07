#!/usr/bin/env node
// Markdown governance gate (ADR-031). Enforces the objective rules in
// docs/guidelines/markdown-governance.md so documentation sprawl and incoherence
// cannot creep back in. No external call. Runs in CI.
//
// Blocking checks:
//   1. Root allow-list: only approved Markdown files at the repo root.
//   2. Protected-file manifest: agent-critical files exist at their declared path.
//   3. Link integrity: every relative Markdown link under root and docs/ resolves.
//   4. ADR number uniqueness: no ADR-NNN reused within docs/adr/, and no ADR-NNN reused
//      across docs/adr/ and docs/research/.
//   5. Audit naming: docs/audits/ files follow <type>-YYYY-MM-DD.md.
//   6. Canonical uniqueness: no two active docs claim the same canonical topic key.
//   7. Staleness (docs/compliance/ and docs/audits/ only): last_reviewed front-matter is
//      required, and must not predate a meaningful number of commits to the paths the
//      doc cites. This is the small, externally-facing trust surface; the rest of docs/
//      stays under the advisory front-matter check below until it is fully migrated.
//
// Advisory checks (warn only, during the migration window):
//   kebab-case naming, front-matter presence (outside docs/compliance/ and docs/audits/),
//   docs index coverage, absolute self-links.
//
// Usage: node scripts/check-md-governance.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, extname, basename } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.MODONOME_ROOT ? process.env.MODONOME_ROOT : join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

const violations = [];
const warnings = [];

const ROOT_ALLOW_LIST = new Set([
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "GOVERNANCE.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CODEX.md",
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
  ".modonome/LESSONS.md",
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
    violations.push(formatMessage("gate.md-governance.root-not-allowed", { entry }, overrides).message);
  }
}

// 2. Protected-file manifest
for (const p of PROTECTED_FILES) {
  if (!existsSync(join(root, p))) {
    violations.push(formatMessage("gate.md-governance.protected-file-missing", { p }, overrides).message);
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
      formatMessage(
        "gate.md-governance.broken-link",
        { srcFile: relative(root, srcFile), rawTarget, resolved: relative(root, resolved) },
        overrides
      ).message
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
    warnings.push(formatMessage("gate.md-governance.hardcoded-blob-url", { file: relative(root, file) }, overrides).message);
  }
}

// 4. ADR number uniqueness within docs/adr, and across docs/adr and docs/research.
function adrNumbers(dir) {
  const nums = new Map(); // number -> file[]
  for (const f of walkMd(dir)) {
    const b = basename(f);
    const mm = b.match(/^ADR-(\d{3})/);
    if (!mm) continue;
    if (!nums.has(mm[1])) nums.set(mm[1], []);
    nums.get(mm[1]).push(f);
  }
  return nums;
}
const adrMain = adrNumbers(join(root, "docs", "adr"));

// 4a. Intra-directory duplicates: two files in docs/adr/ claiming the same number.
// A same-directory collision cannot be caught by comparing against docs/research/,
// so it needs its own pass over adrMain before that comparison runs.
for (const [num, files] of adrMain) {
  if (files.length > 1) {
    const names = files.map((f) => relative(root, f)).sort();
    violations.push(
      formatMessage(
        "gate.md-governance.adr-number-duplicate",
        { num, count: files.length, names: names.join(", ") },
        overrides
      ).message
    );
  }
}

// 4b. Cross-directory: an ADR-NNN prefix reused under docs/research/, which must use RD-NNN instead.
const adrResearch = adrNumbers(join(root, "docs", "research"));
for (const [num, files] of adrResearch) {
  if (adrMain.has(num)) {
    violations.push(
      formatMessage(
        "gate.md-governance.adr-number-cross-directory",
        { num, adrFile: relative(root, adrMain.get(num)[0]), researchFile: relative(root, files[0]) },
        overrides
      ).message
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
      violations.push(formatMessage("gate.md-governance.audit-naming-invalid", { f }, overrides).message);
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

// 7. Staleness helpers, scoped to docs/compliance/ and docs/audits/.
const STALENESS_DIRS = new Set(["compliance", "audits"]);
// The commit-threshold check applies only to docs/compliance/: it makes an ongoing claim
// ("this is how the system behaves now") that should track code changes. docs/audits/
// files are point-in-time snapshots by design, already dated in their filename and
// chained by `supersedes` front-matter to whatever superseded them; requiring them to
// also track every commit touching the paths they cite would flag nearly every audit
// as stale within the same day it is written, since an audit's whole purpose is citing
// the most actively-changing code. Both directories still require last_reviewed to exist.
const STALENESS_COMMIT_CHECK_DIRS = new Set(["compliance"]);
const STALENESS_COMMIT_THRESHOLD = 15;

// Backtick-quoted repo paths a doc cites as evidence, e.g. `scripts/check-drift.mjs` or
// the bare `check-drift.mjs`. Only paths that resolve to a real file count: prose can
// backtick-quote all sorts of things that are not paths.
// Directories a bare (no-slash) filename is likely to live in, keyed by extension.
// Without this, a citation like `publish.yml` (meaning .github/workflows/publish.yml)
// never resolves to a real file and silently drops out of staleness tracking.
const BARE_FILENAME_DIRS = {
  ".mjs": ["scripts"],
  ".yml": [".github/workflows"],
  ".yaml": [".github/workflows"],
};

function extractCitedPaths(text) {
  const found = new Set();
  const re = /`([a-zA-Z0-9_.\/-]+\.(?:mjs|yml|yaml|json|md))`/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    const ext = extname(raw);
    const candidates = !raw.includes("/") && BARE_FILENAME_DIRS[ext]
      ? [raw, ...BARE_FILENAME_DIRS[ext].map((dir) => `${dir}/${raw}`)]
      : [raw];
    for (const c of candidates) {
      if (existsSync(join(root, c))) { found.add(c); break; }
    }
  }
  return [...found];
}

// Commits touching any of `paths` since `sinceDate` (a YYYY-MM-DD string already
// validated by the caller). Returns 0 (fail open, warn-free) if this is not a git
// checkout, e.g. an npm-installed copy of the package with no .git directory.
//
// A bare YYYY-MM-DD is not enough: git's approxidate parser resolves a date with no
// time-of-day using the current wall-clock time, not midnight, so `--since` on the
// exact calendar day of `sinceDate` would silently miss commits made earlier that same
// day. Pinning the time to 00:00:00 makes the comparison depend only on the date.
function commitsSince(paths, sinceDate) {
  if (paths.length === 0) return 0;
  try {
    const out = execFileSync("git", ["log", "--since", `${sinceDate} 00:00:00`, "--oneline", "--", ...paths], {
      cwd: root,
      encoding: "utf8",
    });
    return out.split("\n").filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

// 6 and 7. Canonical uniqueness, staleness, and advisory front-matter / naming coverage.
const docsFiles = walkMd(join(root, "docs"));
const canonicalOwners = new Map();
let missingFrontMatter = 0;
for (const file of docsFiles) {
  const b = basename(file);
  const text = readFileSync(file, "utf8");
  const fm = parseFrontMatter(text);
  const relPath = relative(root, file);
  const parentDir = basename(dirname(file));

  // Advisory: kebab-case naming (allow README, ADR-, RD-).
  if (b !== "README.md" && !/^ADR-\d{3}-[a-z0-9-]+\.md$/.test(b) && !/^RD-\d{3}-[a-z0-9-]+\.md$/.test(b)) {
    if (!/^[a-z0-9][a-z0-9-]*\.md$/.test(b)) {
      warnings.push(formatMessage("gate.md-governance.not-kebab-case", { file: relative(root, file) }, overrides).message);
    }
  }

  // Blocking (docs/compliance/, docs/audits/) or advisory (everywhere else under docs/):
  // front-matter presence. ADR and RD records use a header convention instead.
  if (b !== "README.md" && !/^(ADR|RD)-\d{3}/.test(b)) {
    if (!fm) {
      if (STALENESS_DIRS.has(parentDir)) {
        violations.push(formatMessage("gate.md-governance.missing-last-reviewed", { relPath }, overrides).message);
      } else {
        missingFrontMatter++;
      }
    }
  }

  // Blocking: last_reviewed date format, for docs/compliance/ and docs/audits/ both.
  // The commit-threshold count below is compliance-only, but a malformed date is worth
  // catching everywhere last_reviewed is required.
  if (fm && fm.last_reviewed && STALENESS_DIRS.has(parentDir) && fm.status !== "superseded" && fm.status !== "deprecated") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.last_reviewed)) {
      violations.push(
        formatMessage("gate.md-governance.invalid-last-reviewed-date", { relPath, lastReviewed: fm.last_reviewed }, overrides).message
      );
    } else if (STALENESS_COMMIT_CHECK_DIRS.has(parentDir)) {
      // Blocking: commit-threshold staleness, for docs/compliance/ only (see the
      // constant's comment above for why docs/audits/ is excluded). A doc whose
      // last_reviewed predates a meaningful number of commits to the paths it cites
      // may describe behavior that has since changed.
      const cited = extractCitedPaths(text);
      const n = commitsSince(cited, fm.last_reviewed);
      if (n > STALENESS_COMMIT_THRESHOLD) {
        violations.push(
          formatMessage(
            "gate.md-governance.stale-doc",
            { relPath, lastReviewed: fm.last_reviewed, count: n, threshold: STALENESS_COMMIT_THRESHOLD },
            overrides
          ).message
        );
      }
    }
  }

  // Blocking: canonical uniqueness among active docs.
  if (fm && Array.isArray(fm.canonical) && fm.status !== "superseded" && fm.status !== "deprecated") {
    for (const key of fm.canonical) {
      if (canonicalOwners.has(key)) {
        violations.push(
          formatMessage(
            "gate.md-governance.canonical-topic-conflict",
            { key, first: relative(root, canonicalOwners.get(key)), second: relative(root, file) },
            overrides
          ).message
        );
      } else {
        canonicalOwners.set(key, file);
      }
    }
  }
}
if (missingFrontMatter > 0) {
  warnings.push(
    formatMessage("gate.md-governance.missing-front-matter-count", { count: missingFrontMatter }, overrides).message
  );
}

// Advisory: docs index coverage for top-level docs files.
const indexPath = join(root, "docs", "README.md");
if (!existsSync(indexPath)) {
  warnings.push(formatMessage("gate.md-governance.docs-index-missing", {}, overrides).message);
} else {
  const indexText = readFileSync(indexPath, "utf8");
  for (const f of readdirSync(join(root, "docs"))) {
    if (extname(f) !== ".md" || f === "README.md") continue;
    if (!indexText.includes(f)) {
      warnings.push(formatMessage("gate.md-governance.docs-index-uncovered", { f }, overrides).message);
    }
  }
}

// Report.
console.log("Markdown governance (ADR-031)");
console.log("=============================");
for (const w of warnings) console.warn("  warn: " + w);
if (violations.length === 0) {
  console.log(`PASS: root allow-list, protected files, links, ADR numbers, audits, and canonical keys all clean.`);
  if (warnings.length > 0)
    console.log(formatMessage("gate.md-governance.warning-summary", { count: warnings.length }, overrides).message);
  process.exit(0);
}
console.error(formatMessage("gate.md-governance.fail-summary", { count: violations.length }, overrides).message);
for (const v of violations) console.error("  - " + v);
process.exit(1);
