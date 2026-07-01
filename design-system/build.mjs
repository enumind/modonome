#!/usr/bin/env node
// Build the Modonome design system into dist/.
// Two outputs the design-sync converter consumes:
//   dist/index.es.js  an ESM bundle of every component (react kept external)
//   dist/styles.css   the compiled token + component stylesheet closure
//   dist/*.d.ts        declaration tree (emitted by tsc, run separately)
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });

// 0. Regenerate the barrel and aggregated CSS from the component directories.
execFileSync("node", [join(here, "gen-barrel.mjs")], { cwd: here, stdio: "inherit" });

// 1. JS bundle. React and react-dom stay external so the design-sync IIFE and the
//    host app both provide a single React instance.
await build({
  entryPoints: [join(here, "src/index.ts")],
  outfile: join(dist, "index.es.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime"],
  loader: { ".woff2": "file", ".ttf": "file" },
  logLevel: "info",
});

// 2. CSS bundle. A single entry @imports the tokens and every component sheet;
//    esbuild inlines the @imports and copies referenced font files.
await build({
  entryPoints: [join(here, "src/styles.css")],
  outfile: join(dist, "styles.css"),
  bundle: true,
  loader: { ".woff2": "file", ".ttf": "file" },
  logLevel: "info",
});

// 3. Declaration tree for the converter's prop extraction.
execFileSync("node", [join(here, "node_modules/typescript/bin/tsc"), "--emitDeclarationOnly"], {
  cwd: here,
  stdio: "inherit",
});

console.log("design-system build complete: dist/index.es.js, dist/styles.css, dist/*.d.ts");
