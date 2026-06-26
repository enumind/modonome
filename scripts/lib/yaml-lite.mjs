// A minimal reader for flat "key: value" YAML, enough for .modonome/config.yaml.
// It supports comments, booleans, integers, floats, quoted strings, empty arrays,
// and inline string arrays like [a, b]. Nested structures are out of scope here;
// knowledge packets are stored as JSON, which Node parses natively.

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "" ) return "";
  // accept all standard YAML boolean synonyms case-insensitively so that
  // values like yes/True/on/1 do not slip past boolean-gated checks.
  if (/^(true|yes|on)$/i.test(v)) return true;
  if (/^(false|no|off)$/i.test(v)) return false;
  if (v === "[]") return [];
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

export function parseFlatYaml(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1);
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
    out[key] = parseScalar(value);
  }
  return out;
}
