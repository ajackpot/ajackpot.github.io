import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { ACTIVE_EVALUATION_PROFILE } from '../ai/evaluation-profiles.js';
import { Evaluator } from '../ai/evaluator.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage73-mpc-suite-'));
const evaluator = new Evaluator({ evaluationProfile: ACTIVE_EVALUATION_PROFILE });

async function buildTinyCorpus(corpusPath) {
  const emptiesList = [28, 24];
  const lines = [];

  for (const empties of emptiesList) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      const target = evaluator.evaluate(state, state.currentPlayer);
      lines.push(JSON.stringify({
        black: state.black.toString(),
        white: state.white.toString(),
        currentPlayer: state.currentPlayer,
        target,
      }));
    }
  }

  await fs.writeFile(corpusPath, `${lines.join('\n')}\n`, 'utf8');
}

try {
  const corpusPath = path.join(tempDir, 'tiny-corpus.ndjson');
  const outputDir = path.join(tempDir, 'suite-output');
  const configPath = path.join(tempDir, 'suite-config.json');
  const suiteScript = path.join(repoRoot, 'tools/evaluator-training/run-mpc-candidate-training-suite.mjs');

  await buildTinyCorpus(corpusPath);
  await fs.writeFile(configPath, JSON.stringify({
    defaults: {
      calibrationBuckets: ['22-29:2>4'],
      sampleStride: 1,
      sampleResidue: 0,
      maxSamplesPerBucket: 15,
      holdoutMod: 5,
      holdoutResidue: 0,
      targetHoldoutCoverage: 0.95,
      targetHighHoldoutCoverage: 0.95,
      targetLowHoldoutCoverage: 0.9,
      timeLimitMs: 1500,
      progressEvery: 5,
      maxTableEntries: 50000,
      aspirationWindow: 20,
      zValues: [1, 1.5, 1.96],
      exportModule: true,
      benchmarks: {
        depth: {
          enabled: true,
          empties: [24],
          seedStart: 1,
          seedCount: 2,
          repetitions: 1,
          timeLimitMs: 300,
          maxDepth: 4,
          exactEndgameEmpties: 8,
          baselineMpcMode: 'off'
        },
        exact: {
          enabled: false
        }
      }
    },
    sharedProfiles: {
      evaluationProfileJson: 'active',
      moveOrderingProfileJson: 'active',
      tupleProfileJson: 'active',
      baselineMpcProfileJson: null
    },
    benchmarkBaseline: {
      evaluationProfileJson: 'active',
      moveOrderingProfileJson: 'active',
      tupleProfileJson: 'active',
      mpcProfileJson: null,
      mpcMode: 'off'
    },
    candidates: [
      {
        key: 'high-only',
        name: 'high only candidate',
        runtimeVariant: {
          defaultMode: 'high',
          maxDepthDistance: 1,
          maxTriesPerNode: 1,
          highResidualScale: 1.0,
          lowResidualScale: 1.0
        }
      },
      {
        key: 'both-softlow',
        name: 'both mode candidate',
        runtimeVariant: {
          defaultMode: 'both',
          maxDepthDistance: 1,
          maxTriesPerNode: 2,
          highResidualScale: 1.0,
          lowResidualScale: 0.9
        }
      }
    ]
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--input', corpusPath,
    '--output-dir', outputDir,
    '--config', configPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 32 });

  const summary = JSON.parse(await fs.readFile(path.join(outputDir, 'suite-summary.json'), 'utf8'));
  assert.equal(summary.candidates.length, 2);
  assert.equal(summary.failureCount, 0);
  assert.equal(summary.successCount, 2);

  const highOnlyDir = path.join(outputDir, 'candidates', 'high-only');
  const bothDir = path.join(outputDir, 'candidates', 'both-softlow');
  await fs.access(path.join(highOnlyDir, 'trained-mpc-profile.raw.json'));
  await fs.access(path.join(highOnlyDir, 'trained-mpc-profile.json'));
  await fs.access(path.join(highOnlyDir, 'learned-eval-profile.generated.js'));
  await fs.access(path.join(highOnlyDir, 'benchmarks', 'depth.benchmark.json'));
  await fs.access(path.join(bothDir, 'trained-mpc-profile.json'));
  await fs.access(path.join(bothDir, 'learned-eval-profile.generated.js'));

  const firstStatus = JSON.parse(await fs.readFile(path.join(bothDir, 'candidate-status.json'), 'utf8'));
  assert.equal(firstStatus.steps['calibrate-mpc-profile'].status, 'success');
  assert.equal(firstStatus.steps['make-mpc-runtime-variant'].status, 'success');
  assert.equal(firstStatus.steps['benchmark-depth-search-profile'].status, 'success');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--input', corpusPath,
    '--output-dir', outputDir,
    '--config', configPath,
    '--resume',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 32 });

  const resumedStatus = JSON.parse(await fs.readFile(path.join(bothDir, 'candidate-status.json'), 'utf8'));
  assert.equal(resumedStatus.steps['calibrate-mpc-profile'].status, 'success');
  assert.equal(resumedStatus.steps['calibrate-mpc-profile'].skipReason, 'resume-signature-match');
  assert.equal(resumedStatus.steps['benchmark-depth-search-profile'].skipReason, 'resume-signature-match');

  console.log('stage73 mpc candidate training suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
