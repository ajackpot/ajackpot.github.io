import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage103-mcts-proof-priority-'));
const outputJson = path.join(tempDir, 'proof-priority.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-proof-priority.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '71',
  '--time-ms', '120',
  '--proof-priority-scale-list', '0.15',
  '--proof-priority-max-empties', '12',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage103 proof priority benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage103 proof priority benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-proof-priority-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [71]);
assert.equal(summary.variants.length, 2);
assert.equal(summary.scenarios.length, 1);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.topline.positions, 1);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.score)));
assert.ok(summary.scenarios.every((entry) => typeof entry.variants.off.proven === 'boolean'));
assert.ok(summary.scenarios.every((entry) => typeof entry.variants.scale_0_15.proven === 'boolean'));
assert.ok(summary.scenarios.every((entry) => entry.variants.scale_0_15.proofPriorityEnabled));
assert.ok(summary.scenarios.every((entry) => entry.variants.scale_0_15.mctsProofPrioritySelectionNodes > 0));
assert.ok(summary.topline.byLabel.scale_0_15.averageProofPrioritySelectionNodes > summary.topline.byLabel.off.averageProofPrioritySelectionNodes);

console.log('stage103 mcts proof priority benchmark smoke passed');
