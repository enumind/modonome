#!/usr/bin/env node
// Read a target repo, build an adoption summary, and print the work it would
// propose. This mutates nothing. It is the safe first command.
// Usage: node scripts/dry-run-sweep.mjs <targetDir>
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2] || ".";
const has = (p) => existsSync(join(target, p));
const read = (p) => { try { return readFileSync(join(target, p), "utf8"); } catch { return ""; } };

function detectStack() {
  if (has("package.json")) {
    const pkg = JSON.parse(read("package.json") || "{}");
    const pm = has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : "npm";
    const test = pkg.scripts?.test ? `${pm} test` : "no test script found";
    return { name: "Node or TypeScript", pm, gates: [`${pm} run lint`, `${pm} run typecheck`, test].filter(Boolean) };
  }
  if (has("pyproject.toml") || has("requirements.txt")) {
    return { name: "Python", pm: "pip", gates: ["ruff check .", "pytest"] };
  }
  if (has("pom.xml")) return { name: "Java (Maven)", pm: "maven", gates: ["./mvnw verify", "./mvnw jacoco:check"] };
  if (has("build.gradle") || has("build.gradle.kts")) return { name: "Java (Gradle)", pm: "gradle", gates: ["./gradlew check", "./gradlew jacocoTestCoverageVerification"] };
  if (has("go.mod")) return { name: "Go", pm: "go", gates: ["go vet ./...", "go test ./..."] };
  const csprojFiles = (() => { try { return readdirSync(target).some((f) => f.endsWith(".csproj") || f.endsWith(".sln")); } catch { return false; } })();
  if (csprojFiles) return { name: "C# (.NET)", pm: "dotnet", gates: ["dotnet build", 'dotnet test --collect:"XPlat Code Coverage"'] };
  if (has("main.tf") || has("terraform")) return { name: "Infrastructure (Terraform)", pm: "terraform", gates: ["terraform fmt -check", "terraform validate"] };
  return { name: "Unknown", pm: "unknown", gates: ["adopt the repo's existing checks"] };
}

function detectProtected() {
  const paths = [];
  for (const p of [".github", "CODEOWNERS", ".github/CODEOWNERS", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "go.sum", "poetry.lock"]) {
    if (has(p)) paths.push(p);
  }
  return paths;
}

function detectInstructions() {
  return ["AGENTS.md", "CLAUDE.md", "CODEX.md", "CONTRIBUTING.md", "README.md"].filter(has);
}

function proposeWork(stack) {
  const generic = [
    "Add focused tests around the most-changed module from recent history.",
    "Type or guard one high-risk function and remove an unchecked assumption.",
    "Document and gate one manual release or verification step.",
  ];
  if (stack.name.startsWith("Node")) generic.unshift("Add tests around a brittle path, then remove a dead feature-flag branch after owner approval.");
  if (stack.name === "Python") generic.unshift("Isolate a flaky external call behind a local seam with a regression test.");
  if (stack.name.startsWith("Java")) generic.unshift("Add a JUnit 5 test for an untested service boundary and wire JaCoCo threshold to 80% line coverage.");
  if (stack.name === "C# (.NET)") generic.unshift("Add an xUnit test for an untested controller action and configure Coverlet threshold at 80% line coverage.");
  return generic.slice(0, 3);
}

const stack = detectStack();
const protectedPaths = detectProtected();
const instructions = detectInstructions();
const adopted = has(".autonomy") ? ".autonomy (adopted)" : ".modonome";

const lines = [];
lines.push("Modonome dry-run sweep");
lines.push("Mode: dry-run. This run changed nothing.\n");
lines.push(`Target: ${target}`);
lines.push(`State directory: ${adopted}`);
lines.push(`Detected stack: ${stack.name} (${stack.pm})`);
lines.push(`Repo instructions found: ${instructions.length ? instructions.join(", ") : "none"}`);
lines.push("\nGates it would adopt:");
for (const g of stack.gates) lines.push(`  - ${g}`);
lines.push("\nProtected paths it would never auto-merge:");
for (const p of (protectedPaths.length ? protectedPaths : ["none detected, ask the owner to confirm"])) lines.push(`  - ${p}`);
lines.push("\nProposed bounded work (each becomes a small reviewable pull request):");
proposeWork(stack).forEach((w, i) => lines.push(`  ${i + 1}. ${w}`));
lines.push("\nRefused by default: autonomy off, no auto-merge, no protected-path edits, no remote spend, nothing shared across repos.");
lines.push("Next safe step: review this output, then run `npx modonome scaffold .` to drop disabled, dry-run state files.");

console.log(lines.join("\n"));
