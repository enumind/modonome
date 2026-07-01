import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFile } from "../scripts/lib/lang-adapters/index.mjs";
import { registerTreeSitter } from "../scripts/lib/lang-adapters/tree-sitter.mjs";

// Golden extraction: fixed inputs with the exact symbols and imports each heuristic
// adapter must produce. These lock the dependency-free default path against drift.

function names(result) {
  return result.symbols.map((s) => `${s.kind}:${s.name}:${s.exported}`).sort();
}
function modules(result) {
  return result.imports.map((i) => i.module).sort();
}

test("js-ts golden", () => {
  const src = [
    "import { readFile } from 'node:fs';",
    "export function run(a) { return a; }",
    "export const make = () => 1;",
    "export class Box { method() {} }",
    "function helper() {}",
  ].join("\n");
  const r = extractFile("m.ts", src);
  assert.deepEqual(names(r), ["class:Box:true", "function:helper:false", "function:make:true", "function:run:true"].sort());
  assert.deepEqual(modules(r), ["node:fs"]);
});

test("python golden", () => {
  const src = [
    "import os",
    "from a.b import c",
    "def public_fn(x):",
    '    """Docs."""',
    "    return x",
    "def _private():",
    "    pass",
    "class Widget:",
    "    def method(self): pass",
  ].join("\n");
  const r = extractFile("m.py", src);
  assert.deepEqual(names(r), ["class:Widget:true", "function:_private:false", "function:public_fn:true"].sort());
  assert.deepEqual(modules(r), ["a.b", "os"]);
  assert.equal(r.symbols.find((s) => s.name === "public_fn").doc, "Docs.");
});

test("go golden", () => {
  const src = [
    "package main",
    'import "fmt"',
    "import (",
    '\t"os"',
    ")",
    "func Exported() {}",
    "func private() {}",
    "type Server struct {}",
  ].join("\n");
  const r = extractFile("m.go", src);
  assert.deepEqual(names(r), ["function:Exported:true", "function:private:false", "type:Server:true"].sort());
  assert.deepEqual(modules(r), ["fmt", "os"]);
});

test("java golden", () => {
  const src = [
    "package x;",
    "import java.util.List;",
    "public class Widget {",
    "  public int add(int a, int b) { return a + b; }",
    "  private void hidden() {}",
    "}",
  ].join("\n");
  const r = extractFile("M.java", src);
  const got = names(r);
  assert.ok(got.includes("class:Widget:true"), "public class captured");
  assert.ok(got.includes("method:add:true"), "public method captured");
  assert.deepEqual(modules(r), ["java.util.List"]);
});

test("generic markdown golden and no-throw on garbage", () => {
  const r = extractFile("readme.md", "# Title\n## Section\n");
  assert.deepEqual(r.symbols.map((s) => s.name), ["Title", "Section"]);
  assert.doesNotThrow(() => extractFile("weird.xyz", "}{ unbalanced ["));
});

test("tree-sitter registration is optional and falls back cleanly", async () => {
  const registered = [];
  const ok = await registerTreeSitter((a) => registered.push(a));
  assert.equal(typeof ok, "boolean");
  // Either way the heuristic Python adapter must keep working. In a zero-dependency
  // environment registerTreeSitter returns false and registers nothing; when the
  // parser is installed it returns true and registers at least one grammar.
  if (ok) {
    assert.ok(registered.length > 0, "a grammar was registered when tree-sitter is present");
  } else {
    assert.equal(registered.length, 0, "nothing registered when tree-sitter is absent");
  }
  const r = extractFile("m.py", "def hello():\n    pass\n");
  assert.ok(r.symbols.some((s) => s.name === "hello"), "heuristic adapter still extracts");
});
