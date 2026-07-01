// Redaction layer for snapshot content. It reuses the shared secret-pattern set so
// keys, tokens, and private hosts never enter an artifact that will be handed to an
// LLM. The balanced default masks credentials and private network identifiers while
// keeping example emails and fenced code, which are common and useful in docstrings.
// The strict mode applies every pattern.
import { SECRET_PATTERNS } from "./secret-patterns.mjs";

// Patterns dropped from the balanced default. They over-match ordinary docstrings.
const BALANCED_EXCLUDE = new Set(["email address", "code fence"]);

// Mask every matching secret in `text`. Returns { text, redactions } where each
// redaction records the pattern name and how many matches it masked.
export function redactText(text, { strict = false } = {}) {
  if (typeof text !== "string" || text.length === 0) {
    return { text: typeof text === "string" ? text : "", redactions: [] };
  }
  let out = text;
  const redactions = [];
  for (const pattern of SECRET_PATTERNS) {
    if (!strict && BALANCED_EXCLUDE.has(pattern.name)) continue;
    const flags = pattern.re.flags.includes("g") ? pattern.re.flags : pattern.re.flags + "g";
    const re = new RegExp(pattern.re.source, flags);
    let count = 0;
    out = out.replace(re, () => { count++; return `[REDACTED:${pattern.name}]`; });
    if (count > 0) redactions.push({ pattern: pattern.name, count });
  }
  return { text: out, redactions };
}
