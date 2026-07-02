// Shared detection logic for the control-panel governance gates. One source of truth
// used by three callers: check-control-panel-coverage.mjs (CI gate), check-control-
// panel-coherence.mjs (CI gate), and dry-run-sweep.mjs (folds findings into the normal
// proposal list when the swept repo has a control panel). Pure read functions only.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CONTROL_PANEL_DIR = "apps/control-panel";
const SCREENS_DIR = join(CONTROL_PANEL_DIR, "src/screens");
const EXPOSURE_FILE = join(CONTROL_PANEL_DIR, "exposure.json");
const SCHEMA_FILE = "schemas/config.schema.json";

const CONTROL_TAGS = ["Toggle", "NumberField", "Slider", "Select", "Input"];
const HINT_REQUIRED_TAGS = ["Toggle", "NumberField", "Slider", "Select"];

// Today's real high-water mark is 7 (Arming & Safety, Caps & budget tab). The budget
// is set a few above that: a real ratchet against regression, not an arbitrary ceiling.
export const MAX_CONTROLS_PER_TAB = 10;

function readScreens(root) {
  const dir = join(root, SCREENS_DIR);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
  return files.map((f) => ({ file: `apps/control-panel/src/screens/${f}`, text: readFileSync(join(dir, f), "utf8") }));
}

// Every field in config.schema.json must resolve to either a literal reference in a
// screen (a real control, or read-only display) or a documented exemption in
// exposure.json. A plain substring search, not an AST walk: cheap, transparent, and
// consistent with how the rest of this repo's check scripts read source (see
// check-style.mjs). False negatives (a field name that only appears in a comment) are
// theoretically possible but self-correcting, since exposure.json is the honest escape
// hatch for anything this heuristic gets wrong.
export function auditCoverage(root) {
  const schemaPath = join(root, SCHEMA_FILE);
  const screens = readScreens(root);
  if (!existsSync(schemaPath) || screens === null) {
    return { skipped: true, missing: [], fieldCount: 0, exposureCount: 0 };
  }

  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const fields = Object.keys(schema.properties || {});
  const exposurePath = join(root, EXPOSURE_FILE);
  const exposure = existsSync(exposurePath) ? JSON.parse(readFileSync(exposurePath, "utf8")) : {};
  const screenText = screens.map((s) => s.text).join("\n");

  const missing = fields.filter((field) => !screenText.includes(field) && !exposure[field]);
  return { skipped: false, missing, fieldCount: fields.length, exposureCount: Object.keys(exposure).length };
}

// Splits a screen's source into one segment per tab (by source order, using the
// `{tab === "id" ?` marker this codebase's tabbed screens consistently use), or a
// single whole-file segment for screens with no tabs. A source-order split, not a
// brace-matched parse: correct for this repo's actual tab-block shape, and far
// simpler than a real parser for a benefit that only needs to catch drift, not
// reformat the file.
function splitByTabs(text) {
  const markers = [...text.matchAll(/\{tab === "(\w+)" \?/g)];
  if (markers.length === 0) return [{ tab: null, text }];
  return markers.map((m, i) => ({
    tab: m[1],
    text: text.slice(m.index, i + 1 < markers.length ? markers[i + 1].index : text.length),
  }));
}

function extractTags(text, tagNames) {
  const re = new RegExp(`<(${tagNames.join("|")})\\b([\\s\\S]*?)(/>|>)`, "g");
  return [...text.matchAll(re)];
}

// Two checks, both numeric: a screen/tab must not exceed the control-density budget,
// and every value-entry control (Toggle, NumberField, Slider, Select) must carry a
// hint. Input is excluded from the hint requirement: the "add a trusted author / add a
// protected path" fields are self-evident from their label and placeholder, and
// tooltipping a one-line add-field is noise, not help.
export function auditCoherence(root) {
  const screens = readScreens(root);
  if (screens === null) return { skipped: true, violations: [] };

  const violations = [];
  for (const { file, text } of screens) {
    const tabBars = (text.match(/<Tabs\b/g) || []).length;
    if (tabBars > 1) {
      violations.push({ file, kind: "nested-tabs", detail: `${tabBars} <Tabs> bars in one screen; a screen should have exactly one tab bar, not nested tab levels.` });
    }

    for (const seg of splitByTabs(text)) {
      const label = seg.tab ? `${file}#${seg.tab}` : file;
      const controls = extractTags(seg.text, CONTROL_TAGS);
      if (controls.length > MAX_CONTROLS_PER_TAB) {
        violations.push({ file, kind: "control-density", detail: `${label} has ${controls.length} controls (budget ${MAX_CONTROLS_PER_TAB}). Split it into another tab by user intent.` });
      }
      for (const m of extractTags(seg.text, HINT_REQUIRED_TAGS)) {
        if (m[0].includes("hint=")) continue;
        const name = /label="([^"]+)"/.exec(m[0]);
        violations.push({ file, kind: "missing-hint", detail: `${label}: <${m[1]}> "${name ? name[1] : "unlabeled"}" has no hint.` });
      }
    }
  }
  return { skipped: false, violations };
}
