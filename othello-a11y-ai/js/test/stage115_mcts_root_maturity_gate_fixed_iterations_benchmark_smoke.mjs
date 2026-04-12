import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage115-mcts-root-maturity-fixed-'));
const outputJson = path.join(tempDir, 'root-maturity-fixed-iterations.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-root-maturity-gate-fixed-iterations.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '123,167',
  '--iterations-list', '24',
  '--gate-modes', 'coverage-gte-0.75,best-move-solved,best-metric-lte-1,best-metric-lte-1-or-solved-child',
  '--reference-time-ms', '3000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage115 root-maturity fixed-iterations benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage115 root-maturity fixed-iterations benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-root-maturity-gate-fixed-iterations-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [123, 167]);
assert.deepEqual(summary.options.iterationsList, [24]);
assert.deepEqual(summary.options.gateModes, ['coverage-gte-0.75', 'best-move-solved', 'best-metric-lte-1', 'best-metric-lte-1-or-solved-child']);
assert.equal(summary.variants.length, 6);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 6);
assert.equal(summary.aggregatesByIteration.length, 1);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.exactScore)));

const firstScenario = summary.scenarios[0];
assert.equal(firstScenario.variants.base.proofMetricMode, 'legacy-root');
assert.equal(firstScenario.variants.base.proofPriorityBiasMode, 'rank');
assert.equal(firstScenario.variants.target.proofMetricMode, 'per-player');
assert.equal(firstScenario.variants.target.proofPriorityBiasMode, 'pnmax');
assert.ok(firstScenario.variants['gate:coverage-gte-0.75']);
assert.ok(firstScenario.variants['gate:best-move-solved']);
assert.ok(firstScenario.variants['gate:best-metric-lte-1']);
assert.ok(firstScenario.variants['gate:best-metric-lte-1-or-solved-child']);
assert.equal(typeof firstScenario.variants['gate:best-metric-lte-1'].gateActivated, 'boolean');
assert.ok(Number.isFinite(firstScenario.variants.base.maturity.finiteMetricCount));

console.log('stage115 mcts root-maturity gate fixed-iterations benchmark smoke passed');
