import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage111-mcts-proof-priority-bias-'));
const outputJson = path.join(tempDir, 'proof-priority-bias-mode.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '383,41',
  '--time-ms', '280',
  '--proof-priority-bias-modes', 'rank,pnmax,pnsum',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage111 proof-priority bias benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage111 proof-priority bias benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-proof-priority-bias-mode-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [383, 41]);
assert.deepEqual(summary.options.proofPriorityBiasModes, ['rank', 'pnmax', 'pnsum']);
assert.equal(summary.variants.length, 3);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 3);
assert.equal(summary.topline.positions, 2);
assert.ok(summary.scenarios.every((entry) => entry.variants.rank && entry.variants.pnmax && entry.variants.pnsum));
assert.equal(summary.scenarios[0].variants.rank.proofPriorityBiasMode, 'rank');
assert.equal(summary.scenarios[0].variants.pnmax.proofPriorityBiasMode, 'pnmax');
assert.equal(summary.scenarios[0].variants.pnsum.proofPriorityBiasMode, 'pnsum');

console.log('stage111 mcts proof-priority bias mode benchmark smoke passed');
