import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage105-mcts-proof-metric-'));
const outputJson = path.join(tempDir, 'proof-metric.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-proof-metric-mode.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '15,71',
  '--time-ms', '60',
  '--reference-time-ms', '3000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage105 proof metric benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage105 proof metric benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-proof-metric-mode-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [15, 71]);
assert.equal(summary.variants.length, 2);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.topline.positions, 2);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.exactScore)));
assert.ok(summary.scenarios.every((entry) => entry.variants.legacy_root.proofMetricMode === 'legacy-root'));
assert.ok(summary.scenarios.every((entry) => entry.variants.per_player.proofMetricMode === 'per-player'));
assert.ok(summary.scenarios.every((entry) => entry.variants.per_player.proofPriorityMetricMode === 'per-player'));
assert.ok(summary.scenarios.every((entry) => entry.variants.per_player.mctsGeneralizedProofNumberUpdates > 0));
assert.ok(Array.isArray(summary.aggregatesByReferenceOutcome));
assert.ok(summary.aggregatesByReferenceOutcome.some((bucket) => bucket.outcome === 'draw'));
assert.ok(summary.topline.byLabel.per_player.averageGeneralizedProofNumberUpdates > 0);

console.log('stage105 mcts generalized proof metric benchmark smoke passed');
