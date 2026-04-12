import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage116-mcts-root-maturity-runtime-'));
const fixedOutputJson = path.join(tempDir, 'root-maturity-runtime-fixed.json');
const timeOutputJson = path.join(tempDir, 'root-maturity-runtime-time.json');

const fixedResult = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs'),
  '--repo-root', repoRoot,
  '--mode', 'fixed-iterations',
  '--empties-list', '12',
  '--seed-list', '123,167',
  '--iterations-list', '24',
  '--reference-time-ms', '3000',
  '--output-json', fixedOutputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(fixedResult.status, 0, fixedResult.stdout || fixedResult.stderr || 'stage116 fixed-iterations benchmark smoke failed');
assert.ok(fs.existsSync(fixedOutputJson), 'stage116 fixed-iterations benchmark smoke should emit a JSON summary');

const fixedSummary = JSON.parse(fs.readFileSync(fixedOutputJson, 'utf8'));
assert.equal(fixedSummary.type, 'mcts-root-maturity-gate-runtime-fixed-iterations-benchmark');
assert.equal(fixedSummary.options.mode, 'fixed-iterations');
assert.deepEqual(fixedSummary.options.emptiesList, [12]);
assert.deepEqual(fixedSummary.options.seedList, [123, 167]);
assert.deepEqual(fixedSummary.options.iterationsList, [24]);
assert.equal(fixedSummary.variants.length, 3);
assert.equal(fixedSummary.scenarios.length, 2);
assert.equal(fixedSummary.aggregates.length, 3);
assert.ok(fixedSummary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.exactScore)));
const fixedFirstScenario = fixedSummary.scenarios[0];
assert.equal(fixedFirstScenario.variants.base.proofMetricMode, 'legacy-root');
assert.equal(fixedFirstScenario.variants.base.proofPriorityBiasMode, 'rank');
assert.equal(fixedFirstScenario.variants.target.proofMetricMode, 'per-player');
assert.equal(fixedFirstScenario.variants.target.proofPriorityBiasMode, 'pnmax');
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateEnabled, true);
assert.equal(typeof fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateActivated, 'boolean');

const timeResult = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs'),
  '--repo-root', repoRoot,
  '--mode', 'time-budget',
  '--empties-list', '12',
  '--seed-list', '123,167',
  '--time-ms-list', '200',
  '--reference-time-ms', '3000',
  '--output-json', timeOutputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(timeResult.status, 0, timeResult.stdout || timeResult.stderr || 'stage116 time-budget benchmark smoke failed');
assert.ok(fs.existsSync(timeOutputJson), 'stage116 time-budget benchmark smoke should emit a JSON summary');

const timeSummary = JSON.parse(fs.readFileSync(timeOutputJson, 'utf8'));
assert.equal(timeSummary.type, 'mcts-root-maturity-gate-runtime-benchmark');
assert.equal(timeSummary.options.mode, 'time-budget');
assert.deepEqual(timeSummary.options.timeMsList, [200]);
assert.equal(timeSummary.variants.length, 3);
assert.equal(timeSummary.scenarios.length, 2);
const timeFirstScenario = timeSummary.scenarios[0];
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateEnabled, true);
assert.equal(typeof timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateFinalEligible, 'boolean');

console.log('stage116 mcts root-maturity gate runtime benchmark smoke passed');
