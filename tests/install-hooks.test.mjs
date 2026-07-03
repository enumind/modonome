import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installHooks, isModonomeRepo } from "../scripts/install-hooks.mjs";

function tempRepo({ withGit = true, pkgName = "some-host" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "install-hooks-"));
  if (pkgName !== undefined) {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: pkgName }));
  }
  if (withGit) mkdirSync(join(dir, ".git", "hooks"), { recursive: true });
  return dir;
}

test("isModonomeRepo is true only for modonome's own package.json, by name not path", () => {
  const own = tempRepo({ pkgName: "modonome" });
  const host = tempRepo({ pkgName: "some-host" });
  const noPkg = tempRepo({ pkgName: undefined });
  try {
    assert.equal(isModonomeRepo(own), true);
    assert.equal(isModonomeRepo(host), false);
    assert.equal(isModonomeRepo(noPkg), false, "missing package.json must not throw or match");
  } finally {
    for (const d of [own, host, noPkg]) rmSync(d, { recursive: true, force: true });
  }
});

test("installHooks with no .git directory returns no-git and writes nothing", () => {
  const dir = tempRepo({ withGit: false });
  try {
    const result = installHooks(dir, { self: false });
    assert.equal(result, "no-git");
    assert.ok(!existsSync(join(dir, ".git")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installHooks mode 'ratchet' writes a hook that runs the ratchet-only check", () => {
  const dir = tempRepo();
  try {
    const result = installHooks(dir, { self: false, mode: "ratchet" });
    assert.equal(result, "installed");
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert.match(hook, /modonome ratchet --staged/);
    assert.doesNotMatch(hook, /modonome snapshot/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installHooks mode 'snapshot' (default) writes the host snapshot hook", () => {
  const dir = tempRepo();
  try {
    const result = installHooks(dir, { self: false });
    assert.equal(result, "installed");
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert.match(hook, /modonome snapshot/);
    assert.doesNotMatch(hook, /modonome ratchet/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installHooks never overwrites an existing host hook, regardless of mode", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, ".git", "hooks", "pre-commit"), "#!/bin/sh\necho custom\n");
    const result = installHooks(dir, { self: false, mode: "ratchet" });
    assert.equal(result, "kept");
    assert.match(readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8"), /echo custom/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installHooks self=true always overwrites with the self hook, ignoring mode", () => {
  const dir = tempRepo({ pkgName: "modonome" });
  try {
    writeFileSync(join(dir, ".git", "hooks", "pre-commit"), "#!/bin/sh\necho old\n");
    const result = installHooks(dir, { self: true, mode: "ratchet" });
    assert.equal(result, "installed");
    const hook = readFileSync(join(dir, ".git", "hooks", "pre-commit"), "utf8");
    assert.match(hook, /build-release-evidence\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
