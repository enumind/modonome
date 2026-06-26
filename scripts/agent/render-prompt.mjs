#!/usr/bin/env node
// Render a versioned role prompt by substituting ${VAR} placeholders from the
// environment. The CI workflow (.github/workflows/modonome-auto.yml) and the
// on-demand harness (scripts/agent/run-cycle.mjs) both render the same files in
// prompts/roles/, so the maker and checker instructions live in one
// CODEOWNER-protected source instead of being duplicated inline in the workflow.
//
// Usage: node scripts/agent/render-prompt.mjs <maker|checker>
//   Reads prompts/roles/<role>.txt and writes the rendered text to stdout.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "..", "..", "prompts", "roles");

const PLACEHOLDER = /\$\{(\w+)\}/g;

// Substitute every ${VAR} from env. Throw if a referenced variable is unset, so a
// missing identity or branch fails loudly instead of rendering an empty value into
// a model prompt.
export function renderPrompt(role, env = process.env) {
  if (!/^[a-z]+$/.test(role)) throw new Error(`render-prompt: invalid role "${role}".`);
  const text = readFileSync(join(promptsDir, `${role}.txt`), "utf8");
  return text.replace(PLACEHOLDER, (_m, name) => {
    const value = env[name];
    if (value === undefined || value === "") {
      throw new Error(`render-prompt: ${role}.txt references \${${name}} but it is not set.`);
    }
    return value;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const role = process.argv[2];
  if (!role) {
    console.error("Usage: node scripts/agent/render-prompt.mjs <maker|checker>");
    process.exit(2);
  }
  try {
    process.stdout.write(renderPrompt(role));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
