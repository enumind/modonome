import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectRepoFacts,
  mapToCriteria,
  summarize,
  buildEvidence,
  renderMarkdown,
} from '../scripts/build-compliance-evidence.mjs';

function makeRepo(spec) {
  const root = mkdtempSync(join(tmpdir(), 'modonome-compliance-'));
  for (const [path, content] of Object.entries(spec)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

test('detects present and absent facts', () => {
  const root = makeRepo({
    'LICENSE': 'MIT',
    'README.md': '# x',
    'SECURITY.md': 'report here',
    '.github/workflows/ci.yml': 'on: [push]\njobs: {}',
    '.github/dependabot.yml': 'version: 2',
  });
  try {
    const facts = detectRepoFacts(root);
    assert.equal(facts.license, 'LICENSE');
    assert.ok(facts.readme);
    assert.ok(facts.security);
    assert.ok(facts.dependabot);
    assert.ok(facts.hasCi);
    assert.equal(facts.contributing, null);
    assert.equal(facts.hasProvenance, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('detects provenance and scorecard from workflow contents', () => {
  const root = makeRepo({
    '.github/workflows/publish.yml': 'run: npm publish --provenance',
    '.github/workflows/scorecard.yml': 'uses: ossf/scorecard-action@v2',
  });
  try {
    const facts = detectRepoFacts(root);
    assert.equal(facts.hasProvenance, true);
    assert.equal(facts.hasScorecard, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('maps facts to criteria with met and gap statuses', () => {
  const facts = detectRepoFacts(makeRepoOnce());
  const criteria = mapToCriteria(facts);
  const license = criteria.find((x) => x.id === 'floss_license');
  assert.equal(license.status, 'met');
  const signed = criteria.find((x) => x.id === 'signed_releases');
  assert.equal(signed.status, 'gap');
  assert.ok(criteria.every((x) => ['openssf', 'slsa', 'nist-ai-rmf'].includes(x.framework)));
});

test('summary counts met and gap', () => {
  const s = summarize([{ status: 'met' }, { status: 'gap' }, { status: 'met' }]);
  assert.deepEqual(s, { met: 2, gap: 1, total: 3 });
});

test('buildEvidence produces a schema-shaped object and markdown', () => {
  const root = makeRepo({ 'LICENSE': 'MIT', 'README.md': '# x' });
  try {
    const ev = buildEvidence(root, '2026-06-30T00:00:00Z');
    assert.equal(ev.schema_version, 1);
    assert.ok(ev.generated_for.length > 0);
    assert.equal(ev.summary.total, ev.criteria.length);
    const md = renderMarkdown(ev);
    assert.match(md, /Compliance evidence/);
    assert.match(md, /floss_license/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Helper reused by the mapping test.
function makeRepoOnce() {
  return makeRepo({ 'LICENSE': 'MIT', 'README.md': '# x' });
}
