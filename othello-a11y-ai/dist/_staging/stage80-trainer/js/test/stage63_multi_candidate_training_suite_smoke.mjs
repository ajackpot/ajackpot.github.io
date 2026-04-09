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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage63-suite-'));
const evaluator = new Evaluator({ evaluationProfile: ACTIVE_EVALUATION_PROFILE });

async function buildTinyCorpus(corpusPath) {
  const emptiesList = [34, 30, 26, 22, 18, 14, 10, 6];
  const lines = [];

  for (const empties of emptiesList) {
    for (let seed = 1; seed <= 4; seed += 1) {
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
  const suiteScript = path.join(repoRoot, 'tools/evaluator-training/run-multi-candidate-training-suite.mjs');

  await buildTinyCorpus(corpusPath);
  await fs.writeFile(configPath, JSON.stringify({
    defaults: {
      phaseBuckets: ['midgame-c', 'late-a', 'late-b', 'endgame'],
      sampleStride: 1,
      sampleResidue: 0,
      epochs: 1,
      learningRate: 0.02,
      l2: 0.0001,
      gradientClip: 5000,
      minVisits: 1,
      calibration: {
        enabled: true,
        scope: 'selected-all',
        shrink: 1.0,
        maxBiasStones: 2.0,
      },
      exportModule: true,
      benchmarks: {
        profile: {
          enabled: true,
          limit: 64,
          benchmarkLoops: 1,
        },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    phaseTraining: {
      enabled: true,
      lambda: 1000,
    },
    sharedProfiles: {
      moveOrderingProfileJson: 'active',
      mpcProfileJson: 'active',
    },
    candidates: [
      {
        key: 'outer2',
        layoutName: 'orthogonal-adjacent-pairs-outer2-v1',
      },
      {
        key: 'diagonal',
        layoutName: 'diagonal-adjacent-pairs-full-v1',
      },
    ],
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

  const outer2Dir = path.join(outputDir, 'candidates', 'outer2');
  const diagonalDir = path.join(outputDir, 'candidates', 'diagonal');
  await fs.access(path.join(outputDir, 'shared', 'trained-evaluation-profile.json'));
  await fs.access(path.join(outer2Dir, 'trained-tuple-residual-profile.calibrated.json'));
  await fs.access(path.join(outer2Dir, 'learned-eval-profile.generated.js'));
  await fs.access(path.join(outer2Dir, 'benchmarks', 'profile.benchmark.json'));
  await fs.access(path.join(diagonalDir, 'trained-tuple-residual-profile.calibrated.json'));
  await fs.access(path.join(diagonalDir, 'learned-eval-profile.generated.js'));

  const firstStatus = JSON.parse(await fs.readFile(path.join(diagonalDir, 'candidate-status.json'), 'utf8'));
  assert.equal(firstStatus.steps['train-tuple-residual-profile'].status, 'success');
  assert.equal(firstStatus.steps['benchmark-profile'].status, 'success');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--input', corpusPath,
    '--output-dir', outputDir,
    '--config', configPath,
    '--resume',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 32 });

  const resumedStatus = JSON.parse(await fs.readFile(path.join(diagonalDir, 'candidate-status.json'), 'utf8'));
  assert.equal(resumedStatus.steps['train-tuple-residual-profile'].status, 'success');
  assert.equal(resumedStatus.steps['train-tuple-residual-profile'].skipReason, 'resume-signature-match');
  assert.equal(resumedStatus.steps['benchmark-profile'].skipReason, 'resume-signature-match');

  console.log('stage63 multi-candidate training suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
