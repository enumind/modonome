import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseCodeowners,
  ownersForPath,
  handleFromEmail,
  selfGovernanceOwnership,
} from "../apps/control-panel/server/ownership.mjs";

const REAL_CODEOWNERS = [
  "# comment",
  "*             @nateshpp @techseek4vr",
  "/scripts/     @nateshpp @techseek4vr",
  "",
].join("\n");

test("parseCodeowners drops comments/blanks and normalizes handles", () => {
  const rules = parseCodeowners(REAL_CODEOWNERS);
  assert.deepEqual(rules, [
    { pattern: "*", owners: ["nateshpp", "techseek4vr"] },
    { pattern: "/scripts/", owners: ["nateshpp", "techseek4vr"] },
  ]);
});

test("ownersForPath uses last-match-wins over patterns", () => {
  const rules = parseCodeowners(["*  @a", "/scripts/  @b @c"].join("\n"));
  assert.deepEqual(ownersForPath(rules, ".modonome/config.yaml"), ["a"], "only the catchall matches config.yaml");
  assert.deepEqual(ownersForPath(rules, "scripts/x.mjs"), ["b", "c"], "the more specific rule wins for scripts/");
});

test("handleFromEmail extracts a handle only from GitHub noreply addresses", () => {
  assert.equal(handleFromEmail("107772539+nateshpp@users.noreply.github.com"), "nateshpp");
  assert.equal(handleFromEmail("nateshpp@users.noreply.github.com"), "nateshpp");
  assert.equal(handleFromEmail("NateshPP@users.noreply.github.com"), "nateshpp", "case-insensitive");
  assert.equal(handleFromEmail("someone@example.com"), null, "a normal email carries no handle");
  assert.equal(handleFromEmail("noreply@anthropic.com"), null);
  assert.equal(handleFromEmail(""), null);
});

// A scratch repo whose git email is faked through the injected `exec`, so the decision
// is tested without touching this repo's real git config.
function scratchRepo(codeowners) {
  const root = mkdtempSync(join(tmpdir(), "ownership-test-"));
  if (codeowners !== null) {
    mkdirSync(join(root, ".github"));
    writeFileSync(join(root, ".github", "CODEOWNERS"), codeowners);
  }
  return root;
}

function fakeGitEmail(email) {
  return () => email;
}

test("selfGovernanceOwnership: a listed owner under a noreply identity is granted", () => {
  const root = scratchRepo(REAL_CODEOWNERS);
  const res = selfGovernanceOwnership(root, { exec: fakeGitEmail("1+nateshpp@users.noreply.github.com") });
  assert.equal(res.owner, true);
  assert.equal(res.handle, "nateshpp");
  rmSync(root, { recursive: true, force: true });
});

test("selfGovernanceOwnership: a non-owner handle is refused with a reason", () => {
  const root = scratchRepo(REAL_CODEOWNERS);
  const res = selfGovernanceOwnership(root, { exec: fakeGitEmail("9+stranger@users.noreply.github.com") });
  assert.equal(res.owner, false);
  assert.match(res.reason, /not a code owner/);
  rmSync(root, { recursive: true, force: true });
});

test("selfGovernanceOwnership: a non-noreply identity cannot be matched, so it fails closed", () => {
  const root = scratchRepo(REAL_CODEOWNERS);
  const res = selfGovernanceOwnership(root, { exec: fakeGitEmail("someone@example.com") });
  assert.equal(res.owner, false);
  assert.match(res.reason, /not a GitHub noreply address/);
  rmSync(root, { recursive: true, force: true });
});

test("selfGovernanceOwnership: no CODEOWNERS file fails closed (nobody is an owner)", () => {
  const root = scratchRepo(null);
  const res = selfGovernanceOwnership(root, { exec: fakeGitEmail("1+nateshpp@users.noreply.github.com") });
  assert.equal(res.owner, false);
  assert.match(res.reason, /no CODEOWNERS file/);
  rmSync(root, { recursive: true, force: true });
});
