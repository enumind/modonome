// Rule catalog for scripts/risk-surface-guard.mjs (ADR-047). Kept fully separate from
// guard-ratchet.mjs: a different threat model (execution, credential, workflow, and
// infrastructure blast radius) from the anti-gaming ratchet's test-gate integrity
// focus, so the two never share a rule set, a message-catalog namespace, or a
// false-positive-discipline budget.
//
// Every content rule is scoped to real source or config file extensions and
// universally excludes documentation and diff/patch formats (isContentExempt below).
// This is load-bearing, not cosmetic: this repository's own CI runs this scanner
// against its own pull requests, including the one that first adds
// fixtures/risk-surface/should-flag/*.diff. Those fixtures carry risky-looking text as
// fixture data, and every fixture in this feature uses a .diff extension specifically
// so the extension exclusion keeps the scanner from flagging its own fixtures (see
// ADR-047, decision 2).
import { scanForSecrets } from "./secret-patterns.mjs";

function basename(path) {
  const parts = String(path).split("/");
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// File-scope predicates
// ---------------------------------------------------------------------------

const CONTENT_EXEMPT_EXT = /\.(md|mdx|txt|rst|diff|patch)$/i;

// This scanner's own implementation and test files necessarily contain the
// detection vocabulary itself (rule patterns, reason text, and test fixture
// data quoting things like "169.254.169.254" or "--privileged" as literal
// source, not as a real risky call site). Scanning them for their own
// vocabulary is a structural false positive, the same class of problem the
// extension exemption above solves for fixtures, so these paths get the same
// treatment. This does not weaken review: all four are still exact or glob
// matches in PROTECTED_PATH_GLOBS below, so RS801 (path-based, content-
// independent) still fires on every one of them whenever they are touched.
const SELF_EXEMPT_PATHS = new Set([
  "scripts/risk-surface-guard.mjs",
  "scripts/lib/risk-surface-rules.mjs",
  "scripts/lib/message-catalog/gate/risk-surface-guard.mjs",
  "tests/risk-surface-guard.test.mjs",
]);

export function isContentExempt(path) {
  return CONTENT_EXEMPT_EXT.test(path) || SELF_EXEMPT_PATHS.has(path);
}

export function isJsTsScope(path) {
  return !isContentExempt(path) && /\.(m|c)?[jt]sx?$/.test(path);
}

export function isPythonScope(path) {
  return !isContentExempt(path) && /\.py$/.test(path);
}

export function isWorkflowScope(path) {
  if (isContentExempt(path)) return false;
  if (/^\.github\/workflows\/.+\.ya?ml$/.test(path)) return true;
  const b = basename(path);
  return b === "action.yml" || b === "action.yaml";
}

export function isDockerComposeScope(path) {
  if (isContentExempt(path)) return false;
  return /(^|\/)(docker-)?compose([.\-][\w.\-]+)?\.ya?ml$/i.test(path);
}

export function isDockerfileScope(path) {
  if (isContentExempt(path)) return false;
  return /(^|\/)Dockerfile([.\-][\w.\-]+)?$/.test(path);
}

export function isK8sScope(path) {
  if (isContentExempt(path)) return false;
  if (!/\.ya?ml$/.test(path)) return false;
  return /^(k8s|kubernetes|helm|charts)(\/|$)/.test(path);
}

export function isTerraformScope(path) {
  if (isContentExempt(path)) return false;
  return /\.tf$/.test(path) || /^(terraform|infra)\//.test(path);
}

// Broad scope for rules whose patterns can legitimately appear in many file kinds
// (credential references, network/TLS flags, network-install one-liners): JS/TS,
// Python, Dockerfiles, and common shell/config/infra text formats. Still excludes
// documentation and diff/patch formats via isContentExempt.
const BROAD_EXTRA_EXT = /\.(rb|go|java|sh|bash|ya?ml|json|toml|ini|env|tf|cfg|conf)$/i;

export function isBroadScope(path) {
  if (isContentExempt(path)) return false;
  if (isJsTsScope(path) || isPythonScope(path) || isDockerfileScope(path)) return true;
  return BROAD_EXTRA_EXT.test(path);
}

// ---------------------------------------------------------------------------
// Protected-path matching (RS801, content-independent)
// ---------------------------------------------------------------------------

export const PROTECTED_PATH_GLOBS = [
  ".github/workflows/**",
  "action.yml",
  "action.yaml",
  "scripts/guard-ratchet.mjs",
  "scripts/risk-surface-guard.mjs",
  "scripts/lib/**",
  "SECURITY.md",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "k8s/**",
  "kubernetes/**",
  "helm/**",
  "charts/**",
  "terraform/**",
  "infra/**",
  ".modonome/**",
];

function globToRegExp(glob) {
  // Split on the literal "**" substring first, so each segment holds at most
  // single "*" wildcards, then escape and rejoin with ".*" for where "**" was.
  // This sidesteps the placeholder round-trip that corrupted an earlier draft.
  const segments = glob
    .split("**")
    .map((part) => part.replace(/[.+^$\{\}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"));
  return new RegExp(`^${segments.join(".*")}$`);
}

const PROTECTED_PATH_REGEXPS = PROTECTED_PATH_GLOBS.map(globToRegExp);

export function matchesProtectedPath(path) {
  if (basename(path) === "CODEOWNERS") return true;
  return PROTECTED_PATH_REGEXPS.some((re) => re.test(path));
}

// ---------------------------------------------------------------------------
// Same-line noise stripping (ADR-045 technique, reimplemented small and
// self-contained here per ADR-047: open-and-close-on-the-same-line spans only;
// bail to the raw line whenever a span looks unterminated, so this can only
// suppress a match, never hide a real one).
// ---------------------------------------------------------------------------

export function stripSameLineNoise(rawLine) {
  const line = rawLine.replace(/\/\*.*?\*\//g, "");
  let result = "";
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (!inSingle && !inDouble && !inTemplate && ch === "/" && next === "/") break;
    if (!inDouble && !inTemplate && ch === "'" && line[i - 1] !== "\\") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && ch === '"' && line[i - 1] !== "\\") {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === "`" && line[i - 1] !== "\\") {
      inTemplate = !inTemplate;
      continue;
    }
    if (inSingle || inDouble || inTemplate) continue;
    result += ch;
  }
  if (inSingle || inDouble || inTemplate) return rawLine;
  return result;
}

export function stripPythonSameLineNoise(line) {
  let result = "";
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!inDouble && !inSingle && ch === "#") break;
    if (!inDouble && ch === "'" && line[i - 1] !== "\\") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"' && line[i - 1] !== "\\") {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    result += ch;
  }
  if (inSingle || inDouble) return line;
  return result;
}

// Simple "#" to end of line stripper for YAML and shell-like formats. Not
// quote-aware (a "#" inside a quoted YAML string is still treated as a comment
// start) -- an accepted simplification, matching the same trade-off guard-ratchet
// itself accepts for its own comment stripping.
export function stripHashComment(line) {
  const idx = line.indexOf("#");
  if (idx === -1) return line;
  return line.slice(0, idx);
}

export function stripForScope(path, line) {
  if (isJsTsScope(path)) return stripSameLineNoise(line);
  if (isPythonScope(path)) return stripPythonSameLineNoise(line);
  return stripHashComment(line);
}

// ---------------------------------------------------------------------------
// Output-safety redaction, applied uniformly to every finding's matched_text
// regardless of which rule produced it.
// ---------------------------------------------------------------------------

const MAX_MATCHED_TEXT_LEN = 200;
const REDACTED_PLACEHOLDER = "[redacted: possible secret material on this line]";

export function redactMatchedText(text, opts = {}) {
  const maxLen = opts.maxLen || MAX_MATCHED_TEXT_LEN;
  const trimmed = String(text).trim();
  if (scanForSecrets(trimmed).length > 0) return REDACTED_PLACEHOLDER;
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + "... [truncated]";
}

// ---------------------------------------------------------------------------
// Rule catalog
//
// Rule shape: { id, category, severity, scope, pattern | test | fileTest,
//               reason, reviewer_guidance, limitation }
// - pattern: RegExp tested against the noise-stripped line.
// - test(strippedLine): custom single-line predicate, for multi-condition or
//   negative-lookahead-shaped checks a single RegExp reads poorly as.
// - fileTest(lines, filePath): file-level predicate over the whole array of
//   { text, line } added-line records, for co-occurrence checks. Returns the
//   array of triggering line records (empty array for no match).
// GitHub Actions permission keys and other YAML mapping keys use a
// leading-token anchor (^\s*<key>\s*:) so a value that merely mentions the key
// in prose -- for example this repo's own action.yml SARIF-permission
// description text -- never matches; only the key actually appearing as a
// YAML mapping key does.
// ---------------------------------------------------------------------------

export const RULES = [
  // ---- RS1xx: dynamic-code-execution / unsafe-deserialization / shell-execution ----
  {
    id: "RS101",
    category: "dynamic-code-execution",
    severity: "high",
    scope: isJsTsScope,
    pattern: /\beval\s*\(/,
    reason:
      "This line calls eval(), which executes a string as JavaScript. If any part of the input can be influenced by an external source (a PR body, an API response, a file from an untrusted repo), this is an arbitrary-code-execution path.",
    reviewer_guidance:
      "Confirm the argument is a fixed, repo-authored string, never data from a request, file read, or environment variable. Prefer JSON.parse, a small parser, or a lookup table instead of eval.",
    limitation:
      "Detects the literal token eval(. Does not resolve aliases (const e = eval; e(x)), indirect eval via (0, eval)(x), or dynamic property access (window['ev' + 'al'](x)).",
  },
  {
    id: "RS102",
    category: "dynamic-code-execution",
    severity: "high",
    scope: isJsTsScope,
    pattern: /\bnew\s+Function\s*\(/,
    reason:
      "The Function constructor compiles a string into a new function body at runtime, the same class of risk as eval with a different call shape.",
    reviewer_guidance:
      "Confirm every argument is a fixed, repo-authored string. Prefer a plain function declaration instead of runtime code generation.",
    limitation: "Detects the literal token new Function(. Does not resolve aliases assigned to Function before the call.",
  },
  {
    id: "RS103",
    category: "shell-execution",
    severity: "high",
    scope: isJsTsScope,
    pattern: /\bchild_process\.exec\s*\(/,
    reason:
      "child_process.exec runs its argument through a shell. If any part of the command is built from external input, this is a shell-injection path.",
    reviewer_guidance:
      "Prefer execFile or spawn with an explicit argument array (no shell involved). If a shell is genuinely required, confirm every interpolated value is fixed and repo-authored.",
    limitation: "Detects the literal token child_process.exec(. Does not follow a destructured import (`const { exec } = require(...)`).",
  },
  {
    id: "RS104",
    category: "shell-execution",
    severity: "high",
    scope: isJsTsScope,
    pattern: /\bchild_process\.execSync\s*\(/,
    reason: "Same risk as child_process.exec, synchronous form: the command is passed through a shell.",
    reviewer_guidance:
      "Prefer execFileSync with an explicit argument array. Confirm every interpolated value is fixed and repo-authored if a shell is genuinely required.",
    limitation: "Detects the literal token child_process.execSync(. Does not follow a destructured import.",
  },
  {
    id: "RS105",
    category: "shell-execution",
    severity: "high",
    scope: isJsTsScope,
    test: (line) => /\bspawn\s*\(/.test(line) && /\bshell\s*:\s*true\b/.test(line),
    reason:
      "spawn() with shell: true routes the command through a shell instead of executing an argument list directly, reintroducing shell-injection risk that spawn's default (no shell) avoids.",
    reviewer_guidance: "Drop shell: true and pass the command as an argument array. If a shell is genuinely required, confirm every interpolated value is fixed and repo-authored.",
    limitation:
      "Single-line heuristic: a call whose shell: true option is on a different line than spawn( (a common multi-line call-signature style) is not detected.",
  },
  {
    id: "RS106",
    category: "credential-surface-expansion",
    severity: "low",
    scope: (p) => isJsTsScope(p) && /auth|secret|credential|token/i.test(basename(p)),
    pattern: /\bprocess\.env\b/,
    reason:
      "New process.env access in a file whose name suggests it handles authentication, secrets, or credentials. Not inherently unsafe, but a new environment-variable read in this kind of file is worth a quick look at what it reads and where the value goes.",
    reviewer_guidance: "Confirm the value read is used narrowly (not logged, not echoed into a response or a wider object) and that the variable name matches what the file already handles.",
    limitation:
      "Scoped only by filename convention, not by actual file purpose, and only to JS/TS files. This is the rule most likely to be noisy in a repo with a different naming convention; it stays intentionally low severity and narrow for that reason.",
  },
  {
    id: "RS109",
    category: "dynamic-code-execution",
    severity: "high",
    scope: isPythonScope,
    pattern: /\beval\s*\(/,
    reason: "eval() executes a string as Python. If any part of the input can be influenced by an external source, this is an arbitrary-code-execution path.",
    reviewer_guidance: "Confirm the argument is a fixed, repo-authored string. Prefer ast.literal_eval for trusted structured data, or a dedicated parser.",
    limitation: "Detects the literal token eval(. Does not resolve aliases assigned to eval before the call.",
  },
  {
    id: "RS110",
    category: "dynamic-code-execution",
    severity: "high",
    scope: isPythonScope,
    pattern: /\bexec\s*\(/,
    reason: "exec() compiles and runs a string as Python statements, a broader capability than eval() (whole statements, where eval() is limited to expressions).",
    reviewer_guidance: "Confirm the argument is fixed and repo-authored. This is very rarely required outside of plugin-loading systems that already assume trusted code.",
    limitation: "Detects the literal token exec(. Does not distinguish this from an unrelated local function or method also named exec.",
  },
  {
    id: "RS111",
    category: "unsafe-deserialization",
    severity: "high",
    scope: isPythonScope,
    pattern: /\bpickle\.loads?\s*\(/,
    reason: "pickle.load/loads can execute arbitrary code during deserialization; unpickling untrusted data is a well-known remote-code-execution path.",
    reviewer_guidance: "Confirm the data source is fully trusted (written by this same process, never from a network response, upload, or another repo). Prefer JSON or another data-only format for anything crossing a trust boundary.",
    limitation: "Detects the literal token pickle.load( / pickle.loads(. Does not evaluate where the deserialized bytes came from.",
  },
  {
    id: "RS112",
    category: "unsafe-deserialization",
    severity: "high",
    scope: isPythonScope,
    test: (line) => /\byaml\.load\s*\(/.test(line) && !/SafeLoader/.test(line),
    reason: "yaml.load without an explicit SafeLoader can construct arbitrary Python objects from the input, which can lead to code execution depending on the objects the YAML encodes.",
    reviewer_guidance: "Pass Loader=yaml.SafeLoader (or use yaml.safe_load) unless there is a specific, reviewed reason to construct non-primitive objects.",
    limitation: "Single-line heuristic: a Loader argument passed on a later line of a multi-line call is not detected, and would read as a false positive here.",
  },
  {
    id: "RS113",
    category: "shell-execution",
    severity: "high",
    scope: isPythonScope,
    test: (line) => /\bsubprocess\.(run|call|Popen|check_call|check_output)\s*\(/.test(line) && /shell\s*=\s*True/.test(line),
    reason: "This subprocess call sets shell=True, passing the command through a shell instead of executing an argument list directly. If any part of the command string is built from external input, this is a shell-injection path.",
    reviewer_guidance: "Prefer passing a list of arguments with shell=False (the default). If a shell is genuinely required, confirm every interpolated value is from a fixed, trusted source.",
    limitation: "Single-line heuristic: a call whose shell=True argument is on a different line than the function name (a common multi-line call-signature style) is not detected.",
  },
  {
    id: "RS114",
    category: "shell-execution",
    severity: "high",
    scope: isPythonScope,
    pattern: /\bos\.system\s*\(/,
    reason: "os.system runs its argument through the platform shell with no argument-array separation, a direct shell-injection path if any part of the string is externally influenced.",
    reviewer_guidance: "Prefer subprocess.run with an explicit argument list and shell=False.",
    limitation: "Detects the literal token os.system(. Does not evaluate whether the argument is a fixed string.",
  },
  {
    id: "RS116",
    category: "unsafe-deserialization",
    severity: "medium",
    scope: isPythonScope,
    test: (line) => {
      const m = line.match(/\btorch\.load\s*\(\s*([^)]*)/);
      if (!m) return false;
      const arg = m[1].trim();
      return arg.length > 0 && !/^["']/.test(arg);
    },
    reason: "torch.load can execute arbitrary code embedded in a pickled checkpoint. This call's argument does not look like a fixed string literal, so the path may be externally supplied (a download, a config value, a function argument).",
    reviewer_guidance: "Confirm the checkpoint source is trusted and, where the model library supports it, pass weights_only=True. Prefer a pinned, hash-verified checkpoint source over an arbitrary path.",
    limitation: "Heuristic and single-line: flags any non-string-literal argument, whether or not it is genuinely externally supplied. A local, clearly-fixed variable will still be flagged.",
  },

  // ---- RS2xx: remote-model-or-dataset-code ----
  {
    id: "RS201",
    category: "remote-model-or-dataset-code",
    severity: "high",
    scope: (p) => isPythonScope(p) || (!isContentExempt(p) && /\.(ya?ml|json)$/i.test(p)),
    pattern: /\btrust_remote_code\s*[=:]\s*(True|true)\b/,
    reason:
      "trust_remote_code=True tells a Hugging Face-style loader (from_pretrained, load_dataset, pipeline, and similar) to download and execute custom Python code shipped alongside the model or dataset repository, outside the library's own vetted code paths. This single pattern covers the task's three related bullets (the flag itself, a load_dataset call carrying it, and a from_pretrained call carrying it): all three are the same underlying keyword argument.",
    reviewer_guidance:
      "Confirm the model or dataset source is one you trust to ship executable code, beyond trusting it to ship data. Pin to a specific revision or commit hash rather than a mutable branch or tag when this flag is enabled.",
    limitation: "Does not catch remote-code execution enabled through a differently-named or wrapped flag.",
  },
  {
    id: "RS203",
    category: "remote-model-or-dataset-code",
    severity: "medium",
    scope: isPythonScope,
    fileTest: (lines) => {
      const downloadRe = /\b(requests\.get\(|urlretrieve\(|hf_hub_download\()/;
      const execRe = /\b(exec\(|eval\(|os\.system\(|subprocess\.)/;
      const hasDownload = lines.some((l) => downloadRe.test(stripPythonSameLineNoise(l.text)));
      if (!hasDownload) return [];
      const execLine = lines.find((l) => execRe.test(stripPythonSameLineNoise(l.text)));
      return execLine ? [execLine] : [];
    },
    reason: "This file's added lines include both a network download call and a code-execution call. Downloading and then executing model, dataset, or pipeline content without a validation step in between is a remote-code-execution path.",
    reviewer_guidance: "Confirm there is a validation step (a checksum, a signature, a schema check) between the download and the execution, or that the execution call operates on something other than the downloaded content.",
    limitation: "File-level co-occurrence heuristic: does not confirm the downloaded content is actually what gets executed, only that both kinds of call appear among the same file's added lines.",
  },

  // ---- RS3xx: install-from-network ----
  {
    id: "RS301",
    category: "install-from-network",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bcurl\b[^|\n]*\|\s*(sudo\s+)?bash\b/,
    reason:
      "Pipes the output of a network fetch directly into a shell for execution. There is no integrity check between download and execution: a compromised server, a MITM, or a redirected URL changes what actually runs, with no diff or review step.",
    reviewer_guidance:
      "Download to a file first, verify a checksum or signature, then execute. If this is a package manager's documented install method, prefer a pinned, hash-verified installer or a registered package instead.",
    limitation: "Line-local pattern; a curl-to-file followed by execution on a later line is not caught by this rule (see RS308 for the related chmod-then-execute variant, which shares the same gap for arbitrarily separated steps).",
  },
  {
    id: "RS302",
    category: "install-from-network",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bcurl\b[^|\n]*\|\s*(sudo\s+)?sh\b/,
    reason: "Same risk as RS301 with sh instead of bash: no integrity check between download and execution.",
    reviewer_guidance: "Download to a file first, verify a checksum or signature, then execute.",
    limitation: "Line-local pattern; a two-step download-then-execute form is not caught.",
  },
  {
    id: "RS303",
    category: "install-from-network",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bwget\b[^|\n]*\|\s*(sudo\s+)?bash\b/,
    reason: "Same risk as RS301 with wget instead of curl: no integrity check between download and execution.",
    reviewer_guidance: "Download to a file first, verify a checksum or signature, then execute.",
    limitation: "Line-local pattern; a two-step download-then-execute form is not caught.",
  },
  {
    id: "RS304",
    category: "install-from-network",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bwget\b[^|\n]*\|\s*(sudo\s+)?sh\b/,
    reason: "Same risk as RS301 with wget and sh: no integrity check between download and execution.",
    reviewer_guidance: "Download to a file first, verify a checksum or signature, then execute.",
    limitation: "Line-local pattern; a two-step download-then-execute form is not caught.",
  },
  {
    id: "RS305",
    category: "install-from-network",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bbash\s+<\(\s*curl\b/,
    reason: "Process substitution feeds a live network fetch straight into a new bash process. Same integrity gap as a curl-pipe-bash, different syntax.",
    reviewer_guidance: "Download to a file first, verify a checksum or signature, then execute.",
    limitation: "Detects the curl form of this pattern only, not wget or other fetch tools used with process substitution.",
  },
  {
    id: "RS306",
    category: "install-from-network",
    severity: "medium",
    scope: isBroadScope,
    pattern: /\bnpm\s+i(nstall)?\s+[^\s]*https?:\/\//,
    reason: "Installs an npm package directly from an http(s) URL instead of the registry, bypassing package-integrity and provenance checks the registry provides.",
    reviewer_guidance: "Prefer a registry-published, version-pinned dependency. If a URL install is genuinely required, pin to a specific commit and confirm the source is trusted.",
    limitation: "Detects the literal npm install/npm i invocation with an inline URL; does not catch a URL placed in package.json and installed by a separate, unrelated npm install call.",
  },
  {
    id: "RS307",
    category: "install-from-network",
    severity: "medium",
    scope: isBroadScope,
    test: (line) => /\bpip\s+install\b/.test(line) && /(git\+|https?:\/\/)/.test(line) && !/@[0-9a-fA-F]{7,40}\b/.test(line),
    reason: "Installs a Python package from a git or http(s) source without pinning to a specific commit, so the resolved content can change between installs with no version-controlled record of what changed.",
    reviewer_guidance: "Pin to a specific commit hash with @<sha>, or prefer a published, version-pinned package from PyPI.",
    limitation: "Pin detection looks for a short or full hex commit hash after @; a branch or tag name that happens to be hex-shaped could be miscounted as pinned, and a real tag pin (@v1.2.3) is not recognized as pinned by this heuristic.",
  },
  {
    id: "RS308",
    category: "install-from-network",
    severity: "medium",
    scope: isBroadScope,
    fileTest: (lines) => {
      const chmodRe = /\bchmod\s+\+x\s+(\S+)/;
      let chmodIdx = -1;
      let target = null;
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].text.match(chmodRe);
        if (m) {
          chmodIdx = i;
          target = m[1];
          break;
        }
      }
      if (target == null) return [];
      for (let i = chmodIdx + 1; i < lines.length; i++) {
        if (lines[i].text.includes(target)) return [lines[i]];
      }
      return [];
    },
    reason: "This file's added lines mark a path executable (chmod +x) and later reference that same path again, a pattern consistent with downloading a file and then running it.",
    reviewer_guidance: "Confirm the file made executable comes from a trusted, ideally pinned and verified source before it runs.",
    limitation: "File-level substring heuristic: does not confirm the file was actually downloaded, or that the later reference is an execution rather than an unrelated mention of the same path.",
  },

  // ---- RS4xx: GitHub Actions ----
  {
    id: "RS401",
    category: "workflow-trigger-risk",
    severity: "high",
    scope: isWorkflowScope,
    pattern: /\bpull_request_target\b/,
    reason:
      "This workflow adds the pull_request_target trigger, which runs with access to repository secrets and the base branch's permissions even when triggered by a fork PR. Combined with checking out and running the PR's own head content, this is a well-documented path to secret exfiltration or write-access abuse.",
    reviewer_guidance:
      "Confirm the workflow does not check out the PR head SHA (or run any script from the PR head) while this trigger is active. Commenting on or labeling a PR does not require checking out untrusted code.",
    limitation:
      "Flags the trigger unconditionally; it cannot itself confirm whether the workflow also checks out and executes the PR head, which is the actual exploit precondition. Treat this as worth a close read, not confirmed exploitable.",
  },
  {
    id: "RS402",
    category: "workflow-trigger-risk",
    severity: "high",
    scope: isWorkflowScope,
    pattern: /\bworkflow_run\b/,
    reason: "The workflow_run trigger can run with the triggering workflow's own elevated permissions and secrets context, depending on configuration.",
    reviewer_guidance: "Confirm the triggered workflow does not check out and run untrusted content from the triggering event with elevated permissions.",
    limitation: "Flags the trigger unconditionally; does not evaluate the permissions block actually granted to the triggered job.",
  },
  {
    id: "RS411",
    category: "workflow-permission-expansion",
    severity: "high",
    scope: isWorkflowScope,
    pattern: /^\s*permissions\s*:\s*write-all\s*$/,
    reason: "Grants write-all, the broadest possible GITHUB_TOKEN permission set for this workflow or job, in place of the principle of least privilege.",
    reviewer_guidance: "Replace with an explicit per-scope block naming only the permissions actually used (for example contents: read, pull-requests: write).",
    limitation: "Detects the shorthand write-all scalar form only; does not evaluate whether the equivalent explicit per-key grants (RS412-415) add up to the same effective breadth.",
  },
  {
    id: "RS412",
    category: "workflow-permission-expansion",
    severity: "high",
    scope: isWorkflowScope,
    pattern: /^\s*contents\s*:\s*write\b/,
    reason: "Grants push access to repository contents for this workflow or job.",
    reviewer_guidance: "Confirm the workflow genuinely needs to push or modify repository content, and scope this to the minimum job that needs it.",
    limitation: "Structural line-anchor only; cannot verify the permission is actually consumed by a step that writes.",
  },
  {
    id: "RS413",
    category: "workflow-permission-expansion",
    severity: "high",
    scope: isWorkflowScope,
    pattern: /^\s*id-token\s*:\s*write\b/,
    reason: "Grants the ability to mint an OIDC token, commonly used to exchange for short-lived cloud credentials. A new grant here is a new path to cloud access.",
    reviewer_guidance: "Confirm the workflow uses this to authenticate to a specific, intended cloud provider action, and that the trigger cannot run with attacker-controlled input reaching it.",
    limitation: "Structural line-anchor only; cannot verify which step actually consumes the token.",
  },
  {
    id: "RS414",
    category: "workflow-permission-expansion",
    severity: "high",
    scope: isWorkflowScope,
    pattern: /^\s*actions\s*:\s*write\b/,
    reason: "Grants control over workflow runs themselves (cancelling, re-running, approving). A broad capability rarely needed outside meta-automation workflows.",
    reviewer_guidance: "Confirm the workflow's purpose genuinely requires controlling other workflow runs.",
    limitation: "Structural line-anchor only; cannot verify actual usage.",
  },
  {
    id: "RS415",
    category: "workflow-permission-expansion",
    severity: "medium",
    scope: isWorkflowScope,
    pattern: /^\s*security-events\s*:\s*write\b/,
    reason: "Adds security-events: write. This is commonly needed for SARIF and code-scanning upload steps, so it is scored lower than the other permission grants, but it is still a capability expansion worth a quick confirmation.",
    reviewer_guidance: "Confirm the workflow actually uploads to code scanning (for example via github/codeql-action/upload-sarif) and does not use this scope for anything broader.",
    limitation: "Structural line-anchor only; cannot verify the permission is actually consumed by an upload step in the same workflow.",
  },
  {
    id: "RS421",
    category: "credential-surface-expansion",
    severity: "medium",
    scope: isWorkflowScope,
    pattern: /\bsecrets\.[A-Za-z_][A-Za-z0-9_]*\b/,
    reason:
      "This line references a repository or organization secret that was not previously used here. Every new reference is a new place that secret's value can leak (via a log, a malicious script step, or a compromised third-party action) if the step isn't trustworthy.",
    reviewer_guidance:
      "Confirm the step consuming this secret is a pinned, trusted action or a repo-owned script, and that the workflow's trigger can't run with attacker-controlled input reaching this step (see RS401/RS402).",
    limitation:
      "Matches by name only, including the ambient secrets.GITHUB_TOKEN, and does not know whether the reference sits inside a conditional that never actually runs on an untrusted trigger.",
  },
  {
    id: "RS422",
    category: "workflow-permission-expansion",
    severity: "medium",
    scope: isWorkflowScope,
    pattern: /^\s*runs-on\s*:.*self-hosted/,
    reason: "Runs this job on a self-hosted runner instead of a GitHub-hosted one. A self-hosted runner is a persistent machine under the repository owner's control, a materially larger blast radius if a workflow step is compromised.",
    reviewer_guidance: "Confirm the runner is genuinely required (hardware access, network-restricted environment) and is not reachable by an untrusted trigger such as pull_request_target from a fork.",
    limitation: "Structural line match only; does not evaluate the runner's own isolation or the trigger that can reach this job.",
  },
  {
    id: "RS423",
    category: "workflow-permission-expansion",
    severity: "medium",
    scope: isWorkflowScope,
    test: (line) => {
      const m = line.match(/^\s*(?:-\s*)?uses\s*:\s*([^\/\s]+)\/[^@\s]+@([^\s]+)\s*$/);
      if (!m) return false;
      const org = m[1];
      const ref = m[2];
      if (org === "actions" || org === "github") return false;
      return !/^[0-9a-f]{40}$/i.test(ref);
    },
    reason: "This third-party action is pinned to a mutable tag or branch rather than a commit SHA. The action's maintainer (or anyone who compromises their account) can change what code that tag points to after this workflow starts trusting it.",
    reviewer_guidance: "Pin to a full 40-character commit SHA, or vendor the action into this repository if it's small and stable.",
    limitation: "Exempts the actions and github publisher organizations as a pinned-and-official carve-out; does not verify any other organization's actual trustworthiness or maintenance practices.",
  },

  // ---- RS5xx: privileged-container / kubernetes-privilege / docker-socket-access / sandbox-weakening ----
  {
    id: "RS501",
    category: "privileged-container",
    severity: "high",
    scope: isBroadScope,
    pattern: /--privileged\b/,
    reason: "Grants the container full access to the host's devices and kernel capabilities, effectively disabling container isolation. A compromised process inside the container can usually escalate to the host.",
    reviewer_guidance: "Replace with specific --cap-add flags for only the capabilities actually needed. --privileged is very rarely required outside Docker-in-Docker or hardware-passthrough use cases.",
    limitation: "Textual match only; cannot confirm whether other settings partially mitigate the grant.",
  },
  {
    id: "RS502",
    category: "privileged-container",
    severity: "high",
    scope: (p) => isDockerComposeScope(p) || isWorkflowScope(p),
    pattern: /^\s*privileged\s*:\s*true\s*$/,
    reason: "Same risk as RS501 (--privileged), expressed as a compose or workflow-service YAML key: full host device and kernel-capability access, effectively disabling container isolation.",
    reviewer_guidance: "Replace with specific capability grants for only what's needed.",
    limitation: "Structural line-anchor only; cannot confirm whether other settings partially mitigate the grant.",
  },
  {
    id: "RS511",
    category: "kubernetes-privilege",
    severity: "high",
    scope: isK8sScope,
    pattern: /^\s*hostPath\s*:/,
    reason: "Mounts a path from the host node's filesystem into the pod. This can expose host secrets, container-runtime sockets, or let a compromised pod write to the host filesystem, depending on the path mounted.",
    reviewer_guidance: "Confirm the mounted host path is narrowly scoped and read-only where possible (readOnly: true), and that it is not /, /etc, /var/run, or another sensitive root.",
    limitation: "Flags the volume-type key only; does not parse the actual path: value to grade risk by which host directory is mounted.",
  },
  {
    id: "RS512",
    category: "kubernetes-privilege",
    severity: "high",
    scope: isK8sScope,
    pattern: /^\s*(hostNetwork|hostPID|hostIPC)\s*:\s*true\s*$/,
    reason: "Shares the host's network, process, or IPC namespace with the pod, letting a compromised container see or interact with processes and network traffic outside its own isolation boundary.",
    reviewer_guidance: "Confirm this is genuinely required (typically only for node-level monitoring or networking add-ons) rather than a convenience setting.",
    limitation: "Structural line-anchor only; does not evaluate the workload's other isolation settings.",
  },
  {
    id: "RS513",
    category: "kubernetes-privilege",
    severity: "high",
    scope: isDockerComposeScope,
    pattern: /^\s*(network_mode|pid|ipc)\s*:\s*["']?host["']?\s*$/,
    reason: "Shares the host's network, process, or IPC namespace with the container, the compose-file equivalent of RS512's Kubernetes-native settings.",
    reviewer_guidance: "Confirm this is genuinely required rather than a convenience setting; most services do not need host-namespace sharing.",
    limitation: "Structural line-anchor only; does not evaluate the service's other isolation settings.",
  },
  {
    id: "RS521",
    category: "docker-socket-access",
    severity: "high",
    scope: isBroadScope,
    pattern: /\/var\/run\/docker\.sock\b/,
    reason: "Exposes the Docker socket inside a container. Anything with access to this socket can control the host's Docker daemon, which is equivalent to root on the host in most configurations.",
    reviewer_guidance: "Confirm this is genuinely required (a CI runner or a monitoring tool that manages containers) and that the container's own access is otherwise tightly controlled.",
    limitation: "Textual match only; does not distinguish a read-only mount from a read-write one, though the socket grants control either way in most Docker configurations.",
  },
  {
    id: "RS531",
    category: "sandbox-weakening",
    severity: "high",
    scope: isK8sScope,
    pattern: /^\s*allowPrivilegeEscalation\s*:\s*true\s*$/,
    reason: "Allows a process in the container to gain more privileges than its parent process, undoing a default Kubernetes sandboxing protection.",
    reviewer_guidance: "Set this to false unless a specific, reviewed reason requires privilege escalation inside the container.",
    limitation: "Structural line-anchor only.",
  },
  {
    id: "RS532",
    category: "sandbox-weakening",
    severity: "high",
    scope: isK8sScope,
    pattern: /^\s*runAsUser\s*:\s*0\s*$/,
    reason: "Runs the container process as root (UID 0) inside the container, widening the blast radius of a container-escape vulnerability.",
    reviewer_guidance: "Run as a non-root UID unless the workload has a specific, reviewed reason to need root inside the container.",
    limitation: "Structural line-anchor only; does not evaluate whether the container image itself defaults to a non-root user regardless of this setting.",
  },
  {
    id: "RS533",
    category: "sandbox-weakening",
    severity: "high",
    scope: (p) => isK8sScope(p) || isDockerComposeScope(p),
    test: (line) =>
      /^\s*-\s*["']?(SYS_ADMIN|NET_ADMIN)["']?\s*$/.test(line) || /\b(cap_add|add)\s*:.*\b(SYS_ADMIN|NET_ADMIN)\b/.test(line),
    reason: "Adds the SYS_ADMIN or NET_ADMIN Linux capability, both broad enough to enable container-escape techniques in combination with other settings.",
    reviewer_guidance: "Confirm the workload genuinely needs this specific capability and cannot use a narrower one.",
    limitation: "Matches a bare capability list item or an inline add list; does not confirm the surrounding key several lines above a bare list item is actually capabilities: or cap_add:, so a coincidental list entry with this exact value elsewhere would also match.",
  },
  {
    id: "RS534",
    category: "sandbox-weakening",
    severity: "high",
    scope: isK8sScope,
    fileTest: (lines) => {
      const hasProfile = lines.some((l) => /\bseccompProfile\b/.test(l.text));
      if (!hasProfile) return [];
      const unconfinedLine = lines.find((l) => /\bUnconfined\b/.test(l.text));
      return unconfinedLine ? [unconfinedLine] : [];
    },
    reason: "Sets the seccomp profile to Unconfined, disabling the syscall filtering Kubernetes applies by default and widening the kernel surface a compromised container can reach.",
    reviewer_guidance: "Use the default RuntimeDefault profile unless a specific, reviewed workload requirement needs an unconfined syscall surface.",
    limitation: "File-level co-occurrence heuristic: confirms seccompProfile and Unconfined both appear among the file's added lines, not that they belong to the same block.",
  },
  {
    id: "RS535",
    category: "sandbox-weakening",
    severity: "high",
    scope: isK8sScope,
    pattern: /apparmor\S*\s*:\s*["']?unconfined["']?/i,
    reason: "Sets an AppArmor annotation to unconfined, disabling the mandatory access control profile Kubernetes would otherwise apply and widening what a compromised container process can do on the host.",
    reviewer_guidance: "Use the default or a specific named profile unless a reviewed workload requirement needs to run unconfined.",
    limitation: "Textual match on the annotation value only; does not evaluate whether an unconfined profile is a documented, accepted exception for this workload.",
  },

  // ---- RS6xx: credential-surface-expansion (cloud) ----
  {
    id: "RS601",
    category: "credential-surface-expansion",
    severity: "medium",
    scope: isBroadScope,
    raw: true,
    pattern: /\bAWS_ACCESS_KEY_ID\b/,
    reason: "References the AWS access key ID environment variable. A new reference is a new place this credential can leak if the surrounding code or step isn't trustworthy.",
    reviewer_guidance: "Prefer short-lived credentials via OIDC federation over long-lived access keys where the platform supports it. Confirm the value's scope and where it flows.",
    limitation: "Matches the identifier name only, including inside a string literal (this rule intentionally skips comment and string stripping, since a credential identifier this often appears as a quoted lookup key). Does not evaluate how the value is used afterward.",
  },
  {
    id: "RS602",
    category: "credential-surface-expansion",
    severity: "medium",
    scope: isBroadScope,
    raw: true,
    pattern: /\bAWS_SECRET_ACCESS_KEY\b/,
    reason: "References the AWS secret access key environment variable, the counterpart to RS601.",
    reviewer_guidance: "Prefer short-lived credentials via OIDC federation over long-lived secret keys where the platform supports it.",
    limitation: "Matches the identifier name only, including inside a string literal or comment. Does not evaluate how the value is used afterward.",
  },
  {
    id: "RS603",
    category: "credential-surface-expansion",
    severity: "medium",
    scope: isBroadScope,
    raw: true,
    pattern: /\bGOOGLE_APPLICATION_CREDENTIALS\b/,
    reason: "References the Google Cloud application-default-credentials environment variable, typically pointing at a service-account key file.",
    reviewer_guidance: "Prefer workload identity federation over a downloaded service-account key file where the platform supports it.",
    limitation: "Matches the identifier name only, including inside a string literal or comment. Does not evaluate the key file's own permissions or scope.",
  },
  {
    id: "RS604",
    category: "credential-surface-expansion",
    severity: "medium",
    scope: isBroadScope,
    raw: true,
    pattern: /\bAZURE_CLIENT_SECRET\b/,
    reason: "References the Azure service-principal client-secret environment variable.",
    reviewer_guidance: "Prefer a managed identity or workload identity federation over a long-lived client secret where the platform supports it.",
    limitation: "Matches the identifier name only, including inside a string literal or comment. Does not evaluate how the value is used afterward.",
  },
  {
    id: "RS605",
    category: "credential-surface-expansion",
    severity: "low",
    scope: isBroadScope,
    raw: true,
    pattern: /[\w-]*(service[-_]?account[\w-]*|[\w-]*-key)\.json\b/i,
    reason: "References a file path shaped like a cloud service-account key file. If this file is committed or downloaded from an untrusted location, it is a credential-exposure path.",
    reviewer_guidance: "Confirm this path is never committed to the repository and is fetched, at runtime, from a secret store rather than a fixed URL.",
    limitation: "Matches by filename shape only, including inside a string literal (most such paths are quoted). A JSON file with an unrelated purpose that happens to match the naming pattern will also be flagged.",
  },
  {
    id: "RS606",
    category: "credential-surface-expansion",
    severity: "medium",
    scope: isBroadScope,
    raw: true,
    pattern: /\bKUBECONFIG\b|\.kube\/config\b/,
    reason: "References a Kubernetes config file or the KUBECONFIG environment variable pointing at one. A kubeconfig typically carries cluster-admin-equivalent credentials.",
    reviewer_guidance: "Confirm the config is scoped to the minimum RBAC role needed and is not committed to the repository.",
    limitation: "Matches the identifier or path only, including inside a string literal. Does not evaluate the referenced config's actual permission scope.",
  },
  {
    id: "RS607",
    category: "credential-surface-expansion",
    severity: "high",
    scope: isBroadScope,
    raw: true,
    pattern: /169\.254\.169\.254/,
    reason: "References the cloud instance metadata service address. Code that reaches this address can often retrieve the host's own cloud credentials, a common path for credential theft from a compromised application (the class of issue behind several well-known cloud SSRF incidents).",
    reviewer_guidance: "Confirm this call is a legitimate, narrowly-scoped use of the metadata service (for example an official cloud SDK's own credential-provider chain), not a new, hand-rolled request path.",
    limitation: "Textual match on the literal address only, including inside a string literal (a metadata-service address is almost always part of a URL string). Does not evaluate who or what can trigger the code path that reaches it.",
  },
  {
    id: "RS608",
    category: "credential-surface-expansion",
    severity: "high",
    scope: isBroadScope,
    raw: true,
    pattern: /["']?(Action|Resource)["']?\s*:\s*\[?\s*["']\*["']/,
    reason: "Grants a wildcard IAM action or resource. A policy this broad usually grants far more than the workload actually needs, and widens the blast radius of any credential compromise built on this policy.",
    reviewer_guidance: "Replace with the specific actions and resource ARNs the workload actually uses.",
    limitation: "Matches the literal wildcard key/value shape only; does not evaluate the surrounding policy's Effect (an explicit Deny with a wildcard is not a risk, and would still be flagged here).",
  },

  // ---- RS7xx: network-egress-expansion / tls-verification-disabled ----
  {
    id: "RS701",
    category: "tls-verification-disabled",
    severity: "high",
    scope: (p) => isJsTsScope(p) || (!isContentExempt(p) && /\.json$/i.test(p)),
    pattern: /rejectUnauthorized\s*:\s*false\b/,
    reason: "Disables TLS certificate verification for this connection, making it vulnerable to machine-in-the-middle interception of anything sent over it, including credentials and tokens.",
    reviewer_guidance: "Fix the underlying certificate problem (add the CA to the trust store, fix a hostname mismatch) instead of disabling verification. If this is genuinely a local development-only code path, confirm it cannot run in production.",
    limitation: "Detects the literal key/value pair. Does not evaluate surrounding conditionals that might scope it to a non-production code path.",
  },
  {
    id: "RS702",
    category: "tls-verification-disabled",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bNODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?/,
    reason: "Sets NODE_TLS_REJECT_UNAUTHORIZED=0, disabling TLS certificate verification process-wide for every Node.js TLS connection this process makes, beyond the one call site that added it.",
    reviewer_guidance: "Fix the underlying certificate problem rather than disabling verification globally. This setting should never reach a production or CI environment.",
    limitation: "Textual match on the assignment only; does not evaluate whether the assignment is guarded by an environment check.",
  },
  {
    id: "RS703",
    category: "tls-verification-disabled",
    severity: "high",
    scope: isPythonScope,
    fileTest: (lines) => {
      const verifyFalseRe = /\bverify\s*=\s*False\b/;
      const httpCallRe = /\b(requests|session)\./;
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        const stripped = stripPythonSameLineNoise(lines[i].text);
        if (!verifyFalseRe.test(stripped)) continue;
        const nearby = [lines[i - 1], lines[i], lines[i + 1]].filter(Boolean);
        if (nearby.some((l) => httpCallRe.test(stripPythonSameLineNoise(l.text)))) matches.push(lines[i]);
      }
      return matches;
    },
    reason: "Disables TLS certificate verification on a requests/session call, near an added verify=False. Machine-in-the-middle interception becomes possible for anything sent over this connection.",
    reviewer_guidance: "Fix the underlying certificate problem instead of disabling verification. If this is genuinely a local development-only code path, confirm it cannot run in production.",
    limitation: "Co-occurrence heuristic scoped to the same and adjacent added lines; a requests/session call several lines away from its verify=False argument (a common multi-line call-signature style) is not detected, and an unrelated verify=False on an unrelated object would still be flagged if a requests/session call happens to sit on an adjacent added line.",
  },
  {
    id: "RS704",
    category: "tls-verification-disabled",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bcurl\b[^\n]*(\s-k\b|--insecure\b)/,
    reason: "Passes -k/--insecure to curl, disabling TLS certificate verification for the request.",
    reviewer_guidance: "Fix the underlying certificate problem instead of disabling verification.",
    limitation: "Textual match only; does not evaluate whether the flag is scoped to a local development or test-only invocation.",
  },
  {
    id: "RS705",
    category: "tls-verification-disabled",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bwget\b[^\n]*--no-check-certificate\b/,
    reason: "Passes --no-check-certificate to wget, disabling TLS certificate verification for the request.",
    reviewer_guidance: "Fix the underlying certificate problem instead of disabling verification.",
    limitation: "Textual match only; does not evaluate the invocation's context.",
  },
  {
    id: "RS706",
    category: "tls-verification-disabled",
    severity: "high",
    scope: isBroadScope,
    pattern: /\bstrict[_-]ssl\s*[:=]\s*false\b/i,
    reason: "Disables strict SSL/TLS certificate checking for this tool (commonly npm or a similar package manager config), the same class of risk as the other TLS-disabling rules in this catalog.",
    reviewer_guidance: "Fix the underlying certificate problem instead of disabling verification.",
    limitation: "Textual match only; does not evaluate which tool reads this setting or whether the surrounding config is scoped to a non-production install step.",
  },
  {
    id: "RS707",
    category: "network-egress-expansion",
    severity: "medium",
    scope: (p) => isTerraformScope(p) || isK8sScope(p),
    fileTest: (lines) => {
      const wildcardCidrRe = /0\.0\.0\.0\/0/;
      const egressWordRe = /\b(egress|outbound)\b/i;
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (!wildcardCidrRe.test(lines[i].text)) continue;
        const nearby = [lines[i - 1], lines[i], lines[i + 1]].filter(Boolean);
        if (nearby.some((l) => egressWordRe.test(l.text))) matches.push(lines[i]);
      }
      return matches;
    },
    reason: "This infrastructure config allows outbound traffic to any address (0.0.0.0/0) near an egress or outbound rule. A broad egress allowance makes data exfiltration from a compromised workload easier and harder to contain.",
    reviewer_guidance: "Scope egress to the specific destinations the workload actually needs to reach.",
    limitation: "Co-occurrence heuristic on nearby lines only, hedged deliberately per the task's own \"if detectable\" framing: a wildcard CIDR used for an unrelated, legitimately broad purpose (a public ingress rule, for instance) sitting near the word egress or outbound could still be flagged.",
  },

  // ---- RS8xx: protected-security-config (path-based, content-independent) ----
  {
    id: "RS801",
    category: "protected-security-config",
    severity: "medium",
    pathOnly: true,
    reason: "This file is on the list of security-sensitive or high-leverage paths (workflows, the shipped Action manifest, this scanner and its rules, security policy, code ownership, container and infrastructure manifests, and Modonome's own governance state). Changes here deserve a closer look regardless of what the diff itself contains.",
    reviewer_guidance: "Confirm the change to this path is intentional and understood, independent of any other finding on this diff.",
    limitation: "Fires on the path alone, including a pure deletion or a purely cosmetic edit; it carries no information about what actually changed inside the file.",
  },
];

export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]));
