import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage110-mcts-adaptive-continuation-'));
const outputJson = path.join(tempDir, 'adaptive-continuation.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-adaptive-continuation.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '383,41',
  '--time-ms', '280',
  '--adaptive-outcome-mode-list', 'loss-only',
  '--adaptive-max-legal-moves-list', '0',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage110 adaptive continuation benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage110 adaptive continuation benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-adaptive-continuation-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [383, 41]);
assert.equal(summary.candidateVariants.length, 1);
assert.equal(summary.candidateVariants[0].label, 'adaptive-loss-only');
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 1);
assert.equal(summary.topline.positions, 2);

const lossScenario = summary.scenarios.find((entry) => entry.seed === 383);
const winScenario = summary.scenarios.find((entry) => entry.seed === 41);
assert.ok(lossScenario);
assert.ok(winScenario);
assert.equal(lossScenario.baseline.isExactResult, false);
assert.equal(lossScenario.candidates[0].isExactResult, true);
assert.equal(lossScenario.candidates[0].adaptiveContinuationTriggered, true);
assert.equal(winScenario.candidates[0].adaptiveContinuationTriggered, false);
assert.ok(summary.topline.candidates[0].exactBestHits >= summary.topline.baseline.exactBestHits);
assert.ok(summary.topline.candidates[0].wldAgreementCount >= summary.topline.baseline.wldAgreementCount);

console.log('stage110 mcts adaptive continuation benchmark smoke passed');
