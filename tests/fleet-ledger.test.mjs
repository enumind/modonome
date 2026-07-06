import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  renderLedgerFromDir,
  buildRow,
  derivePosture,
  deriveRepoName,
  parseRepoFromUrl,
} from "../scripts/fleet-ledger.mjs";

// Build a well-formed policy-attestation object (ADR-036 shape) via a helper, so
// the fixtures are constructed at runtime rather than pasted as large literals.
function makeAtt(repoUrl, autonomyEnabled, dryRun, caps, digest) {
  return {
    manifest_version: 2,
    kind: "policy-attestation",
    generator: {
      name: "modonome",
      homepage: "https://modonome.com",
      repository: repoUrl,
    },
    disclosure: { model: "architectural", statement: "s", sources: [] },
    policy: { capabilities: caps },
    posture: { autonomy_enabled: autonomyEnabled, dry_run: dryRun },
    content_digest: digest,
  };
}

// Filenames are chosen so that alphabetical filename order (0,1,2,3) differs from
// the sorted-by-repo-name order the renderer must produce, proving the sort is by
// derived repo name, not readdir order.
const dir = mkdtempSync(join(tmpdir(), "fleet-ledger-"));
writeFileSync(
  join(dir, "3-alpha.json"),
  JSON.stringify(makeAtt("https://github.com/acme/alpha", true, false, [
    { name: "repo_network_enabled", default: false },
    { name: "remediation_apply_enabled", default: true },
  ], "sha256:aaa111"))
);
writeFileSync(
  join(dir, "1-beta.json"),
  JSON.stringify(makeAtt("https://github.com/acme/beta", false, true, [], "sha256:bbb222"))
);
writeFileSync(
  join(dir, "2-gamma.json"),
  JSON.stringify(makeAtt("https://github.com/acme/gamma", true, true, [], "sha256:ccc333"))
);
// A deliberately malformed file: must be reported as a row, never crash the run.
const brokenText = "{ this is not " + "valid json";
writeFileSync(join(dir, "0-broken.json"), brokenText);

after(() => rmSync(dir, { recursive: true, force: true }));

test("output is deterministic across two runs over identical input", () => {
  const first = renderLedgerFromDir(dir);
  const second = renderLedgerFromDir(dir);
  assert.equal(first, second, "two renders of the same directory must be byte-identical");
});

test("rows are sorted by derived repo name, independent of filename order", () => {
  const html = renderLedgerFromDir(dir);
  const iBroken = html.indexOf("0-broken");
  const iAlpha = html.indexOf("acme/alpha");
  const iBeta = html.indexOf("acme/beta");
  const iGamma = html.indexOf("acme/gamma");
  assert.ok(iBroken >= 0 && iAlpha >= 0 && iBeta >= 0 && iGamma >= 0, "all four rows should render");
  assert.ok(iBroken < iAlpha, "the malformed row (0-broken) sorts before acme/alpha");
  assert.ok(iAlpha < iBeta, "acme/alpha sorts before acme/beta");
  assert.ok(iBeta < iGamma, "acme/beta sorts before acme/gamma");
});

test("posture is rendered per attestation", () => {
  const html = renderLedgerFromDir(dir);
  assert.match(html, /badge armed">armed/, "the armed repo shows an armed badge");
  assert.match(html, /badge disarmed">disarmed/, "the disarmed repo shows a disarmed badge");
  assert.match(html, /badge dryrun">dry-run/, "the dry-run repo shows a dry-run badge");
});

test("a malformed file is reported as a row and does not crash the run", () => {
  const html = renderLedgerFromDir(dir);
  assert.ok(html.includes("not valid JSON"), "the malformed file's parse problem is surfaced in a cell");
  const row = buildRow("0-broken.json", brokenText);
  assert.equal(row.posture, "unknown", "a malformed file has unknown posture");
  assert.ok(row.problem !== null, "a malformed file records a problem");
});

test("a well-formed attestation records no problem", () => {
  const row = buildRow("ok.json", JSON.stringify(makeAtt("https://github.com/acme/ok", false, true, [], "sha256:ddd")));
  assert.equal(row.problem, null, "a complete attestation has no problem");
  assert.equal(row.repo, "acme/ok");
  assert.equal(row.posture, "disarmed");
  assert.equal(row.digest, "sha256:ddd");
});

test("derivePosture maps the three postures and the unknown case", () => {
  assert.equal(derivePosture({ autonomy_enabled: true, dry_run: false }), "armed");
  assert.equal(derivePosture({ autonomy_enabled: true, dry_run: true }), "dry-run");
  assert.equal(derivePosture({ autonomy_enabled: false, dry_run: true }), "disarmed");
  assert.equal(derivePosture(null), "unknown");
});

test("parseRepoFromUrl extracts owner/repo, or empty when it does not parse", () => {
  assert.equal(parseRepoFromUrl("https://github.com/enumind/modonome"), "enumind/modonome");
  assert.equal(parseRepoFromUrl("https://github.com/enumind/modonome.git"), "enumind/modonome");
  assert.equal(parseRepoFromUrl("not-a-url"), "");
  assert.equal(parseRepoFromUrl(undefined), "");
});

test("deriveRepoName falls back to the filename when no generator is present", () => {
  assert.equal(deriveRepoName({}, "some-repo.json"), "some-repo");
  assert.equal(deriveRepoName({ generator: { repository: "https://github.com/o/r" } }, "x.json"), "o/r");
});

test("--generated-at is the only way a timestamp appears (determinism guard)", () => {
  const withStamp = renderLedgerFromDir(dir, { generatedAt: "2026-07-04" });
  const without = renderLedgerFromDir(dir);
  assert.ok(withStamp.includes("Generated at 2026-07-04"), "an explicit stamp appears when passed");
  assert.ok(!without.includes("Generated at"), "no stamp appears by default, so runs stay reproducible");
});
