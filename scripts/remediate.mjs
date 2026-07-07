#!/usr/bin/env node
/**
 * remediate.mjs
 *
 * The armed, gated APPLY half of Governed Remediation. Phase 1's hygiene.mjs detects
 * attribution signatures and PRINTS the commit-identity and commit-message remedies,
 * deferring them to "the armed, gated remediator (later phase)". This is that phase.
 *
 *   node scripts/remediate.mjs plan     show the metadata-only rewrite plan and a
 *                                       deterministic fingerprint. Read-only, always
 *                                       exits 0 on a clean run. This is the tokenless
 *                                       proposal step: no model, no network.
 *   node scripts/remediate.mjs apply    execute the plan by rewriting commit metadata
 *                                       with git plumbing. Refuses unless the engine is
 *                                       ARMED and the remediation_apply_enabled
 *                                       capability flag is on.
 *
 * Optional: --name "Name" --email addr override the target identity (default: the
 * repository's own git user), --root <dir> points config resolution at another repo.
 *
 * The applier is metadata-only and provably so. It replays each commit with
 * `git commit-tree` reusing the ORIGINAL tree object, so every rewritten commit points
 * at the same tree it always did, and the run verifies each new commit's tree SHA is
 * unchanged before it moves the branch ref. It is deterministic (same input tree,
 * identity, dates, and message produce the same commit SHA), re-runnable, and
 * idempotent (a second run finds nothing to change and does nothing).
 *
 * It never touches published history. The range is origin/main..HEAD; it refuses on the
 * default branch, on a working tree with tracked modifications, on a merge inside the
 * range, and when origin/main is absent (the protected-history boundary is then
 * unprovable). On any mid-run failure it resets hard to the saved head and aborts.
 *
 * Arming follows ADR-004 and ADR-024: a config file the agent can write can never arm
 * the engine, so apply requires autonomy_enabled and not dry_run and the capability flag
 * in config AND the authoritative MODONOME_ARMED=true in the environment.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { git, currentBranch } from "./lib/git-scope.mjs";
import { loadConfig } from "./validate-config.mjs";
import { detectBranch, isForbiddenIdentity } from "./lib/detect-attribution.mjs";
import { planCommitRewrites, remediationFingerprint } from "./lib/remediate.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const CAPABILITY_FLAG = "remediation_apply_enabled";
const DEFAULT_BRANCHES = new Set(["main", "master"]);
// Unit separator: safe inside commit messages and identities, so it delimits the
// combined --format fields without the tab or newline collisions git-scope avoids.
const US = "\x1f";

function flagValue(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}

// Resolve the full arming posture. Config values are advisory; the MODONOME_ARMED
// environment variable is authoritative (ADR-004). The capability flag layers ADR-024:
// even an armed engine will not rewrite history until this specific capability is on.
function armState(root, env = process.env) {
  const path = join(root, ".modonome", "config.yaml");
  let cfg = {};
  try {
    if (existsSync(path)) cfg = loadConfig(path);
  } catch {
    cfg = {};
  }
  const autonomy = cfg.autonomy_enabled === true;
  const notDryRun = cfg.dry_run !== true;
  const capability = cfg[CAPABILITY_FLAG] === true;
  const envArmed = env.MODONOME_ARMED === "true";
  return { armed: autonomy && notDryRun && capability && envArmed, autonomy, notDryRun, capability, envArmed };
}

function armingBlockers(arm) {
  const missing = [];
  if (!arm.autonomy) missing.push("config autonomy_enabled must be true");
  if (!arm.notDryRun) missing.push("config dry_run must be false");
  if (!arm.capability) missing.push(`config ${CAPABILITY_FLAG} must be true`);
  if (!arm.envArmed) missing.push("environment MODONOME_ARMED must be 'true' (authoritative, ADR-004)");
  return missing;
}

function targetIdentity(argv) {
  const name = flagValue(argv, "--name") ?? git(["config", "user.name"]).out;
  const email = flagValue(argv, "--email") ?? git(["config", "user.email"]).out;
  return { name, email };
}

function identityUsable(id) {
  return Boolean(id.name) && Boolean(id.email) && !isForbiddenIdentity(id.name, id.email);
}

// Gather the branch-unique commit range oldest-first with the fields the applier needs:
// tree object, first parent, author and committer identity and dates, and raw message.
// Enforces the protected-history boundary (origin/main present, linear range).
function gatherRange() {
  if (git(["rev-parse", "--verify", "--quiet", "origin/main"]).status !== 0) {
    return { error: "origin/main is not available, so the protected-history boundary cannot be proven. Fetch it first." };
  }
  const revs = git(["rev-list", "--reverse", "origin/main..HEAD"]);
  if (revs.status !== 0) return { error: `git rev-list failed: ${revs.err}` };
  const shas = revs.out.split("\n").filter(Boolean);
  const commits = [];
  for (const sha of shas) {
    const parents = git(["rev-list", "--parents", "-n", "1", sha]).out.split(/\s+/).slice(1);
    if (parents.length > 1) {
      return { error: `merge commit ${sha.slice(0, 9)} is in range; the metadata-only applier requires a linear range.` };
    }
    const fmt = git(["show", "-s", `--format=%an${US}%ae${US}%cn${US}%ce${US}%aI${US}%cI${US}%H${US}%T`, sha]);
    if (fmt.status !== 0) return { error: `git show failed for ${sha.slice(0, 9)}: ${fmt.err}` };
    const [an, ae, cn, ce, ad, cd, full, tree] = fmt.out.split(US);
    const message = git(["show", "-s", "--format=%B", sha]).out;
    commits.push({ sha: full, tree, parent: parents[0] || "", an, ae, cn, ce, ad, cd, message });
  }
  return { commits };
}

// Advisory range for `plan`: tolerant of a missing origin/main so the proposal works in
// a fresh clone. Newest-first from git log; reversed to oldest-first for stable output.
function advisoryRange() {
  const range = git(["rev-parse", "--verify", "--quiet", "origin/main"]).status === 0
    ? "origin/main..HEAD"
    : "HEAD~20..HEAD";
  const log = git(["log", range, "--no-merges", `--format=%an${US}%ae${US}%cn${US}%ce${US}%H`]);
  if (log.status !== 0 || !log.out) return [];
  const rows = log.out.split("\n").filter(Boolean).map((line) => {
    const [an, ae, cn, ce, sha] = line.split(US);
    return { sha, an, ae, cn, ce, message: git(["show", "-s", "--format=%B", sha]).out };
  });
  return rows.reverse();
}

function buildPlan(branch, commits, identity) {
  const branchFinding = branch && branch !== "HEAD" ? detectBranch(branch) : null;
  return {
    branch: branchFinding ? { from: branch, to: branchFinding.remedy.suggestion } : null,
    commits: planCommitRewrites(commits, identity),
  };
}

function printPlan(plan, identity) {
  const changes = plan.commits.filter((c) => c.changed);
  console.log("Governed Remediation: metadata-only rewrite plan");
  console.log("================================================");
  console.log(`Target identity: ${identity.name} <${identity.email}>`);
  console.log(`Fingerprint:     ${remediationFingerprint(plan)}`);
  console.log("");
  if (plan.branch) {
    console.log(`branch: ${plan.branch.from} -> ${plan.branch.to}`);
    console.log("  (branch rename is a separate safe remedy: run `modonome hygiene fix`)");
    console.log("");
  }
  if (!changes.length) {
    console.log("No commit needs a metadata rewrite.");
    return;
  }
  console.log(`${changes.length} commit(s) would be rewritten (tree SHA unchanged for each):`);
  for (const c of changes) {
    console.log(`  ${c.sha.slice(0, 9)}  ${c.reasons.join(", ")}`);
  }
  console.log("");
  console.log("This is a proposal. Run `remediate apply` in an armed, capability-enabled");
  console.log("environment to perform the rewrite. Content redactions (pull request bodies,");
  console.log("tracked files) are out of scope here; find them with `modonome hygiene check`.");
}

function isDirtyTracked() {
  const st = git(["status", "--porcelain"]);
  return st.out.split("\n").some((line) => line.trim() && !line.startsWith("??"));
}

function rollback(savedHead) {
  if (savedHead) git(["reset", "--hard", savedHead]);
}

// Replay the range from the first changed commit forward, reusing each original tree
// object so the rewrite is metadata-only. Verifies tree-SHA invariance per commit and
// rolls back on any failure. Returns a summary or an { error } to abort on.
function applyPlan(commits, plan) {
  const firstChanged = plan.commits.findIndex((c) => c.changed);
  if (firstChanged === -1) return { applied: false };

  const savedHead = git(["rev-parse", "HEAD"]).out;
  let newParent = commits[firstChanged].parent;
  const rewritten = [];

  for (let i = firstChanged; i < commits.length; i++) {
    const c = commits[i];
    const p = plan.commits[i];
    const args = ["commit-tree", c.tree];
    if (newParent) args.push("-p", newParent);
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: p.author.name,
      GIT_AUTHOR_EMAIL: p.author.email,
      GIT_AUTHOR_DATE: c.ad,
      GIT_COMMITTER_NAME: p.committer.name,
      GIT_COMMITTER_EMAIL: p.committer.email,
      GIT_COMMITTER_DATE: c.cd,
    };
    const res = git(args, { input: `${p.newMessage}\n`, env });
    if (res.status !== 0) {
      rollback(savedHead);
      return { error: `git commit-tree failed at ${c.sha.slice(0, 9)}: ${res.err}` };
    }
    const newSha = res.out;
    const newTree = git(["rev-parse", `${newSha}^{tree}`]).out;
    if (newTree !== c.tree) {
      rollback(savedHead);
      return { error: `tree SHA changed at ${c.sha.slice(0, 9)} (${c.tree} became ${newTree}); rewrite is not metadata-only, aborting.` };
    }
    rewritten.push({ old: c.sha, new: newSha, tree: c.tree });
    newParent = newSha;
  }

  const finalSha = newParent;
  const beforeTree = git(["rev-parse", `${savedHead}^{tree}`]).out;
  const afterTree = git(["rev-parse", `${finalSha}^{tree}`]).out;
  if (beforeTree !== afterTree) {
    rollback(savedHead);
    return { error: `top tree changed (${beforeTree} became ${afterTree}); aborting.` };
  }
  const reset = git(["reset", "--hard", finalSha]);
  if (reset.status !== 0) {
    rollback(savedHead);
    return { error: `failed to move branch to ${finalSha}: ${reset.err}` };
  }
  return { applied: true, savedHead, newHead: finalSha, rewritten };
}

function cmdPlan(argv) {
  const identity = targetIdentity(argv);
  const plan = buildPlan(currentBranch(), advisoryRange(), identity);
  printPlan(plan, identity);
  if (!identityUsable(identity)) {
    console.log("");
    console.log(`Note: target identity ${identity.name} <${identity.email}> is empty or forbidden.`);
    console.log("Set git user.name and user.email, or pass --name and --email, before apply.");
  }
  return 0;
}

function cmdApply(argv, root) {
  const overrides = loadMessageOverrides(join(root, ".modonome"));
  const msg = (id, params) => formatMessage(id, params, overrides).message;
  const arm = armState(root);
  if (!arm.armed) {
    console.error(msg("agent-run.remediate.not-armed", {}));
    for (const m of armingBlockers(arm)) console.error(`  - ${m}`);
    console.error(msg("agent-run.remediate.plan-hint", {}));
    return 3;
  }
  const branch = currentBranch();
  if (!branch || branch === "HEAD" || DEFAULT_BRANCHES.has(branch)) {
    console.error(msg("agent-run.remediate.refusing-branch", { branch: branch || "detached HEAD" }));
    return 3;
  }
  if (isDirtyTracked()) {
    console.error(msg("agent-run.remediate.dirty-tree", {}));
    return 3;
  }
  const identity = targetIdentity(argv);
  if (!identityUsable(identity)) {
    console.error(msg("agent-run.remediate.identity-invalid", { name: identity.name, email: identity.email }));
    console.error(msg("agent-run.remediate.identity-invalid-hint", {}));
    return 3;
  }
  const { commits, error } = gatherRange();
  if (error) {
    console.error(msg("agent-run.remediate.gather-range-error", { error }));
    return 2;
  }
  const plan = buildPlan(branch, commits, identity);
  const changes = plan.commits.filter((c) => c.changed);
  if (!changes.length) {
    console.log("Nothing to rewrite. Commit metadata is already clean.");
    if (plan.branch) console.log(`(branch '${plan.branch.from}' still needs a rename: run \`modonome hygiene fix\`)`);
    return 0;
  }
  console.log(`Rewriting ${changes.length} commit(s) as ${identity.name} <${identity.email}> ...`);
  console.log(`Plan fingerprint: ${remediationFingerprint(plan)}`);
  const result = applyPlan(commits, plan);
  if (result.error) {
    console.error(msg("agent-run.remediate.apply-failed", { error: result.error }));
    return 2;
  }
  console.log("");
  console.log("Done. Every rewritten commit kept its original tree SHA (metadata-only).");
  console.log(`  ${result.savedHead.slice(0, 9)} (old head) -> ${result.newHead.slice(0, 9)} (new head)`);
  console.log(`Undo:  git reset --hard ${result.savedHead}`);
  console.log("Publish: git push --force-with-lease");
  if (plan.branch) console.log(`Branch '${plan.branch.from}' still needs a rename: run \`modonome hygiene fix\`.`);
  return 0;
}

function main(argv) {
  const sub = argv[0] || "plan";
  const rest = argv.slice(1);
  const root = flagValue(rest, "--root") ?? process.cwd();

  if (sub === "plan") return cmdPlan(rest);
  if (sub === "apply") return cmdApply(rest, root);
  const overrides = loadMessageOverrides(join(root, ".modonome"));
  console.error(formatMessage("agent-run.remediate.unknown-subcommand", { sub }, overrides).message);
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}

// Exported for tests: the arming posture, the target-identity resolver, and the pure
// plan builder. The applier itself is exercised end-to-end against a temp git repo.
export { armState, armingBlockers, buildPlan, targetIdentity, identityUsable, gatherRange };
