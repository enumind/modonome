// Repository detection helpers, shared by the dry-run sweep and the snapshot
// utility so both read one source of truth for stack, protected paths, repo
// instructions, and git churn. Every function is dependency-free and takes a
// target directory. The stack result is extended with entrypoints and the test,
// build, and lint commands so a snapshot can report how to run and verify a repo.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Build the small file helpers a detector needs, bound to one target directory.
function helpers(target) {
  const has = (p) => existsSync(join(target, p));
  const read = (p) => { try { return readFileSync(join(target, p), "utf8"); } catch { return ""; } };
  const list = () => { try { return readdirSync(target); } catch { return []; } };
  return { has, read, list };
}

// Detect the primary stack. Returns { name, pm, gates } exactly as the dry-run
// sweep expects, plus { entrypoints, commands } for the snapshot signature.
export function detectStack(target = ".") {
  const { has, read, list } = helpers(target);

  if (has("package.json")) {
    const pkg = JSON.parse(read("package.json") || "{}");
    const pm = has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : "npm";
    const test = pkg.scripts?.test ? `${pm} test` : "no test script found";
    const gates = [`${pm} run lint`, `${pm} run typecheck`, test].filter(Boolean);
    const entrypoints = [];
    if (typeof pkg.main === "string") entrypoints.push(pkg.main);
    if (typeof pkg.bin === "string") entrypoints.push(pkg.bin);
    else if (pkg.bin && typeof pkg.bin === "object") entrypoints.push(...Object.values(pkg.bin).filter((v) => typeof v === "string"));
    for (const f of ["index.js", "index.mjs", "src/index.ts", "src/index.js", "src/main.ts"]) if (has(f)) entrypoints.push(f);
    const commands = {
      test,
      build: pkg.scripts?.build ? `${pm} run build` : "",
      lint: pkg.scripts?.lint ? `${pm} run lint` : "",
    };
    return { name: "Node or TypeScript", pm, gates, entrypoints: dedupe(entrypoints), commands };
  }
  if (has("pyproject.toml") || has("requirements.txt")) {
    const entrypoints = ["main.py", "app.py", "manage.py", "__main__.py", "src/main.py"].filter(has);
    return { name: "Python", pm: "pip", gates: ["ruff check .", "pytest"], entrypoints, commands: { test: "pytest", build: "", lint: "ruff check ." } };
  }
  if (has("pom.xml")) return { name: "Java (Maven)", pm: "maven", gates: ["./mvnw verify", "./mvnw jacoco:check"], entrypoints: [], commands: { test: "./mvnw test", build: "./mvnw package", lint: "" } };
  if (has("build.gradle") || has("build.gradle.kts")) return { name: "Java (Gradle)", pm: "gradle", gates: ["./gradlew check", "./gradlew jacocoTestCoverageVerification"], entrypoints: [], commands: { test: "./gradlew test", build: "./gradlew build", lint: "" } };
  if (has("go.mod")) {
    const entrypoints = ["main.go"].filter(has);
    return { name: "Go", pm: "go", gates: ["go vet ./...", "go test ./..."], entrypoints, commands: { test: "go test ./...", build: "go build ./...", lint: "go vet ./..." } };
  }
  const csprojFiles = list().some((f) => f.endsWith(".csproj") || f.endsWith(".sln"));
  if (csprojFiles) return { name: "C# (.NET)", pm: "dotnet", gates: ["dotnet build", 'dotnet test --collect:"XPlat Code Coverage"'], entrypoints: [], commands: { test: "dotnet test", build: "dotnet build", lint: "" } };
  if (has("main.tf") || has("terraform")) return { name: "Infrastructure (Terraform)", pm: "terraform", gates: ["terraform fmt -check", "terraform validate"], entrypoints: ["main.tf"].filter(has), commands: { test: "terraform validate", build: "terraform plan", lint: "terraform fmt -check" } };
  return { name: "Unknown", pm: "unknown", gates: ["adopt the repo's existing checks"], entrypoints: [], commands: { test: "", build: "", lint: "" } };
}

// Paths that must never be auto-merged. Same list the dry-run sweep reports.
export function detectProtected(target = ".") {
  const { has } = helpers(target);
  const paths = [];
  for (const p of [".github", "CODEOWNERS", ".github/CODEOWNERS", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "go.sum", "poetry.lock"]) {
    if (has(p)) paths.push(p);
  }
  return paths;
}

// Repo instruction files an agent should read first.
export function detectInstructions(target = ".") {
  const { has } = helpers(target);
  return ["AGENTS.md", "CLAUDE.md", "CODEX.md", "CONTRIBUTING.md", "README.md"].filter(has);
}

// Rank files by how often they changed in recent git history. The dry-run sweep
// uses the default limit of 3; the snapshot passes a larger limit to score churn
// across the whole tree. Returns [] when git history is unavailable.
export function detectHotFiles(target = ".", { commits = 200, limit = 3 } = {}) {
  const result = spawnSync(
    "git",
    ["log", "--no-merges", "--name-only", "--pretty=format:", "-n", String(commits)],
    { encoding: "utf8", cwd: target, timeout: 10000 }
  );
  if (result.status !== 0 || !result.stdout.trim()) return [];
  const counts = {};
  for (const line of result.stdout.split("\n")) {
    const f = line.trim();
    if (!f) continue;
    counts[f] = (counts[f] || 0) + 1;
  }
  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([file, changes]) => ({ file, changes }));
  return Number.isFinite(limit) ? ranked.slice(0, limit) : ranked;
}

function dedupe(arr) {
  return [...new Set(arr)];
}
