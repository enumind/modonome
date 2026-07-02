/**
 * Reference copy for the "Key concepts" carousel on Overview. Every entry is grounded
 * in a real file in this repo: the body is a close paraphrase of that file's own
 * language, not invented copy, and the source link points at the exact file on the
 * default branch. This is background reference material for concepts that either have
 * no single live control (they span the whole engine, like the ratchet) or are
 * intentionally not editable from the panel (like the peer-key allowlist, which ADR-017
 * keeps CODEOWNERS-gated on purpose). Screens with a real lever link out to it instead
 * of repeating it here.
 */
import type { IconName } from "@modonome/design-system";

const REPO_BLOB = "https://github.com/enumind/modonome/blob/main";

export interface ConceptEntry {
  id: string;
  icon: IconName;
  label: string;
  tag: string;
  title: string;
  body: string;
  source: { label: string; href: string };
}

export const CONCEPTS: ConceptEntry[] = [
  {
    id: "governed-loop",
    icon: "refresh",
    label: "Governed autonomy loop",
    tag: "Core idea",
    title: "The governed autonomy loop",
    body: "Adopt the repo's own rules, propose small reviewable changes, and gate them in CI so a weakened test cannot merge. Off by default, dry-run first, and it adds no new platform or service.",
    source: { label: "README.md", href: `${REPO_BLOB}/README.md` },
  },
  {
    id: "activation-ladder",
    icon: "shield",
    label: "Activation ladder",
    tag: "Safety",
    title: "Disabled, dry-run, armed",
    body: "The engine only moves up the ladder when every prerequisite for the next rung holds. Autonomy, dry-run, and auto-merge levers live in the environment or CI, never in config.yaml alone, so editing the file can never arm the engine by itself.",
    source: { label: "prompts/modonome.core.md", href: `${REPO_BLOB}/prompts/modonome.core.md` },
  },
  {
    id: "maker-checker",
    icon: "users",
    label: "Maker, checker, merge authority",
    tag: "Separation of duties",
    title: "Three distinct identities",
    body: "Every change needs a maker that creates the diff, a checker that did not create it, and a merge authority that is not the maker. If only one identity or model is available, autonomous checking and merging are disabled and the change parks for review.",
    source: { label: "prompts/modules/roles.md", href: `${REPO_BLOB}/prompts/modules/roles.md` },
  },
  {
    id: "ratchet",
    icon: "ban",
    label: "Anti-gaming ratchet",
    tag: "Gate integrity",
    title: "A floor a change cannot talk past",
    body: "A CI script, outside the agent loop, rejects diffs that make gates pass by weakening them: removed assertions, added skips, loosened types, deleted tests. A clean ratchet is a floor, not proof the change is correct.",
    source: { label: "prompts/modules/gates.md", href: `${REPO_BLOB}/prompts/modules/gates.md` },
  },
  {
    id: "agentproof",
    icon: "check-circle",
    label: "AgentProof",
    tag: "Adversarial benchmark",
    title: "25 scenarios, executed against real enforcement",
    body: "Each scenario simulates a real attack on gate integrity (weakening a test, collapsing maker and checker into one identity, leaking raw code) and asserts the control catches it. A HARDENED score certifies gate integrity, not full end-to-end governance.",
    source: { label: "agentproof/README.md", href: `${REPO_BLOB}/agentproof/README.md` },
  },
  {
    id: "risk-tiers",
    icon: "activity",
    label: "Risk tiers",
    tag: "Routing",
    title: "Four tiers decide how much review a change needs",
    body: "Tier 1 is mechanical and test-fenced; Tier 2 is bounded and multi-file. Both can pass with a local maker and checker. Tier 3 touches public contracts or protected paths and needs owner or frontier review. Tier 4 is architecture or policy: owner decision only, never autonomous.",
    source: { label: "prompts/modules/roles.md", href: `${REPO_BLOB}/prompts/modules/roles.md` },
  },
  {
    id: "learning-promotion",
    icon: "spark",
    label: "Learning promotion",
    tag: "Self-improvement",
    title: "A lesson only binds once it becomes a gate",
    body: "Lessons are captured only from a real correction signal (a gate failure, a review fix, an incident) and staged with dated, evidence-backed entries. A lesson becomes a binding rule only when an owner promotes it into a deterministic gate, recorded with full traceability back to that signal.",
    source: { label: ".modonome/LEARNINGS.md", href: `${REPO_BLOB}/.modonome/LEARNINGS.md` },
  },
  {
    id: "network",
    icon: "branch",
    label: "Cross-repo knowledge network",
    tag: "Off by default",
    title: "Shares evidence, never becomes an authority",
    body: "Off and dry-run by default. Each repo's owners, gates, and protected paths stay final; the network shares the smallest useful abstraction (hashes, taxonomies, generalized lessons) instead of raw code, and imported patterns still need local gates and an independent checker before they count as adopted.",
    source: { label: "prompts/modules/network.md", href: `${REPO_BLOB}/prompts/modules/network.md` },
  },
  {
    id: "adoption",
    icon: "gauge",
    label: "Adoption pass",
    tag: "Onboarding",
    title: "Reads your repo before it proposes anything",
    body: "A read-only discovery pass: it detects your existing instructions, branch and merge rules, CI gates, and protected surfaces, then records the findings before anything is scaffolded or proposed. Run again after a major branch change.",
    source: { label: "prompts/modules/adoption.md", href: `${REPO_BLOB}/prompts/modules/adoption.md` },
  },
  {
    id: "specialist-roles",
    icon: "user",
    label: "Specialist roles",
    tag: "Beyond maker & checker",
    title: "Chief of staff, architect, steward, follower, and more",
    body: "Roles are logical responsibilities, not necessarily separate people: an architect decomposes ambiguous work into bounded packets, a follower watches for regressions after merge, a steward routes reuse and quality proposals, and a chief of staff keeps one owner-facing decision queue. Any can be a human, an agent, or a script.",
    source: { label: "prompts/modules/roles.md", href: `${REPO_BLOB}/prompts/modules/roles.md` },
  },
  {
    id: "compliance-evidence",
    icon: "book",
    label: "Compliance evidence",
    tag: "Enterprise",
    title: "An advisory map, not a certificate",
    body: "A read-only report maps observed facts about the repo to OpenSSF, SLSA, and NIST AI RMF criteria, generated on demand. It states what is met and what is a gap; it is evidence to bring to your own compliance process, not a claim of certification.",
    source: { label: "schemas/compliance-evidence.schema.json", href: `${REPO_BLOB}/schemas/compliance-evidence.schema.json` },
  },
  {
    id: "adrs",
    icon: "lock",
    label: "Governance hardening",
    tag: "32 ADRs",
    title: "Every safety claim traces to a decision record",
    body: "From claim atomicity to prompt-injection resistance to the CODEOWNERS-gated peer-key allowlist, each harder safety guarantee is backed by an architecture decision record and, where machine-checkable, a CI gate that enforces it.",
    source: { label: "docs/adr/", href: `${REPO_BLOB}/docs/adr` },
  },
];
