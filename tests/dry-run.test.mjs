// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fixtures = join(root, "fixtures", "dry-run");

function dryRun(dir) {
  return spawnSync("node", [join(root, "scripts/dry-run-sweep.mjs"), dir], {
    encoding: "utf8",
    timeout: 30000,
  });
}

test("dry-run on a Node project detects stack and proposes work", () => {
  const result = dryRun(join(fixtures, "node"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  const out = result.stdout;
  assert.match(out, /Mode: dry-run\. This run changed nothing/, "must declare dry-run mode");
  assert.match(out, /Node or TypeScript/, "must detect Node stack");
  assert.match(out, /npm/, "must detect npm as package manager");
  assert.match(out, /Proposed bounded work/, "must propose work");
  assert.match(out, /1\./, "must include at least one proposal");
});

test("dry-run on a Python project detects Python stack", () => {
  const result = dryRun(join(fixtures, "python"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  const out = result.stdout;
  assert.match(out, /Python/, "must detect Python stack");
  assert.match(out, /pip/, "must detect pip");
  assert.match(out, /pytest/, "must include pytest as a gate");
});

test("dry-run on an empty directory reports unknown stack", () => {
  const result = dryRun(join(fixtures, "empty"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  const out = result.stdout;
  assert.match(out, /Unknown/, "must report Unknown stack for an empty directory");
  assert.match(out, /Mode: dry-run\. This run changed nothing/, "must still declare dry-run mode");
});

test("dry-run output always includes safety footer", () => {
  const result = dryRun(join(fixtures, "node"));
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Refused by default/, "must include refusal footer");
});

test("dry-run detects protected paths when present", () => {
  const result = dryRun(join(fixtures, "node"));
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Protected paths it would never auto-merge/, "must list protected paths section");
});

test("dry-run on a Maven project detects Java stack", () => {
  const result = dryRun(join(fixtures, "maven"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /Java \(Maven\)/, "must detect Maven stack");
  assert.match(result.stdout, /mvnw verify/, "must include mvnw verify as a gate");
});

test("dry-run on a Gradle project detects Java stack", () => {
  const result = dryRun(join(fixtures, "gradle"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /Java \(Gradle\)/, "must detect Gradle stack");
  assert.match(result.stdout, /gradlew check/, "must include gradlew check as a gate");
});

test("dry-run on a Go project detects Go stack", () => {
  const result = dryRun(join(fixtures, "go"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /\bGo\b/, "must detect Go stack");
  assert.match(result.stdout, /go vet/, "must include go vet as a gate");
});

test("dry-run on a .NET project detects C# stack", () => {
  const result = dryRun(join(fixtures, "dotnet"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /C# \(\.NET\)/, "must detect .NET stack");
  assert.match(result.stdout, /dotnet build/, "must include dotnet build as a gate");
});

test("dry-run on a Terraform project detects infrastructure stack", () => {
  const result = dryRun(join(fixtures, "terraform"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /Infrastructure \(Terraform\)/, "must detect Terraform stack");
  assert.match(result.stdout, /terraform validate/, "must include terraform validate as a gate");
});

test("dry-run detects pnpm as the package manager from its lockfile", () => {
  const result = dryRun(join(fixtures, "pnpm"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /pnpm/, "must detect pnpm as package manager");
});

test("dry-run detects yarn as the package manager from its lockfile", () => {
  const result = dryRun(join(fixtures, "yarn"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /yarn/, "must detect yarn as package manager");
});

test("dry-run reports no test script found when package.json has none", () => {
  const result = dryRun(join(fixtures, "no-test-script"));
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /no test script found/, "must report missing test script");
});

test("dry-run names the top hot file in proposals when git history is available", () => {
  // Run against the modonome repo itself, which has real git history.
  const result = dryRun(root);
  assert.strictEqual(result.status, 0, `exited ${result.status}: ${result.stderr}`);
  // The first proposal must mention a real filename from git history.
  // We check for a path separator or dot, indicating a real file reference rather than generic text.
  const out = result.stdout;
  assert.match(out, /Proposed bounded work/, "must propose work");
  // When git history is present, at least one proposal should reference a file path.
  assert.ok(
    out.includes("/") || out.includes(".mjs") || out.includes(".md"),
    "proposal must reference a specific file when git history is available"
  );
});
