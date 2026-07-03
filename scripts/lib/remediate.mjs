/**
 * remediate.mjs
 *
 * The PLAN half of Governed Remediation's armed remediator: pure, deterministic
 * decision logic that turns detected attribution signatures into a metadata-only
 * commit-rewrite plan. It performs no git mutation and no I/O. The CLI
 * (scripts/remediate.mjs) gathers commit data, feeds it here, and executes the
 * returned plan with git plumbing.
 *
 * "Metadata-only" is the load-bearing property. Every operation this planner emits
 * changes a commit's author or committer identity, or the text of its message, and
 * never its content. A commit-tree replay that reuses the original tree object is
 * therefore tree-SHA invariant by construction, and the applier verifies it. Content
 * redactions (pull request bodies, tracked files) are out of scope: they are remote
 * or working-tree edits, not local history metadata, so the applier reports them and
 * leaves them for the detection surfaces (hygiene check) and a human.
 *
 * This module imports the strict detector kernel (detect-attribution.mjs) and nothing
 * that mutates. The determinism boundary in check-gate-dag.mjs proves the reverse edge
 * never forms: no strict detector may import this remediator, so detection stays a
 * pure, side-effect-free, base-pinnable trust root.
 */

import { createHash } from "node:crypto";
import { AI_SIGNATURE_RE, isForbiddenIdentity } from "./detect-attribution.mjs";

/**
 * Remove every line carrying an AI-authorship signature from a commit message, then
 * drop the trailing blank lines the removal leaves behind. Pure and deterministic.
 *
 * Never returns an empty message: a git commit needs a message, so if stripping would
 * remove everything (a degenerate message that is nothing but a signature) the original
 * first line is kept. That case is pathological; the common case is a real subject and
 * body with an attribution trailer appended, where only the trailer lines are removed.
 */
export function cleanCommitMessage(message) {
  const text = String(message ?? "");
  const kept = text.split("\n").filter((line) => !AI_SIGNATURE_RE.test(line));
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  const cleaned = kept.join("\n");
  if (cleaned.trim() === "") {
    const firstLine = text.split("\n")[0] ?? "";
    return firstLine.trim() === "" ? text : firstLine;
  }
  return cleaned;
}

/**
 * Decide the metadata-only rewrite for each commit in a range. Input `commits` is the
 * range oldest-first, each { sha, an, ae, cn, ce, message }. `identity` is the target
 * { name, email } that replaces a forbidden author or committer.
 *
 * The decision is surgical: an author or committer is replaced only when it is a
 * forbidden agent or vendor identity (isForbiddenIdentity), a message is cleaned only
 * when it carries a signature, and everything else is preserved verbatim. `changed`
 * marks the commits the applier must rewrite; commits before the first changed one keep
 * their original SHAs, so a second run over already-clean history is a no-op.
 */
export function planCommitRewrites(commits, identity) {
  const target = { name: String(identity?.name ?? ""), email: String(identity?.email ?? "") };
  return commits.map((c) => {
    const authorForbidden = isForbiddenIdentity(c.an, c.ae);
    const committerForbidden = isForbiddenIdentity(c.cn, c.ce);
    const originalMessage = String(c.message ?? "");
    const newMessage = cleanCommitMessage(originalMessage);
    const author = authorForbidden ? { ...target } : { name: c.an, email: c.ae };
    const committer = committerForbidden ? { ...target } : { name: c.cn, email: c.ce };
    const reasons = [
      authorForbidden ? "forbidden-author" : null,
      committerForbidden ? "forbidden-committer" : null,
      newMessage !== originalMessage ? "ai-signature-in-message" : null,
    ].filter(Boolean);
    return { sha: c.sha, changed: reasons.length > 0, reasons, newMessage, author, committer };
  });
}

/**
 * A deterministic fingerprint of a rewrite plan. Same findings and target identity
 * produce the same plan and therefore the same fingerprint, which is what lets an owner
 * approve a proposal and later confirm the applier acted on exactly that proposal. The
 * fingerprint intentionally excludes commit SHAs, which change on every rewrite: it
 * covers only the decisions (per-commit reasons, target identity, cleaned message).
 */
export function remediationFingerprint(plan) {
  const decisions = (plan?.commits ?? []).map((c) => ({
    reasons: c.reasons ?? [],
    author: c.author ?? null,
    committer: c.committer ?? null,
    newMessage: c.newMessage ?? "",
  }));
  const canonical = JSON.stringify({ branch: plan?.branch ?? null, decisions });
  return "sha256:" + createHash("sha256").update(canonical).digest("hex");
}
