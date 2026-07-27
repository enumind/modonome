import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  parseDiff,
  scanFile,
  scanDiff,
  decideExitCode,
  decideResult,
  severityToSarifLevel,
  stripFlags,
  formatHuman,
  emitJson,
  emitSarif,
} from "../scripts/risk-surface-guard.mjs";
import {
  matchesProtectedPath,
  isContentExempt,
  stripSameLineNoise,
  stripPythonSameLineNoise,
  stripHashComment,
  redactMatchedText,
  RULES,
  RULES_BY_ID,
} from "../scripts/lib/risk-surface-rules.mjs";
import { parseAllowlist, loadAllowlist, isSuppressed, applyAllowlist } from "../scripts/lib/risk-surface-allowlist.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const guard = join(root, "scripts", "risk-surface-guard.mjs");
const fxRoot = join(root, "fixtures", "risk-surface");
const flagDir = join(fxRoot, "should-flag");
const allowDir = join(fxRoot, "should-allow");
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

function run(diffPath, extraArgs = []) {
  return spawnSync("node", [guard, "--diff", diffPath, ...extraArgs], { encoding: "utf8" });
}

function fixture(dir, name) {
  return join(dir, name);
}

// ---------------------------------------------------------------------------
// Pure-function unit tests
// ---------------------------------------------------------------------------

test("parseDiff tracks real new-file line numbers across a multi-hunk fixture", () => {
  // Hunk 1 declares 3 new-file lines starting at 1: line one(1), added at 2(2),
  // line two(3). Hunk 2 declares 3 new-file lines starting at 20: context at
  // 20(20), added at 21(21), context at 22(22).
  const diffText = [
    "diff --git a/a.js b/a.js",
    "--- a/a.js",
    "+++ b/a.js",
    "@@ -1,2 +1,3 @@",
    " line one",
    "+added at 2",
    " line two",
    "@@ -19,2 +20,3 @@",
    " context at 20",
    "+added at 21",
    " context at 22",
    "",
  ].join("\n");
  const files = parseDiff(diffText);
  assert.deepEqual(
    files["a.js"].added.map((l) => l.line),
    [2, 21],
  );
});

test("parseDiff attributes removed-only diffs (deletions) to the preimage path", () => {
  const diffText = [
    "diff --git a/old.py b/old.py",
    "--- a/old.py",
    "+++ /dev/null",
    "@@ -1,2 +0,0 @@",
    "-import os",
    "-os.system(cmd)",
    "",
  ].join("\n");
  const files = parseDiff(diffText);
  assert.ok(files["old.py"]);
  assert.equal(files["old.py"].added.length, 0);
  assert.equal(files["old.py"].removed.length, 2);
});

test("parseDiff handles CRLF-normalized-away input the same as LF", () => {
  const diffText = "diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1,1 +1,2 @@\n line\n+eval(x)\n";
  const files = parseDiff(diffText);
  assert.equal(files["a.js"].added[0].text, "eval(x)");
  assert.equal(files["a.js"].added[0].line, 2);
});

test("stripSameLineNoise removes a same-line // comment", () => {
  assert.equal(stripSameLineNoise('  // eval("x") is banned').trim(), "");
});

test("stripSameLineNoise removes same-line quoted string content", () => {
  assert.equal(stripSameLineNoise('assert.match(out, "eval(")'), "assert.match(out, )");
});

test("stripSameLineNoise bails to the raw line on an unterminated quote", () => {
  const raw = 'const s = "eval(unterminated';
  assert.equal(stripSameLineNoise(raw), raw);
});

test("stripSameLineNoise strips a same-line block comment", () => {
  assert.equal(stripSameLineNoise("eval(x) /* eval is fine here, trust me */").trim(), "eval(x)");
});

test("stripPythonSameLineNoise removes a same-line # comment", () => {
  assert.equal(stripPythonSameLineNoise("  # subprocess.run(cmd, shell=True) is deprecated").trim(), "");
});

test("stripPythonSameLineNoise removes same-line quoted string content", () => {
  assert.equal(stripPythonSameLineNoise('assert "eval(" in out'), "assert  in out");
});

test("stripPythonSameLineNoise bails to the raw line on an unterminated quote", () => {
  const raw = "s = 'eval(unterminated";
  assert.equal(stripPythonSameLineNoise(raw), raw);
});

test("stripHashComment strips from an unquoted # to end of line", () => {
  assert.equal(stripHashComment("permissions: write-all # legacy").trim(), "permissions: write-all");
});

test("stripHashComment is not quote-aware (documented simplification)", () => {
  assert.equal(stripHashComment('value: "a#b"'), 'value: "a');
});

test("matchesProtectedPath covers every declared glob and the CODEOWNERS basename case", () => {
  const positives = [
    ".github/workflows/ci.yml",
    "action.yml",
    "scripts/guard-ratchet.mjs",
    "scripts/risk-surface-guard.mjs",
    "scripts/lib/risk-surface-rules.mjs",
    "scripts/lib/message-catalog/gate/risk-surface-guard.mjs",
    "SECURITY.md",
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "k8s/deployment.yaml",
    "kubernetes/pod.yaml",
    "helm/values.yaml",
    "charts/app/Chart.yaml",
    "terraform/main.tf",
    "infra/network.tf",
    ".modonome/work-items/WI-055-risk-surface-guard.json",
    ".github/CODEOWNERS",
  ];
  for (const p of positives) assert.ok(matchesProtectedPath(p), `expected protected: ${p}`);

  const negatives = ["README.md", "src/index.js", "deploy/docker-compose.yml", "tests/risk-surface-guard.test.mjs"];
  for (const p of negatives) assert.equal(matchesProtectedPath(p), false, `expected NOT protected: ${p}`);
});

// Regression: this scanner's own rule catalog, CLI, message-catalog partial, and
// test file necessarily contain the detection vocabulary itself as literal source
// (regex patterns, reason text, test fixture data). scanFile must not flag them for
// their own vocabulary. Three of the four are also protected paths (scripts/lib/**
// and the exact scripts/risk-surface-guard.mjs entry), so matchesProtectedPath still
// catches a touch to them via RS801 (path-based, does not consult isContentExempt).
// The test file itself is not a protected path, matching every other test file in
// this repo, so it gets neither signal, the same as a fixture would.
test("the scanner's own implementation files are exempt from content rules but still protected by RS801", () => {
  const selfAndProtected = [
    "scripts/risk-surface-guard.mjs",
    "scripts/lib/risk-surface-rules.mjs",
    "scripts/lib/message-catalog/gate/risk-surface-guard.mjs",
  ];
  for (const p of selfAndProtected) {
    assert.ok(isContentExempt(p), `expected content-exempt: ${p}`);
    assert.ok(matchesProtectedPath(p), `expected still protected-path: ${p}`);
  }

  assert.ok(isContentExempt("tests/risk-surface-guard.test.mjs"));
  assert.equal(matchesProtectedPath("tests/risk-surface-guard.test.mjs"), false);

  for (const p of [...selfAndProtected, "tests/risk-surface-guard.test.mjs"]) {
    const findings = scanFile(p, [{ text: "docker run --privileged; export KUBECONFIG=x; # 169.254.169.254", line: 1 }]);
    assert.equal(findings.length, 0, `expected no content findings for ${p}: ${findings.map((f) => f.id).join(",")}`);
  }
});

test("redactMatchedText truncates long matched text", () => {
  const long = "x".repeat(300);
  const out = redactMatchedText(long);
  assert.ok(out.length < 300);
  assert.ok(out.endsWith("[truncated]"));
});

test("redactMatchedText replaces text that looks like a real secret", () => {
  const out = redactMatchedText('const token = "abc"; secret: sk_live_abcdefghijklmnop');
  assert.equal(out, "[redacted: possible secret material on this line]");
});

test("every rule has a real reason, reviewer_guidance, and limitation (no placeholders)", () => {
  for (const r of RULES) {
    for (const field of ["reason", "reviewer_guidance", "limitation"]) {
      assert.ok(typeof r[field] === "string" && r[field].length > 20, `${r.id} missing real ${field}`);
    }
  }
});

test("rule ids are unique and stable-shaped", () => {
  const ids = RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^RS\d{3}$/);
  assert.equal(RULES_BY_ID.size, RULES.length);
});

test("scanFile applies a representative rule from each ID family", () => {
  const cases = [
    ["src/a.js", [{ text: "eval(x)", line: 1 }], "RS101"],
    ["model/x.py", [{ text: "AutoModel.from_pretrained(n, trust_remote_code=True)", line: 1 }], "RS201"],
    ["scripts/i.sh", [{ text: "curl https://x/i.sh | bash", line: 1 }], "RS301"],
    [".github/workflows/w.yml", [{ text: "pull_request_target:", line: 1 }], "RS401"],
    ["docker-compose.yml", [{ text: "privileged: true", line: 1 }], "RS502"],
    ["src/b.js", [{ text: 'fetch("http://169.254.169.254/x")', line: 1 }], "RS607"],
    ["src/c.js", [{ text: "rejectUnauthorized: false", line: 1 }], "RS701"],
  ];
  for (const [path, lines, expectedId] of cases) {
    const findings = scanFile(path, lines);
    assert.ok(
      findings.some((f) => f.id === expectedId),
      `expected ${expectedId} for ${path}: got ${findings.map((f) => f.id).join(",")}`,
    );
  }
});

test("RS106 exempts a small set of benign env var names but still flags others", () => {
  const benign = scanFile("src/auth-middleware.js", [{ text: 'if (process.env.NODE_ENV === "production") {', line: 1 }]);
  assert.ok(!benign.some((f) => f.id === "RS106"), "expected NODE_ENV to be exempt");

  const notBenign = scanFile("src/auth-middleware.js", [{ text: "const key = process.env.AUTH_SECRET_KEY;", line: 1 }]);
  assert.ok(
    notBenign.some((f) => f.id === "RS106"),
    "expected a non-exempt var name to still flag",
  );
});

test("RS703 catches a black-wrapped multi-line requests call within the widened window", () => {
  const lines = [
    { text: "response = requests.get(", line: 1 },
    { text: "    url,", line: 2 },
    { text: "    timeout=30,", line: 3 },
    { text: "    headers=headers,", line: 4 },
    { text: "    verify=False,", line: 5 },
    { text: ")", line: 6 },
  ];
  const findings = scanFile("scripts/client.py", lines);
  assert.ok(
    findings.some((f) => f.id === "RS703"),
    "expected RS703 to catch a call 4 lines away",
  );
});

test("RS707 requires a structural egress block or key, not bare prose mentioning the word", () => {
  const structural = scanFile("k8s/policy.yaml", [
    { text: "egress:", line: 1 },
    { text: "  - to: [{ ipBlock: { cidr: 0.0.0.0/0 } }]", line: 2 },
  ]);
  assert.ok(
    structural.some((f) => f.id === "RS707"),
    "expected a real egress: key to still flag",
  );

  const proseOnly = scanFile("k8s/policy.yaml", [
    { text: "# ingress rule below; keep separate from our egress policy elsewhere", line: 1 },
    { text: "ingress:", line: 2 },
    { text: "  - from: [{ ipBlock: { cidr: 0.0.0.0/0 } }]", line: 3 },
  ]);
  assert.ok(!proseOnly.some((f) => f.id === "RS707"), "expected prose-only mention of egress not to flag an unrelated ingress rule");
});

test("decideExitCode: pure implementation of the exit-code contract", () => {
  const high = [{ severity: "high" }];
  const medium = [{ severity: "medium" }];
  assert.equal(decideExitCode("warn", []), 0);
  assert.equal(decideExitCode("warn", high), 0);
  assert.equal(decideExitCode("fail", medium), 0);
  assert.equal(decideExitCode("fail", high), 1);
});

test("decideResult never contradicts decideExitCode", () => {
  const high = [{ severity: "high" }];
  const medium = [{ severity: "medium" }];
  assert.equal(decideResult("warn", []), "pass");
  assert.equal(decideResult("warn", high), "warn");
  assert.equal(decideResult("fail", medium), "warn");
  assert.equal(decideResult("fail", high), "fail");
});

test("severityToSarifLevel maps all four severities", () => {
  assert.equal(severityToSarifLevel("critical"), "error");
  assert.equal(severityToSarifLevel("high"), "error");
  assert.equal(severityToSarifLevel("medium"), "warning");
  assert.equal(severityToSarifLevel("low"), "note");
});

test("stripFlags composes --mode with --sarif/--json/positional args in any order", () => {
  assert.deepEqual(stripFlags(["origin/main", "--mode", "fail", "--sarif"]), {
    mode: "fail",
    format: "sarif",
    positional: ["origin/main"],
    allowlist: null,
  });
  assert.deepEqual(stripFlags(["--sarif", "--mode", "fail", "origin/main"]), {
    mode: "fail",
    format: "sarif",
    positional: ["origin/main"],
    allowlist: null,
  });
  assert.deepEqual(stripFlags(["--mode", "warn", "--diff", "x.diff", "--json"]), {
    mode: "warn",
    format: "json",
    positional: ["--diff", "x.diff"],
    allowlist: null,
  });
  assert.deepEqual(stripFlags(["origin/main"]), {
    mode: null,
    format: "human",
    positional: ["origin/main"],
    allowlist: null,
  });
});

test("stripFlags extracts --allowlist and composes with other flags in any order", () => {
  assert.deepEqual(stripFlags(["origin/main", "--allowlist", "my-list.json", "--mode", "fail"]), {
    mode: "fail",
    format: "human",
    positional: ["origin/main"],
    allowlist: "my-list.json",
  });
  assert.deepEqual(stripFlags(["--allowlist", "my-list.json", "--diff", "x.diff", "--json"]), {
    mode: null,
    format: "json",
    positional: ["--diff", "x.diff"],
    allowlist: "my-list.json",
  });
});

// ---------------------------------------------------------------------------
// Suppression allowlist: pure functions (ADR-047 decision 9)
// ---------------------------------------------------------------------------

test("parseAllowlist accepts a well-formed document", () => {
  const doc = JSON.stringify({
    schema_version: 1,
    entries: [
      { id: "a1", rule: "RS101", file: "src/x.js", reason: "r", added_by: "u", added_at: "2026-01-01", expires_at: "2099-01-01" },
    ],
  });
  const { entries, errors } = parseAllowlist(doc);
  assert.deepEqual(errors, []);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "a1");
});

test("parseAllowlist fails closed on invalid JSON", () => {
  const { entries, errors } = parseAllowlist("{ not json");
  assert.deepEqual(entries, []);
  assert.ok(errors.length > 0);
  assert.match(errors[0], /invalid JSON/);
});

test("parseAllowlist fails closed on a document missing expires_at", () => {
  const doc = JSON.stringify({
    schema_version: 1,
    entries: [{ id: "a1", rule: "RS101", file: "src/x.js", reason: "r", added_by: "u", added_at: "2026-01-01" }],
  });
  const { entries, errors } = parseAllowlist(doc);
  assert.deepEqual(entries, []);
  assert.ok(errors.some((e) => e.includes("expires_at")), errors.join(","));
});

test("parseAllowlist fails closed on an unknown top-level property (additionalProperties: false)", () => {
  const doc = JSON.stringify({ schema_version: 1, entries: [], extra: true });
  const { entries, errors } = parseAllowlist(doc);
  assert.deepEqual(entries, []);
  assert.ok(errors.length > 0);
});

test("parseAllowlist fails closed on a duplicate entry id", () => {
  const doc = JSON.stringify({
    schema_version: 1,
    entries: [
      { id: "dup", rule: "RS101", file: "a.js", reason: "r", added_by: "u", added_at: "2026-01-01", expires_at: "2099-01-01" },
      { id: "dup", rule: "RS102", file: "b.js", reason: "r", added_by: "u", added_at: "2026-01-01", expires_at: "2099-01-01" },
    ],
  });
  const { entries, errors } = parseAllowlist(doc);
  assert.deepEqual(entries, []);
  assert.ok(errors.some((e) => e.includes('duplicate entry id "dup"')), errors.join(","));
});

test("parseAllowlist fails closed on an unrecognized rule id", () => {
  const doc = JSON.stringify({
    schema_version: 1,
    entries: [{ id: "a1", rule: "RS999", file: "a.js", reason: "r", added_by: "u", added_at: "2026-01-01", expires_at: "2099-01-01" }],
  });
  const { entries, errors } = parseAllowlist(doc);
  assert.deepEqual(entries, []);
  assert.ok(errors.some((e) => e.includes('unknown rule id "RS999"')), errors.join(","));
});

test("parseAllowlist fails closed when expires_at is before added_at", () => {
  const doc = JSON.stringify({
    schema_version: 1,
    entries: [
      { id: "a1", rule: "RS101", file: "a.js", reason: "r", added_by: "u", added_at: "2026-06-01", expires_at: "2026-01-01" },
    ],
  });
  const { entries, errors } = parseAllowlist(doc);
  assert.deepEqual(entries, []);
  assert.ok(errors.some((e) => e.includes("expires_at is before added_at")), errors.join(","));
});

test("loadAllowlist on a missing path returns zero entries and zero errors (default, not an error)", () => {
  const { entries, errors } = loadAllowlist(join(fxRoot, "allowlist", "does-not-exist.json"));
  assert.deepEqual(entries, []);
  assert.deepEqual(errors, []);
});

test("loadAllowlist reads and parses a real fixture file", () => {
  const { entries, errors } = loadAllowlist(join(fxRoot, "allowlist", "single-valid-entry.json"));
  assert.deepEqual(errors, []);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "fixture-single-valid");
});

const SAMPLE_ALLOWLIST_ENTRY = {
  id: "e1",
  rule: "RS101",
  file: "src/handler.js",
  reason: "sample",
  added_by: "u",
  added_at: "2026-01-01",
  expires_at: "2026-06-01",
};

test("isSuppressed matches on rule and exact file, within expiry", () => {
  const finding = { id: "RS101", file: "src/handler.js" };
  assert.equal(isSuppressed(finding, [SAMPLE_ALLOWLIST_ENTRY], "2026-03-01"), SAMPLE_ALLOWLIST_ENTRY);
});

test("isSuppressed returns null on a rule mismatch", () => {
  const finding = { id: "RS102", file: "src/handler.js" };
  assert.equal(isSuppressed(finding, [SAMPLE_ALLOWLIST_ENTRY], "2026-03-01"), null);
});

test("isSuppressed returns null on a file mismatch", () => {
  const finding = { id: "RS101", file: "src/other.js" };
  assert.equal(isSuppressed(finding, [SAMPLE_ALLOWLIST_ENTRY], "2026-03-01"), null);
});

test("isSuppressed matches a ** glob file pattern", () => {
  const globEntry = { ...SAMPLE_ALLOWLIST_ENTRY, file: "src/**/*.js" };
  const finding = { id: "RS101", file: "src/nested/deep/handler.js" };
  assert.equal(isSuppressed(finding, [globEntry], "2026-03-01"), globEntry);
});

test("isSuppressed treats expires_at as inclusive: still suppresses on the expiry date itself", () => {
  const finding = { id: "RS101", file: "src/handler.js" };
  assert.equal(isSuppressed(finding, [SAMPLE_ALLOWLIST_ENTRY], "2026-06-01"), SAMPLE_ALLOWLIST_ENTRY);
});

test("isSuppressed does not suppress the day after expiry", () => {
  const finding = { id: "RS101", file: "src/handler.js" };
  assert.equal(isSuppressed(finding, [SAMPLE_ALLOWLIST_ENTRY], "2026-06-02"), null);
});

test("isSuppressed defends against a malformed expires_at bypassing parseAllowlist: never throws, never suppresses", () => {
  const finding = { id: "RS101", file: "src/handler.js" };
  const nonsenseDate = { ...SAMPLE_ALLOWLIST_ENTRY, expires_at: "not-a-date" };
  assert.doesNotThrow(() => isSuppressed(finding, [nonsenseDate], "2026-03-01"));
  assert.equal(isSuppressed(finding, [nonsenseDate], "2026-03-01"), null);
  const missingDate = { ...SAMPLE_ALLOWLIST_ENTRY, expires_at: undefined };
  assert.doesNotThrow(() => isSuppressed(finding, [missingDate], "2026-03-01"));
  assert.equal(isSuppressed(finding, [missingDate], "2026-03-01"), null);
});

test("applyAllowlist sets suppressed on a matching finding and leaves every other field untouched", () => {
  const findings = [
    { id: "RS101", file: "src/handler.js", severity: "high", extra: "keep-me" },
    { id: "RS102", file: "src/handler.js", severity: "medium" },
  ];
  const out = applyAllowlist(findings, [SAMPLE_ALLOWLIST_ENTRY], "2026-03-01");
  assert.deepEqual(out[0].suppressed, { entry_id: "e1", reason: "sample" });
  assert.equal(out[0].extra, "keep-me");
  assert.equal(out[0].severity, "high");
  assert.equal(out[1].suppressed, null);
});

test("formatHuman, emitJson, and emitSarif are pure string builders over the same findings", () => {
  const { findings } = scanDiff(readFileSync(fixture(flagDir, "js-eval.diff"), "utf8"));
  assert.ok(formatHuman(findings, { mode: "warn" }).includes("RS101"));
  assert.ok(JSON.parse(emitJson(findings, { mode: "warn" })).findings.some((f) => f.id === "RS101"));
  assert.ok(JSON.parse(emitSarif(findings)).runs[0].results.some((r) => r.ruleId === "RS101"));
});

// ---------------------------------------------------------------------------
// CLI integration
// ---------------------------------------------------------------------------

test("scenario 1: JS eval is flagged", () => {
  const r = run(fixture(flagDir, "js-eval.diff"));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /RS101/);
});

test("scenario 2: Python subprocess shell=True is flagged", () => {
  const r = run(fixture(flagDir, "python-subprocess-shell-true.diff"));
  assert.match(r.stdout, /RS113/);
});

test("scenario 3: GitHub Actions pull_request_target is flagged", () => {
  const r = run(fixture(flagDir, "gh-actions-pull-request-target.diff"));
  assert.match(r.stdout, /RS401/);
});

test("scenario 4: workflow permissions write-all is flagged", () => {
  const r = run(fixture(flagDir, "gh-actions-permissions-write-all.diff"));
  assert.match(r.stdout, /RS411/);
});

test("scenario 5: trust_remote_code=True is flagged", () => {
  const r = run(fixture(flagDir, "trust-remote-code.diff"));
  assert.match(r.stdout, /RS201/);
});

test("scenario 6: Docker privileged mode is flagged", () => {
  const r = run(fixture(flagDir, "docker-compose-privileged-true.diff"));
  assert.match(r.stdout, /RS502/);
});

test("scenario 7: Kubernetes hostPath is flagged", () => {
  const r = run(fixture(flagDir, "k8s-hostpath.diff"));
  assert.match(r.stdout, /RS511/);
});

test("scenario 8: curl | bash is flagged", () => {
  const r = run(fixture(flagDir, "curl-pipe-bash.diff"));
  assert.match(r.stdout, /RS301/);
});

test("scenario 9: TLS verification disabled is flagged", () => {
  const r = run(fixture(flagDir, "tls-reject-unauthorized-false.diff"));
  assert.match(r.stdout, /RS701/);
});

test("scenario 10: newly added secrets access is flagged", () => {
  const r = run(fixture(flagDir, "gh-actions-secrets-usage.diff"));
  assert.match(r.stdout, /RS421/);
});

test("scenario 11: documentation-only examples are allowed", () => {
  const r = run(fixture(allowDir, "doc-example-eval-no-code.diff"), ["--json"]);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.findings.length, 0, r.stdout);
});

test("scenario 12: removal of dangerous code is allowed", () => {
  const r = run(fixture(allowDir, "removal-of-eval.diff"), ["--json"]);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.findings.length, 0, r.stdout);
});

test("scenario 13: SARIF output is valid JSON and contains expected rule IDs and a real line number", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--sarif"]);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.version, "2.1.0");
  assert.equal(parsed.runs[0].tool.driver.name, "Modonome Risk Surface Guard");
  assert.ok(parsed.runs[0].tool.driver.rules.some((rule) => rule.id === "RS101"));
  const result = parsed.runs[0].results.find((res) => res.ruleId === "RS101");
  assert.ok(result);
  assert.equal(result.locations[0].physicalLocation.region.startLine, 2);
  assert.notEqual(result.locations[0].physicalLocation.region.startLine, 1);
});

test("scenario 14: warn mode exits 0 with findings", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "warn"]);
  assert.equal(r.status, 0, r.stderr);
});

test("scenario 15: fail mode exits 1 with high findings", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "fail"]);
  assert.equal(r.status, 1, r.stderr);
});

test("scenario 16: no findings exits 0", () => {
  const r = run(fixture(allowDir, "doc-example-eval-no-code.diff"), ["--mode", "fail"]);
  assert.equal(r.status, 0, r.stderr);
});

test("invalid --mode value exits 2 with a usage message", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "banana"]);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /invalid --mode value/);
});

test("--diff with no path exits 2 with a usage message", () => {
  const r = spawnSync("node", [guard, "--diff"], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /usage:/);
});

test("format flags and --mode compose with the diff source flag in any order", () => {
  const a = run(fixture(flagDir, "js-eval.diff"), ["--sarif", "--mode", "fail"]);
  const b = spawnSync("node", [guard, "--sarif", "--mode", "fail", "--diff", fixture(flagDir, "js-eval.diff")], { encoding: "utf8" });
  assert.equal(a.status, 1);
  assert.equal(b.status, 1);
  assert.equal(a.stdout, b.stdout);
});

// ---------------------------------------------------------------------------
// Live-repo pass. Findings are expected here (this change itself touches
// several protected paths and adds should-flag fixture content elsewhere in
// the tree), so this only asserts a clean, non-error run, not zero findings.
// ---------------------------------------------------------------------------

test("runs cleanly against this repository's own live diff against origin/main", () => {
  const r = spawnSync("node", [guard, "origin/main", "--mode", "warn"], { encoding: "utf8", cwd: root });
  assert.ok(r.status === 0 || r.status === 1, `unexpected exit ${r.status}: ${r.stderr}`);
  assert.doesNotMatch(r.stderr, /internal error/);
  // No --allowlist given: this exercises the default-path resolution to
  // .modonome/risk-surface-allowlist.json, which must load cleanly with zero
  // warnings against the repo's own real (currently empty) allowlist file.
  assert.doesNotMatch(r.stderr, /allowlist.*invalid/);
});

// ---------------------------------------------------------------------------
// Suppression allowlist: CLI integration (ADR-047 decision 9)
// ---------------------------------------------------------------------------

const allowlistFixture = (name) => join(fxRoot, "allowlist", name);

test("a matching allowlist entry suppresses a high-severity finding: fail mode exits 0, not 1", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "fail", "--allowlist", allowlistFixture("single-valid-entry.json")]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS: no risk-surface findings\./);
});

test("an expired allowlist entry does not suppress: fail mode still exits 1", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "fail", "--allowlist", allowlistFixture("expired-entry.json")]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
});

test("a malformed allowlist file does not crash the scan: finding stays unsuppressed and stderr warns", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "fail", "--allowlist", allowlistFixture("malformed.json")]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /allowlist.*is invalid/);
  const json = run(fixture(flagDir, "js-eval.diff"), ["--json", "--allowlist", allowlistFixture("malformed.json")]);
  assert.equal(JSON.parse(json.stdout).findings[0].suppressed, null);
});

test("--sarif excludes a suppressed finding while --json on the same input includes it marked", () => {
  const allowlist = allowlistFixture("single-valid-entry.json");
  const sarif = JSON.parse(run(fixture(flagDir, "js-eval.diff"), ["--sarif", "--allowlist", allowlist]).stdout);
  assert.equal(sarif.runs[0].results.length, 0);
  const json = JSON.parse(run(fixture(flagDir, "js-eval.diff"), ["--json", "--allowlist", allowlist]).stdout);
  assert.equal(json.findings.length, 1);
  assert.deepEqual(json.findings[0].suppressed, { entry_id: "fixture-single-valid", reason: "fixture: a single well-formed entry" });
});

test("formatHuman shows the [SUPPRESSED] marker and the allowlist entry's reason", () => {
  const r = run(fixture(flagDir, "js-eval.diff"), ["--mode", "fail", "--allowlist", allowlistFixture("single-valid-entry.json")]);
  assert.match(r.stdout, /\[SUPPRESSED\]/);
  assert.match(r.stdout, /Suppressed by allowlist entry fixture-single-valid: fixture: a single well-formed entry/);
});

// ---------------------------------------------------------------------------
// Adversarial / false-positive cases
// ---------------------------------------------------------------------------

test("test assertions against a quoted dangerous-looking string are allowed", () => {
  const r = run(fixture(allowDir, "test-asserts-eval-blocked.diff"), ["--json"]);
  assert.equal(JSON.parse(r.stdout).findings.length, 0, r.stdout);
});

test("action.yml's own SARIF-permission description text does not trigger RS415 (leading-token anchor)", () => {
  const r = run(fixture(allowDir, "action-yml-sarif-permission-context.diff"), ["--json"]);
  const ids = JSON.parse(r.stdout).findings.map((f) => f.id);
  assert.ok(!ids.includes("RS415"), ids.join(","));
});

test("a YAML comment mentioning pull_request_target does not trigger RS401", () => {
  const r = run(fixture(allowDir, "comment-only-pull-request-target.diff"), ["--json"]);
  const ids = JSON.parse(r.stdout).findings.map((f) => f.id);
  assert.ok(!ids.includes("RS401"), ids.join(","));
});

test("a JS comment mentioning eval() does not trigger RS101", () => {
  const r = run(fixture(allowDir, "comment-only-eval-js.diff"), ["--json"]);
  const ids = JSON.parse(r.stdout).findings.map((f) => f.id);
  assert.ok(!ids.includes("RS101"), ids.join(","));
});

test("markdown prose is exempt from content rules unless the path is itself protected", () => {
  const r = run(fixture(allowDir, "markdown-prose-curl-bash.diff"), ["--json"]);
  assert.equal(JSON.parse(r.stdout).findings.length, 0, r.stdout);
});

test("a pinned official GitHub action does not trigger RS423", () => {
  const r = run(fixture(allowDir, "pinned-official-action.diff"), ["--json"]);
  const ids = JSON.parse(r.stdout).findings.map((f) => f.id);
  assert.ok(!ids.includes("RS423"), ids.join(","));
});

test("a full 40-character SHA pin on a third-party action does not trigger RS423", () => {
  const r = run(fixture(allowDir, "sha-pinned-third-party-action.diff"), ["--json"]);
  const ids = JSON.parse(r.stdout).findings.map((f) => f.id);
  assert.ok(!ids.includes("RS423"), ids.join(","));
});

test("bulk: every should-flag fixture produces at least one finding, every should-allow fixture produces no content finding", () => {
  for (const f of files(flagDir)) {
    const r = run(f, ["--json"]);
    const findings = JSON.parse(r.stdout).findings;
    assert.ok(findings.length > 0, `expected a finding for ${f}`);
  }
  for (const f of files(allowDir)) {
    const r = run(f, ["--json"]);
    const contentFindings = JSON.parse(r.stdout).findings.filter((x) => x.id !== "RS801");
    assert.equal(contentFindings.length, 0, `expected no content finding for ${f}: ${contentFindings.map((x) => x.id).join(",")}`);
  }
});
