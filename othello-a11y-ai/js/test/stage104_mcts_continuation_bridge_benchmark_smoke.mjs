import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage104-mcts-continuation-bridge-'));
const outputJson = path.join(tempDir, 'continuation-bridge.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-continuation-bridge.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '11,12',
  '--seed-list', '17',
  '--time-ms', '120',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage104 continuation bridge benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage104 continuation bridge benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-continuation-bridge-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [11, 12]);
assert.deepEqual(summary.options.seedList, [17]);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.topline.positions, 2);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.score)));
assert.ok(summary.scenarios.some((entry) => entry.candidate.proofPrioritySuppressedByContinuationWindow));
assert.ok(summary.topline.candidate.exactResultCount >= summary.topline.baseline.exactResultCount);
assert.ok(summary.topline.candidate.exactBestHits >= summary.topline.baseline.exactBestHits);

console.log('stage104 mcts continuation bridge benchmark smoke passed');
