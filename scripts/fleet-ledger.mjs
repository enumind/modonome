#!/usr/bin/env node
// Fleet Ledger: a static, host-only posture renderer over a directory of
// already-collected .modonome/policy-attestation.json files (ADR-036).
//
// It reads files you already placed in a local directory. It clones no repo,
// reaches no network, and knows nothing about how the files got there: that
// collection step is the caller's job (for example, a coordinating repo's own
// Action that clones sibling repos read-only and drops each repo's attestation
// file into a directory before invoking this tool locally). There is no server,
// no state directory of its own, and no config: the tool is a pure function of
// the input directory to the output file, callable on demand.
//
// Output format: HTML. A self-contained static table (inline CSS, zero external
// assets) is the more useful default for a multi-repo posture view, because it
// opens directly in a browser and needs no renderer or toolchain. The CLI
// signature centers on it ([--out <file.html>]).
//
// Determinism: rows are sorted by derived repo name (then filename), and no
// wall-clock timestamp is embedded. A "generated at" line appears only when an
// explicit --generated-at value is passed, so two runs over identical input
// produce byte-identical output. This mirrors the scenario-determinism rule the
// agentproof suite relies on: output content must be a function of input, never
// of the clock, or a determinism test cannot assert on it.
//
// Usage:
//   node scripts/fleet-ledger.mjs <dir-of-attestation-files> [--out <file.html>] [--generated-at <text>]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

// Pull "owner/repo" out of a repository URL such as
// https://github.com/enumind/modonome(.git). Returns "" when it does not parse.
export function parseRepoFromUrl(url) {
  if (typeof url !== "string") return "";
  const m = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  return m ? `${m[1]}/${m[2]}` : "";
}

// Derive a stable repo label. The generator block credits the tool (generator.name
// is always "modonome"), so the per-repo identity lives in generator.repository.
// Prefer that, then fall back to the filename (its basename without extension).
export function deriveRepoName(att, filename) {
  const fromUrl = att && att.generator ? parseRepoFromUrl(att.generator.repository) : "";
  if (fromUrl) return fromUrl;
  return basename(filename).replace(/\.json$/i, "");
}

// Three-way posture from the attestation posture block.
export function derivePosture(posture) {
  if (!posture || typeof posture !== "object") return "unknown";
  if (posture.autonomy_enabled !== true) return "disarmed";
  return posture.dry_run === true ? "dry-run" : "armed";
}

// Build one row from a filename and its raw text. A parse or shape problem is
// recorded on the row and reported as a table cell; it never throws, so one bad
// file cannot crash the whole run.
export function buildRow(filename, text) {
  const row = {
    filename,
    repo: basename(filename).replace(/\.json$/i, ""),
    posture: "unknown",
    capabilities: [],
    digest: "",
    disclosure: "",
    problem: null,
  };
  let att;
  try {
    att = JSON.parse(text);
  } catch (e) {
    row.problem = `not valid JSON: ${e.message}`;
    return row;
  }
  if (!att || typeof att !== "object") {
    row.problem = "not a JSON object";
    return row;
  }
  row.repo = deriveRepoName(att, filename);
  row.posture = derivePosture(att.posture);
  row.digest = typeof att.content_digest === "string" ? att.content_digest : "";
  row.disclosure = att.disclosure && typeof att.disclosure.model === "string" ? att.disclosure.model : "";
  if (att.policy && Array.isArray(att.policy.capabilities)) {
    row.capabilities = att.policy.capabilities
      .filter((c) => c && typeof c.name === "string")
      .map((c) => ({ name: c.name, on: c.default === true }));
  }
  const missing = [];
  if (!att.posture) missing.push("posture");
  if (!att.generator) missing.push("generator");
  if (!att.content_digest) missing.push("content_digest");
  if (missing.length > 0) {
    row.problem = `missing expected field(s): ${missing.join(", ")}`;
  }
  return row;
}

// Read every *.json file in dir and build a row for each. Files are read once
// with readFileSync (no separate stat then read, so there is no check-to-use
// race window). Returns unsorted rows.
export function collectRows(dir) {
  const names = readdirSync(dir).filter((n) => /\.json$/i.test(n));
  const rows = [];
  for (const name of names) {
    const full = join(dir, name);
    let text;
    try {
      text = readFileSync(full, "utf8");
    } catch (e) {
      rows.push({
        filename: name,
        repo: name.replace(/\.json$/i, ""),
        posture: "unknown",
        capabilities: [],
        digest: "",
        disclosure: "",
        problem: `unreadable: ${e.message}`,
      });
      continue;
    }
    rows.push(buildRow(name, text));
  }
  return rows;
}

// Deterministic order: by repo label, then by filename as a tie-break.
export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.repo !== b.repo) return a.repo < b.repo ? -1 : 1;
    return a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0;
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capabilitiesCell(caps) {
  if (!caps || caps.length === 0) return "<span class=\"muted\">none</span>";
  return caps
    .map((c) => escapeHtml(c.name) + (c.on ? " <span class=\"on\">(on)</span>" : ""))
    .join(", ");
}

// Render the sorted rows to a self-contained HTML document. Pure: given the same
// rows and options it returns the same string.
export function renderHtml(rows, options = {}) {
  const generatedAt = options.generatedAt;
  const body = rows
    .map((r) => {
      const postureClass = ["armed", "dry-run", "disarmed"].includes(r.posture)
        ? r.posture.replace("-", "")
        : "unknown";
      const problem = r.problem
        ? `<span class="problem">${escapeHtml(r.problem)}</span>`
        : "<span class=\"muted\">-</span>";
      return [
        "      <tr>",
        `        <td class="repo">${escapeHtml(r.repo)}</td>`,
        `        <td><span class="badge ${postureClass}">${escapeHtml(r.posture)}</span></td>`,
        `        <td>${capabilitiesCell(r.capabilities)}</td>`,
        `        <td class="digest">${escapeHtml(r.digest || "-")}</td>`,
        `        <td>${escapeHtml(r.disclosure || "-")}</td>`,
        `        <td>${problem}</td>`,
        "      </tr>",
      ].join("\n");
    })
    .join("\n");

  const caption = generatedAt
    ? `\n    <p class="meta">Generated at ${escapeHtml(generatedAt)}. ${rows.length} repositories.</p>`
    : `\n    <p class="meta">${rows.length} repositories.</p>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Modonome Fleet Ledger</title>
    <style>
      body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem; color: #0f172a; }
      h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
      .meta { color: #475569; margin: 0 0 1.25rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; }
      .repo { font-weight: 600; }
      .digest { font-family: ui-monospace, monospace; font-size: 0.8rem; word-break: break-all; }
      .muted { color: #94a3b8; }
      .on { color: #b45309; font-weight: 600; }
      .problem { color: #b91c1c; }
      .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; }
      .badge.armed { background: #fee2e2; color: #991b1b; }
      .badge.dryrun { background: #fef3c7; color: #92400e; }
      .badge.disarmed { background: #dcfce7; color: #166534; }
      .badge.unknown { background: #e2e8f0; color: #475569; }
    </style>
  </head>
  <body>
    <h1>Modonome Fleet Ledger</h1>${caption}
    <table>
      <thead>
        <tr>
          <th>Repository</th>
          <th>Posture</th>
          <th>Capabilities</th>
          <th>Content digest</th>
          <th>Disclosure</th>
          <th>Problem</th>
        </tr>
      </thead>
      <tbody>
${body}
      </tbody>
    </table>
  </body>
</html>
`;
}

// Full pipeline: directory to HTML string. Exported for tests.
export function renderLedgerFromDir(dir, options = {}) {
  return renderHtml(sortRows(collectRows(dir)), options);
}

function parseArgs(argv) {
  const opts = { dir: null, out: null, generatedAt: undefined };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      opts.out = argv[++i];
    } else if (a === "--generated-at") {
      opts.generatedAt = argv[++i];
    } else if (a.startsWith("-")) {
      throw new Error(`unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }
  opts.dir = positional[0] || null;
  return opts;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (!opts.dir) {
    console.error("Usage: node scripts/fleet-ledger.mjs <dir-of-attestation-files> [--out <file.html>] [--generated-at <text>]");
    process.exit(2);
  }
  let html;
  try {
    html = renderLedgerFromDir(opts.dir, { generatedAt: opts.generatedAt });
  } catch (e) {
    console.error(`Fleet Ledger could not read ${opts.dir}: ${e.message}`);
    process.exit(1);
  }
  if (opts.out) {
    writeFileSync(opts.out, html);
    console.error(`Fleet Ledger written to ${opts.out}`);
  } else {
    process.stdout.write(html);
  }
}

// Only run when invoked directly, so tests can import the pure functions above.
if (process.argv[1] && /fleet-ledger\.mjs$/.test(process.argv[1])) {
  main(process.argv.slice(2));
}
