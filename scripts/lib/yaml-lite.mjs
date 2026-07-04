// A minimal reader for "key: value" YAML, enough for .modonome/config.yaml.
// It supports comments, booleans, integers, floats, quoted strings, empty arrays,
// empty inline mappings ({}), and inline string arrays like [a, b]. It also supports
// indentation-based nested mappings using 2-space-per-level indentation (additive;
// flat keys still work).
//
// Nested mapping rules:
//   - A line whose value is empty (after stripping comments) starts a mapping block.
//   - Subsequent lines indented deeper than the parent become key: value pairs under
//     that parent, recursively.
//   - Inline arrays like [self-hosted, mac-mini] still work as leaf values.
//   - Every existing flat top-level key parses to the exact same value as before.
//
// Out of scope: multi-document, anchors, aliases, block scalars, sequences.

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "" ) return "";
  // accept all standard YAML boolean synonyms case-insensitively so that
  // values like yes/True/on/1 do not slip past boolean-gated checks.
  if (/^(true|yes|on)$/i.test(v)) return true;
  if (/^(false|no|off)$/i.test(v)) return false;
  if (v === "[]") return [];
  if (v === "{}") return {};
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((s) => stripQuotes(s.trim()));
  }
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
  return stripQuotes(v);
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Parse a raw value string from after the colon, handling inline comments and
// quoted strings. Returns the trimmed scalar text or empty string.
function extractRawValue(afterColon) {
  let value = afterColon;
  const trimmedVal = value.trimStart();
  if (trimmedVal.startsWith('"') || trimmedVal.startsWith("'")) {
    // Quoted value: find the matching closing quote and drop anything after it.
    const q = trimmedVal[0];
    const closeIdx = trimmedVal.indexOf(q, 1);
    if (closeIdx !== -1) value = " " + trimmedVal.slice(0, closeIdx + 1);
  } else {
    // Unquoted value: strip an inline comment (space-hash).
    const hashAt = value.indexOf(" #");
    if (hashAt !== -1) value = value.slice(0, hashAt);
  }
  return value.trim();
}

// Count leading spaces to determine nesting depth.
function indentOf(line) {
  let n = 0;
  while (n < line.length && line[n] === " ") n++;
  return n;
}

// Parse an array of non-empty, non-comment lines into a nested object.
// Each entry is { indent, key, rawValue }.
function parseEntries(entries, start, minIndent) {
  const out = {};
  let i = start;
  while (i < entries.length) {
    const entry = entries[i];
    // Stop if we have stepped back out to a shallower level.
    if (entry.indent < minIndent) break;
    // Skip entries that belong to a deeper level (already consumed by recursion).
    if (entry.indent > minIndent) { i++; continue; }

    const rawVal = entry.rawValue;
    if (rawVal === "") {
      // No inline value: this key introduces a nested block. Collect children.
      const childIndent = i + 1 < entries.length ? entries[i + 1].indent : -1;
      if (childIndent > minIndent) {
        out[entry.key] = parseEntries(entries, i + 1, childIndent);
        // Skip all consumed children.
        i++;
        while (i < entries.length && entries[i].indent > minIndent) i++;
      } else {
        // Empty key with no deeper children: value is empty string.
        out[entry.key] = "";
        i++;
      }
    } else {
      out[entry.key] = parseScalar(rawVal);
      i++;
    }
  }
  return out;
}

export function parseFlatYaml(text) {
  const entries = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const indent = indentOf(line);
    const key = line.slice(indent, colonIdx).trim();
    if (!key) continue;

    const rawValue = extractRawValue(line.slice(colonIdx + 1));
    entries.push({ indent, key, rawValue });
  }

  // Determine the minimum (top-level) indent. Almost always 0.
  const topIndent = entries.length > 0 ? Math.min(...entries.map((e) => e.indent)) : 0;
  return parseEntries(entries, 0, topIndent);
}

function formatScalarForYaml(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

// Patch one or more top-level (zero-indent) scalar keys in a config.yaml's raw
// text, line by line. Every other line, including every comment, is left
// untouched, so a hand-written config file survives an arm/disarm cycle byte
// for byte outside the patched line(s). Only a zero-indent `key:` line matches;
// a same-named nested key (e.g. under `roles:`) is never touched. Throws if a
// requested key has no top-level line, so a typo never silently no-ops.
export function patchTopLevelYaml(text, patch) {
  const remaining = new Set(Object.keys(patch));
  const lines = text.split("\n").map((line) => {
    const m = /^([A-Za-z0-9_]+):/.exec(line);
    if (m && remaining.has(m[1])) {
      remaining.delete(m[1]);
      return `${m[1]}: ${formatScalarForYaml(patch[m[1]])}`;
    }
    return line;
  });
  if (remaining.size > 0) {
    throw new Error(`Config key(s) not found at top level: ${[...remaining].join(", ")}`);
  }
  return lines.join("\n");
}
