#!/usr/bin/env node
// Updates site/repo-data.js with values derived from the source docs so the
// landing page fallback data stays current without manual editing.
// Reads: package.json, agentproof/README.md, README.md, ROADMAP.md
// Writes: site/repo-data.js (in-place replacements on known string keys only)
// Exits 0 whether or not anything changed; prints what changed.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const pkg = JSON.parse(read('package.json'));
const apReadme = read('agentproof/README.md');
const readme = read('README.md');
const roadmap = (() => {
  try { return read('ROADMAP.md'); } catch { return ''; }
})();

// Parse version from package.json (strip leading 'v' for display, add it back)
const rawVersion = pkg.version || '0.1.0-alpha';
const version = `v${rawVersion}`;

// Parse AgentProof score from agentproof/README.md - looks for "Score: N/16" or badge "N/16"
const scoreMatch = apReadme.match(/Score:\s*(\d+\/\d+)/i) ||
                   apReadme.match(/AgentProof[^`\n]*?(\d+\/\d+)/i) ||
                   readme.match(/AgentProof[^`\n]*?(\d+\/\d+)/i);
const agentproofScore = scoreMatch ? scoreMatch[1] : null;

// Parse level from agentproof/README.md - looks for "Level: HARDENED" or similar
const levelMatch = apReadme.match(/Level:\s*(HARDENED|PARTIAL|UNHARDENED)/i) ||
                   apReadme.match(/\b(HARDENED|PARTIAL|UNHARDENED)\b/);
const agentproofLevel = levelMatch ? levelMatch[1].toUpperCase() : null;

const repoData = read('site/repo-data.js');
let updated = repoData;

function replace(label, pattern, value) {
  if (!value) { console.log(`${label}: no value parsed, skipping`); return; }
  const current = pattern.exec(updated);
  if (!current) { console.log(`${label}: pattern not found, skipping`); return; }
  const currentValue = current[2] || current[1];
  if (currentValue === value) {
    console.log(`${label}: already '${value}', no change`);
    return;
  }
  updated = updated.replace(pattern, (_, pre, _val, post) => `${pre}${value}${post}`);
  console.log(`${label}: '${currentValue}' -> '${value}'`);
}

// Replace version: 'vX.Y.Z'
replace('version',
  /(version:\s*')([^']+)(')/,
  version
);

// Replace agentproofScore: 'N/16'
if (agentproofScore) {
  replace('agentproofScore',
    /(agentproofScore:\s*')([^']+)(')/,
    agentproofScore
  );
}

// Replace agentproofLevel: 'HARDENED'
if (agentproofLevel) {
  replace('agentproofLevel',
    /(agentproofLevel:\s*')([^']+)(')/,
    agentproofLevel
  );
}

if (updated !== repoData) {
  writeFileSync(join(root, 'site/repo-data.js'), updated, 'utf8');
  console.log('site/repo-data.js updated.');
} else {
  console.log('site/repo-data.js: nothing changed.');
}
