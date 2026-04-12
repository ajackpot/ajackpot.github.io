import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage117-mcts-root-maturity-refinement-'));
const fixedOutputJson = path.join(tempDir, 'root-maturity-refinement-fixed.json');
const timeOutputJson = path.join(tempDir, 'root-maturity-refinement-time.json');

const commonArgs = [
  '--root-maturity-gate-mode', 'best-metric-threshold',
  '--root-maturity-gate-min-visits', '10',
  '--root-maturity-gate-best-metric-threshold', '3',
  '--root-maturity-gate-require-no-solved-child', 'true',
  '--root-maturity-gate-min-distinct-finite-metric-count', '4',
];

const fixedResult = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs'),
  '--repo-root', repoRoot,
  '--mode', 'fixed-iterations',
  '--empties-list', '12',
  '--seed-list', '123,149',
  '--iterations-list', '24',
  '--reference-time-ms', '3000',
  ...commonArgs,
  '--output-json', fixedOutputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(fixedResult.status, 0, fixedResult.stdout || fixedResult.stderr || 'stage117 fixed-iterations benchmark smoke failed');
assert.ok(fs.existsSync(fixedOutputJson), 'stage117 fixed-iterations benchmark smoke should emit a JSON summary');

const fixedSummary = JSON.parse(fs.readFileSync(fixedOutputJson, 'utf8'));
assert.equal(fixedSummary.type, 'mcts-root-maturity-gate-runtime-fixed-iterations-benchmark');
assert.equal(fixedSummary.options.mode, 'fixed-iterations');
assert.deepEqual(fixedSummary.options.emptiesList, [12]);
assert.deepEqual(fixedSummary.options.seedList, [123, 149]);
assert.deepEqual(fixedSummary.options.iterationsList, [24]);
assert.equal(fixedSummary.options.rootMaturityGateMode, 'best-metric-threshold');
assert.equal(fixedSummary.options.rootMaturityGateMinVisits, 10);
assert.equal(fixedSummary.options.rootMaturityGateBestFiniteMetricThreshold, 3);
assert.equal(fixedSummary.options.rootMaturityGateRequireNoSolvedChild, true);
assert.equal(fixedSummary.options.rootMaturityGateMinDistinctFiniteMetricCount, 4);
assert.equal(fixedSummary.variants.length, 3);
assert.equal(fixedSummary.scenarios.length, 2);
assert.equal(fixedSummary.aggregates.length, 3);
const fixedFirstScenario = fixedSummary.scenarios[0];
assert.equal(fixedFirstScenario.variants.base.proofMetricMode, 'legacy-root');
assert.equal(fixedFirstScenario.variants.target.proofMetricMode, 'per-player');
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateEnabled, true);
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateMode, 'best-metric-threshold');
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateMinVisits, 10);
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateBestFiniteMetricThreshold, 3);
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateRequireNoSolvedChild, true);
assert.equal(fixedFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateMinDistinctFiniteMetricCount, 4);
const fixedGateAggregate = fixedSummary.aggregates.find((entry) => entry.key === 'runtime-gate');
assert.ok(fixedGateAggregate);
assert.ok(fixedGateAggregate.gateActivatedCount > 0);

const timeResult = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs'),
  '--repo-root', repoRoot,
  '--mode', 'time-budget',
  '--empties-list', '12',
  '--seed-list', '123,149',
  '--time-ms-list', '200',
  '--reference-time-ms', '3000',
  ...commonArgs,
  '--output-json', timeOutputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(timeResult.status, 0, timeResult.stdout || timeResult.stderr || 'stage117 time-budget benchmark smoke failed');
assert.ok(fs.existsSync(timeOutputJson), 'stage117 time-budget benchmark smoke should emit a JSON summary');

const timeSummary = JSON.parse(fs.readFileSync(timeOutputJson, 'utf8'));
assert.equal(timeSummary.type, 'mcts-root-maturity-gate-runtime-benchmark');
assert.equal(timeSummary.options.mode, 'time-budget');
assert.deepEqual(timeSummary.options.timeMsList, [200]);
assert.equal(timeSummary.options.rootMaturityGateMode, 'best-metric-threshold');
assert.equal(timeSummary.options.rootMaturityGateMinVisits, 10);
assert.equal(timeSummary.options.rootMaturityGateBestFiniteMetricThreshold, 3);
assert.equal(timeSummary.options.rootMaturityGateRequireNoSolvedChild, true);
assert.equal(timeSummary.options.rootMaturityGateMinDistinctFiniteMetricCount, 4);
assert.equal(timeSummary.variants.length, 3);
assert.equal(timeSummary.scenarios.length, 2);
const timeFirstScenario = timeSummary.scenarios[0];
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateEnabled, true);
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateMode, 'best-metric-threshold');
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateMinVisits, 10);
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateBestFiniteMetricThreshold, 3);
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateRequireNoSolvedChild, true);
assert.equal(timeFirstScenario.variants['runtime-gate'].proofPriorityRootMaturityGateMinDistinctFiniteMetricCount, 4);
const timeGateAggregate = timeSummary.aggregates.find((entry) => entry.key === 'runtime-gate');
assert.ok(timeGateAggregate);
assert.ok(timeGateAggregate.gateActivatedCount > 0);

console.log('stage117 mcts root-maturity gate refinement benchmark smoke passed');
