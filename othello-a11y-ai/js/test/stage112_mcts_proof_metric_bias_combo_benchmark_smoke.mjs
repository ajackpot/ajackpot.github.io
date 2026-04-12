import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage112-mcts-proof-metric-bias-'));
const outputJson = path.join(tempDir, 'proof-metric-bias-combo.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '383,41',
  '--time-ms', '280',
  '--proof-metric-modes', 'legacy-root,per-player',
  '--proof-priority-bias-modes', 'rank,pnmax',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage112 proof metric+bias combo benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage112 proof metric+bias combo benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-proof-priority-bias-mode-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [383, 41]);
assert.deepEqual(summary.options.proofMetricModes, ['legacy-root', 'per-player']);
assert.deepEqual(summary.options.proofPriorityBiasModes, ['rank', 'pnmax']);
assert.equal(summary.variants.length, 4);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 4);
assert.equal(summary.topline.positions, 2);

const firstScenario = summary.scenarios[0];
assert.ok(firstScenario.variants['legacy-root:rank']);
assert.ok(firstScenario.variants['legacy-root:pnmax']);
assert.ok(firstScenario.variants['per-player:rank']);
assert.ok(firstScenario.variants['per-player:pnmax']);
assert.equal(firstScenario.variants['legacy-root:rank'].proofMetricMode, 'legacy-root');
assert.equal(firstScenario.variants['legacy-root:rank'].proofPriorityBiasMode, 'rank');
assert.equal(firstScenario.variants['per-player:pnmax'].proofMetricMode, 'per-player');
assert.equal(firstScenario.variants['per-player:pnmax'].proofPriorityBiasMode, 'pnmax');

console.log('stage112 mcts proof metric+bias combo benchmark smoke passed');
