import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const server = join(here, '..', 'scripts', 'mcp-server.mjs');
const repoRoot = join(here, '..');

// Send requests to a fresh server process and resolve once every expected id has
// replied. The child is killed as soon as the responses arrive, which avoids the
// stdin-close race in batch mode.
function rpc(requests, expectedIds) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [server], { cwd: repoRoot });
    const got = new Map();
    let buf = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('mcp server did not reply in time'));
    }, 20000);
    child.stdout.on('data', (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        if (msg.id != null) got.set(msg.id, msg);
        if (expectedIds.every((id) => got.has(id))) {
          clearTimeout(timer);
          child.kill();
          resolve(got);
        }
      }
    });
    child.on('error', reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + '\n');
  });
}

test('tools/list advertises the compliance and attestation tools', async () => {
  const got = await rpc(
    [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ],
    [2]
  );
  const names = got.get(2).result.tools.map((t) => t.name);
  assert.ok(names.includes('modonome_compliance'));
  assert.ok(names.includes('modonome_verify_attestation'));
});

test('modonome_compliance returns an evidence pack', async () => {
  const got = await rpc(
    [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'modonome_compliance', arguments: { repo_path: repoRoot } } },
    ],
    [3]
  );
  const payload = JSON.parse(got.get(3).result.content[0].text);
  assert.equal(payload.schema_version, 1);
  assert.ok(payload.summary.total > 0);
  assert.ok(payload.criteria.some((c) => c.framework === 'openssf'));
});

test('modonome_verify_attestation returns a structured verdict', async () => {
  const got = await rpc(
    [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'modonome_verify_attestation',
          arguments: { packet: { schema_version: 1 }, peer_keys: { schema_version: 1, keys: [] } },
        },
      },
    ],
    [4]
  );
  const payload = JSON.parse(got.get(4).result.content[0].text);
  assert.equal(payload.ok, false);
  assert.equal(typeof payload.reason, 'string');
});
