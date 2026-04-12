import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage113-mcts-late-bias-package-'));
const outputJson = path.join(tempDir, 'late-bias-package.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-late-bias-package.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '383,41',
  '--time-ms', '200',
  '--package-thresholds', '200,240',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage113 late-bias package benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage113 late-bias package benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-late-bias-package-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [383, 41]);
assert.deepEqual(summary.options.packageThresholds, [200, 240]);
assert.equal(summary.variants.length, 3);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 3);
assert.equal(summary.topline.positions, 2);

const firstScenario = summary.scenarios[0];
assert.ok(firstScenario.variants.fixed);
assert.ok(firstScenario.variants['budget-conditioned:200']);
assert.ok(firstScenario.variants['budget-conditioned:240']);
assert.equal(firstScenario.variants.fixed.proofPriorityLateBiasActivated, false);
assert.equal(firstScenario.variants['budget-conditioned:200'].proofPriorityLateBiasPackageMode, 'budget-conditioned');
assert.equal(firstScenario.variants['budget-conditioned:200'].proofPriorityLateBiasThresholdMs, 200);
assert.equal(firstScenario.variants['budget-conditioned:200'].proofPriorityLateBiasActivated, true);
assert.equal(firstScenario.variants['budget-conditioned:240'].proofPriorityLateBiasThresholdMs, 240);
assert.equal(firstScenario.variants['budget-conditioned:240'].proofPriorityLateBiasActivated, false);
assert.equal(firstScenario.variants['budget-conditioned:200'].proofMetricMode, 'per-player');
assert.equal(firstScenario.variants['budget-conditioned:200'].proofPriorityBiasMode, 'pnmax');

console.log('stage113 mcts late-bias package benchmark smoke passed');
