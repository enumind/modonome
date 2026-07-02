#!/usr/bin/env node
// Compliance Evidence Engine. Reads a host repository and produces an evidence
// pack that maps observed facts to OpenSSF Best Practices, SLSA provenance, and
// NIST AI RMF criteria. Read-only and advisory: it generates a report and changes
// nothing about the repository or its autonomy posture. The point is that adopting
// modonome yields a starting compliance map for the repo it governs.
//
// Usage: node scripts/build-compliance-evidence.mjs <dir> [--json]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVIDENCE_SCHEMA_VERSION = 1;

function fileExists(root, ...candidates) {
  return candidates.find((c) => existsSync(join(root, c))) || null;
}

function readIfExists(root, rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function listWorkflows(root) {
  const dir = join(root, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
}

// Observe concrete facts about a repository. Pure with respect to its inputs: it
// only reads the filesystem under root and returns a plain object.
export function detectRepoFacts(root) {
  const workflows = listWorkflows(root);
  const workflowText = workflows.map((f) => readIfExists(root, join('.github', 'workflows', f))).join('\n');
  const pkg = readIfExists(root, 'package.json');

  return {
    name: basename(resolve(root)),
    license: fileExists(root, 'LICENSE', 'LICENSE.md', 'LICENSE.txt'),
    readme: fileExists(root, 'README.md', 'README'),
    security: fileExists(root, 'SECURITY.md', '.github/SECURITY.md'),
    contributing: fileExists(root, 'CONTRIBUTING.md', '.github/CONTRIBUTING.md'),
    codeOfConduct: fileExists(root, 'CODE_OF_CONDUCT.md', '.github/CODE_OF_CONDUCT.md'),
    codeowners: fileExists(root, '.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'),
    changelog: fileExists(root, 'CHANGELOG.md'),
    dependabot: fileExists(root, '.github/dependabot.yml', '.github/dependabot.yaml'),
    workflows,
    hasCi: workflows.length > 0,
    hasTests: existsSync(join(root, 'tests')) || existsSync(join(root, 'test')) || /"test"\s*:/.test(pkg),
    hasCoverageGate: /--experimental-test-coverage|c8|nyc|coverage/i.test(workflowText) || /--experimental-test-coverage|c8|nyc/.test(pkg),
    hasProvenance: /--provenance/.test(workflowText),
    hasScorecard: workflows.includes('scorecard.yml') || /ossf\/scorecard/.test(workflowText),
    hasStaticAnalysis: /codeql|semgrep|eslint/i.test(workflowText) || workflows.includes('codeql.yml'),
  };
}

// A criterion entry: a stable id, the framework and level, whether the observed
// facts satisfy it, and the evidence or remediation note.
function criterion(id, framework, level, met, evidence) {
  return { id, framework, level, status: met ? 'met' : 'gap', evidence };
}

// Map observed facts to criteria across the supported frameworks. Pure.
export function mapToCriteria(facts) {
  const c = [];
  // OpenSSF Best Practices, passing level.
  c.push(criterion('floss_license', 'openssf', 'passing', !!facts.license, facts.license || 'add an OSI license file'));
  c.push(criterion('documentation_basics', 'openssf', 'passing', !!facts.readme, facts.readme || 'add a README'));
  c.push(criterion('report_process', 'openssf', 'passing', !!facts.security, facts.security || 'add SECURITY.md with a private reporting channel'));
  c.push(criterion('contribution', 'openssf', 'passing', !!facts.contributing, facts.contributing || 'add CONTRIBUTING.md'));
  c.push(criterion('build_and_test', 'openssf', 'passing', facts.hasTests, facts.hasTests ? 'tests present' : 'add an automated test suite'));
  c.push(criterion('ci_tests', 'openssf', 'passing', facts.hasCi, facts.hasCi ? facts.workflows.join(', ') : 'add CI workflows'));
  c.push(criterion('static_analysis', 'openssf', 'passing', facts.hasStaticAnalysis, facts.hasStaticAnalysis ? 'static analysis workflow present' : 'add CodeQL or a static analyzer'));
  // Silver.
  c.push(criterion('code_of_conduct', 'openssf', 'silver', !!facts.codeOfConduct, facts.codeOfConduct || 'add CODE_OF_CONDUCT.md'));
  c.push(criterion('governance_codeowners', 'openssf', 'silver', !!facts.codeowners, facts.codeowners || 'add CODEOWNERS'));
  c.push(criterion('dependency_monitoring', 'openssf', 'silver', !!facts.dependabot, facts.dependabot || 'enable Dependabot or equivalent'));
  c.push(criterion('test_coverage', 'openssf', 'silver', facts.hasCoverageGate, facts.hasCoverageGate ? 'coverage measured in CI' : 'measure and gate coverage'));
  c.push(criterion('release_notes', 'openssf', 'silver', !!facts.changelog, facts.changelog || 'maintain a CHANGELOG'));
  // Gold.
  c.push(criterion('signed_releases', 'openssf', 'gold', facts.hasProvenance, facts.hasProvenance ? 'npm provenance in publish workflow' : 'sign releases or publish provenance'));
  // SLSA.
  c.push(criterion('provenance', 'slsa', 'build-l2', facts.hasProvenance, facts.hasProvenance ? 'provenance attestation generated' : 'generate build provenance'));
  // NIST AI RMF (lightweight governance signal).
  c.push(criterion('govern_documented', 'nist-ai-rmf', 'govern', !!facts.security && !!facts.codeowners, 'security policy and ownership documented'));
  c.push(criterion('manage_supply_chain', 'nist-ai-rmf', 'manage', !!facts.dependabot, facts.dependabot ? 'dependency monitoring active' : 'monitor dependencies'));
  return c;
}

export function summarize(criteria) {
  const met = criteria.filter((x) => x.status === 'met').length;
  return { met, gap: criteria.length - met, total: criteria.length };
}

export function buildEvidence(root, generatedAt) {
  const facts = detectRepoFacts(root);
  const criteria = mapToCriteria(facts);
  return {
    schema_version: EVIDENCE_SCHEMA_VERSION,
    generated_for: facts.name,
    generated_at: generatedAt,
    frameworks: ['openssf', 'slsa', 'nist-ai-rmf'],
    criteria,
    summary: summarize(criteria),
  };
}

export function renderMarkdown(evidence) {
  const lines = [];
  lines.push(`# Compliance evidence: ${evidence.generated_for}`);
  lines.push('');
  lines.push(`Generated by modonome. Read-only and advisory. Frameworks: ${evidence.frameworks.join(', ')}.`);
  lines.push('');
  lines.push(`Summary: ${evidence.summary.met} met, ${evidence.summary.gap} gaps, ${evidence.summary.total} total.`);
  lines.push('');
  lines.push('| Criterion | Framework | Level | Status | Evidence or remediation |');
  lines.push('| --------- | --------- | ----- | ------ | ----------------------- |');
  for (const x of evidence.criteria) {
    lines.push(`| ${x.id} | ${x.framework} | ${x.level} | ${x.status} | ${x.evidence} |`);
  }
  lines.push('');
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('-')) || '.';
  const asJson = args.includes('--json');
  const evidence = buildEvidence(dir, new Date().toISOString());
  if (asJson) {
    writeFileSync(join(dir, 'COMPLIANCE-EVIDENCE.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(`Wrote ${join(dir, 'COMPLIANCE-EVIDENCE.json')} (${evidence.summary.met}/${evidence.summary.total} met).`);
  } else {
    const md = renderMarkdown(evidence);
    writeFileSync(join(dir, 'COMPLIANCE-EVIDENCE.md'), md + '\n');
    console.log(`Wrote ${join(dir, 'COMPLIANCE-EVIDENCE.md')} (${evidence.summary.met}/${evidence.summary.total} met).`);
  }
}
