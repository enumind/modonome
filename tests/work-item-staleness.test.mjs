import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

import {
  hasLiveLease,
  extractOwnTestFiles,
  implementationPaths,
  staleCandidate,
  findStaleWorkItems,
} from "../scripts/lib/work-item-staleness.mjs";

test("hasLiveLease is true only for an unexpired lease with a holder", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(hasLiveLease({}), false);
  assert.equal(hasLiveLease({ owner: "x" }), false, "no expiry means no live lease");
  assert.equal(hasLiveLease({ owner: "x", lease_expires_at: past }), false, "expired lease is not live");
  assert.equal(hasLiveLease({ owner: "x", lease_expires_at: future }), true);
  assert.equal(hasLiveLease({ lease_owner: "x", lease_expires_at: future }), true, "lease_owner counts too");
});

test("extractOwnTestFiles finds only literal test-file paths, ignoring broad gates", () => {
  const gates = ["node --test tests/providers.test.mjs", "node scripts/check-style.mjs .", "npm run verify"];
  assert.deepEqual(extractOwnTestFiles(gates), ["tests/providers.test.mjs"]);
  assert.deepEqual(extractOwnTestFiles(["node --test tests/a.test.mjs", "node --test tests/a.test.mjs"]), ["tests/a.test.mjs"]);
  assert.deepEqual(extractOwnTestFiles([]), []);
});

test("implementationPaths excludes the item's own test files from allowed_edit_set", () => {
  const item = {
    allowed_edit_set: ["scripts/agent/providers.mjs", "tests/providers.test.mjs"],
    gates: ["node --test tests/providers.test.mjs"],
  };
  assert.deepEqual(implementationPaths(item), ["scripts/agent/providers.mjs"]);
});

test("staleCandidate skips terminal states, live leases, and unverifiable items", () => {
  const now = new Date();
  const future = new Date(now.getTime() + 60_000).toISOString();

  assert.equal(staleCandidate({ state: "done", gates: [] }, now), null, "terminal state never flagged");
  assert.equal(staleCandidate({ state: "escalated", gates: [] }, now), null);
  assert.equal(
    staleCandidate({ state: "claimed", owner: "someone", lease_expires_at: future, gates: [] }, now),
    null,
    "a live lease means real work may be in progress",
  );
  assert.equal(
    staleCandidate({ state: "queued", gates: ["npm run verify"] }, now),
    null,
    "no resolvable test file means unverifiable, not stale",
  );
  assert.equal(
    staleCandidate({ state: "queued", gates: ["node --test tests/does-not-exist.test.mjs"] }, now),
    null,
    "a test file that doesn't exist on disk cannot have already passed",
  );
});

test("staleCandidate flags an open item whose real, already-existing files match this repo", () => {
  // scripts/agent/providers.mjs and tests/providers.test.mjs are real files in this repo,
  // exercising the exact WI-026 shape that motivated this check.
  const item = {
    state: "queued",
    allowed_edit_set: ["scripts/agent/providers.mjs", "tests/providers.test.mjs"],
    gates: ["node --test tests/providers.test.mjs", "npm run verify"],
  };
  const candidate = staleCandidate(item);
  assert.ok(candidate, "a real, existing implementation with a real, existing test file must be flagged as a candidate");
  assert.deepEqual(candidate.testFiles, ["tests/providers.test.mjs"]);
  assert.deepEqual(candidate.implPaths, ["scripts/agent/providers.mjs"]);
});

test("findStaleWorkItems runs the candidate's test file and only reports it if that test actually passes", () => {
  const passingItem = {
    id: "WI-fixture-passing",
    state: "queued",
    allowed_edit_set: ["scripts/agent/providers.mjs"],
    gates: ["node --test tests/providers.test.mjs"],
  };
  const found = findStaleWorkItems([passingItem], { spawn: () => ({ status: 0 }) });
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "WI-fixture-passing");

  const notFound = findStaleWorkItems([passingItem], { spawn: () => ({ status: 1 }) });
  assert.equal(notFound.length, 0, "a failing test means the item is genuinely still open, not stale");
});

test("end to end against a scratch fixture: a merged-but-unmarked item is caught, an in-progress one is not", () => {
  // extractOwnTestFiles only matches paths that literally read as tests/*.test.mjs
  // (matching every real work item's gates), so the fixture must live under this
  // repo's own tests/ dir, not an arbitrary OS tmp path, cleaned up immediately after.
  const dir = mkdtempSync(join(here, "fixture-staleness-"));
  const dirName = dir.slice(here.length + 1);
  const implFile = `tests/${dirName}/impl.mjs`;
  const testFile = `tests/${dirName}/impl.test.mjs`;
  writeFileSync(join(dir, "impl.mjs"), "export const done = true;\n");
  writeFileSync(join(dir, "impl.test.mjs"), "import { test } from 'node:test'; test('noop', () => {});\n");

  try {
    const stuckDone = {
      id: "WI-fixture-stuck",
      state: "queued",
      allowed_edit_set: [implFile],
      gates: [`node --test ${testFile}`],
    };
    const genuinelyOpen = {
      id: "WI-fixture-open",
      state: "queued",
      allowed_edit_set: ["this/file/does/not/exist.mjs"],
      gates: ["node --test tests/this-file-does-not-exist.test.mjs"],
    };
    const inProgress = {
      id: "WI-fixture-claimed",
      state: "claimed",
      owner: "someone",
      lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
      allowed_edit_set: [implFile],
      gates: [`node --test ${testFile}`],
    };

    const found = findStaleWorkItems([stuckDone, genuinelyOpen, inProgress]);
    assert.deepEqual(
      found.map((f) => f.id),
      ["WI-fixture-stuck"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
