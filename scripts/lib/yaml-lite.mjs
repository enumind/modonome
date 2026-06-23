// A minimal reader for flat "key: value" YAML, enough for .modonome/config.yaml.
// It supports comments, booleans, integers, floats, quoted strings, empty arrays,
// and inline string arrays like [a, b]. Nested structures are out of scope here;
// knowledge packets are stored as JSON, which Node parses natively.

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "" ) return "";
  if (v === "true") return true;
  if (v === "false") return false;
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
    // strip an inline comment when the value is not a quoted string
    const hashAt = value.indexOf(" #");
    if (hashAt !== -1 && !/["']/.test(value)) value = value.slice(0, hashAt);
    out[key] = parseScalar(value);
  }
  return out;
}
