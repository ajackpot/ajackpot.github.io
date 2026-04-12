import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage114-mcts-late-bias-fixed-'));
const outputJson = path.join(tempDir, 'late-bias-fixed-iterations.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-late-bias-package-fixed-iterations.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '123,167',
  '--iterations-list', '16,24',
  '--reference-time-ms', '3000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage114 late-bias fixed-iterations benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage114 late-bias fixed-iterations benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-late-bias-package-fixed-iterations-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [123, 167]);
assert.deepEqual(summary.options.iterationsList, [16, 24]);
assert.equal(summary.variants.length, 2);
assert.equal(summary.scenarios.length, 4);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.aggregatesByIteration.length, 2);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.exactScore)));
const firstScenario = summary.scenarios[0];
assert.equal(firstScenario.variants.base.proofMetricMode, 'legacy-root');
assert.equal(firstScenario.variants.base.proofPriorityBiasMode, 'rank');
assert.equal(firstScenario.variants.target.proofMetricMode, 'per-player');
assert.equal(firstScenario.variants.target.proofPriorityBiasMode, 'pnmax');
assert.ok(Number.isFinite(firstScenario.variants.base.mctsIterations));
assert.ok(Number.isFinite(firstScenario.variants.target.mctsIterations));

console.log('stage114 mcts late-bias package fixed-iterations benchmark smoke passed');
