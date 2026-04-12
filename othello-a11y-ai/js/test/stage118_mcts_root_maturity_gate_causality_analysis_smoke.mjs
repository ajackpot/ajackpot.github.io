import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage118-root-gate-causality-'));
const benchmarkPath = path.join(tempDir, 'synthetic-root-gate-benchmark.json');
const outputJson = path.join(tempDir, 'causality-summary.json');

const syntheticBenchmark = {
  type: 'mcts-root-maturity-gate-runtime-benchmark',
  generatedAt: '2026-04-12T00:00:00.000Z',
  repoRoot: '.',
  options: {
    mode: 'time-budget',
  },
  scenarios: [
    {
      emptyCount: 12,
      seed: 101,
      timeLimitMs: 200,
      legalMoveCount: 5,
      variants: {
        base: {
          bestMoveCoord: 'A1',
          score: 0,
          proven: false,
          isExactResult: false,
          rootSolvedOutcome: null,
        },
        target: {
          bestMoveCoord: 'B2',
          score: 2,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'win',
        },
        'runtime-gate': {
          bestMoveCoord: 'B2',
          score: 2,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'win',
          proofPriorityRootMaturityGateActivated: true,
          proofPriorityRootMaturityGateActivationReason: 'best-metric-lte-3',
          proofPriorityRootMaturityGateActivationIteration: 12,
        },
      },
    },
    {
      emptyCount: 12,
      seed: 103,
      timeLimitMs: 280,
      legalMoveCount: 4,
      variants: {
        base: {
          bestMoveCoord: 'C3',
          score: -2,
          proven: true,
          isExactResult: false,
          rootSolvedOutcome: 'loss',
        },
        target: {
          bestMoveCoord: 'D4',
          score: 0,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'draw',
        },
        'runtime-gate': {
          bestMoveCoord: 'D4',
          score: 0,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'draw',
          proofPriorityRootMaturityGateActivated: false,
          proofPriorityRootMaturityGateActivationReason: null,
          proofPriorityRootMaturityGateActivationIteration: null,
        },
      },
    },
    {
      emptyCount: 12,
      seed: 107,
      timeLimitMs: 280,
      legalMoveCount: 6,
      variants: {
        base: {
          bestMoveCoord: 'E5',
          score: 4,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'win',
        },
        target: {
          bestMoveCoord: 'E5',
          score: 4,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'win',
        },
        'runtime-gate': {
          bestMoveCoord: 'E5',
          score: 4,
          proven: true,
          isExactResult: true,
          rootSolvedOutcome: 'win',
          proofPriorityRootMaturityGateActivated: true,
          proofPriorityRootMaturityGateActivationReason: 'best-metric-lte-3',
          proofPriorityRootMaturityGateActivationIteration: 10,
        },
      },
    },
  ],
};

fs.writeFileSync(benchmarkPath, `${JSON.stringify(syntheticBenchmark, null, 2)}\n`, 'utf8');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/analyze-mcts-root-maturity-gate-causality.mjs'),
  '--input-json-list', benchmarkPath,
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage118 root-maturity causality analysis smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage118 root-maturity causality analysis should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-root-maturity-gate-causality-analysis');
assert.equal(summary.perFile.length, 1);
assert.equal(summary.combined.scenarios, 3);
assert.equal(summary.combined.gateActivatedCount, 2);
assert.equal(summary.combined.baseVsTargetDiffCount, 2);
assert.equal(summary.combined.activationExplainsTargetShiftCount, 1);
assert.equal(summary.combined.targetShiftWithoutActivationCount, 1);
assert.equal(summary.combined.activationWithoutOutputChangeCount, 1);
assert.equal(summary.combined.activationExplainsTargetShiftRateAmongChanged, 0.5);
assert.equal(summary.combined.changedScenarioDetails.length, 2);

console.log('stage118 mcts root-maturity gate causality analysis smoke passed');
