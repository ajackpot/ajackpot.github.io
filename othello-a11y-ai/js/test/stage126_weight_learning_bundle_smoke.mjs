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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage126-weight-bundle-'));
const evaluator = new Evaluator({ evaluationProfile: ACTIVE_EVALUATION_PROFILE });

async function buildTinyCorpus(corpusPath) {
  const emptiesList = [22, 18, 14, 10, 6];
  const lines = [];

  for (const empties of emptiesList) {
    for (let seed = 1; seed <= 3; seed += 1) {
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
  const outputRoot = path.join(tempDir, 'stage126-bundle-output');
  const suiteConfigPath = path.join(tempDir, 'suite-config.json');
  const patchConfigPath = path.join(tempDir, 'patch-config.json');
  const bundleScript = path.join(repoRoot, 'tools/evaluator-training/run-stage126-weight-learning-bundle.mjs');

  await buildTinyCorpus(corpusPath);

  await fs.writeFile(suiteConfigPath, JSON.stringify({
    defaults: {
      phaseBuckets: ['late-a', 'late-b', 'endgame'],
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
        profile: { enabled: true, limit: 64, benchmarkLoops: 1 },
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
    benchmarkBaseline: {
      moveOrderingProfileJson: 'active',
      tupleProfileJson: 'active',
    },
    candidates: [
      { key: 'diagonal-main', layoutName: 'diagonal-adjacent-pairs-full-v1' },
      { key: 'orthogonal-control', layoutName: 'orthogonal-adjacent-pairs-full-v1' },
      { key: 'outer2-control', layoutName: 'orthogonal-adjacent-pairs-outer2-v1' },
    ],
  }, null, 2), 'utf8');

  await fs.writeFile(patchConfigPath, JSON.stringify({
    defaults: {
      calibration: { enabled: false },
      exportModule: true,
      benchmarks: {
        profile: { enabled: false },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    candidates: [
      {
        key: 'diagonal-top24-latea-endgame',
        sourceCandidateKey: 'diagonal-main',
        keepBuckets: ['late-a', 'endgame'],
        keepTopTuples: 24,
      },
      {
        key: 'outer2-top24-lateb-endgame',
        sourceCandidateKey: 'outer2-control',
        keepBuckets: ['late-b', 'endgame'],
        keepTopTuples: 24,
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    bundleScript,
    '--input', corpusPath,
    '--output-root', outputRoot,
    '--phase', 'all',
    '--eta-sample-limit', '64',
    '--suite-config', suiteConfigPath,
    '--patch-config', patchConfigPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const summaryPath = path.join(outputRoot, 'stage126-weight-learning-bundle-summary.json');
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  assert.equal(summary.tool, 'stage126_weight_learning_bundle');
  assert.equal(summary.status, 'success');
  assert.equal(summary.steps.length, 3);
  assert.deepEqual(summary.steps.map((step) => step.status), ['success', 'success', 'success']);

  await fs.access(path.join(outputRoot, 'training-time-estimate.json'));
  await fs.access(path.join(outputRoot, 'tuple-family-suite', 'suite-summary.json'));
  await fs.access(path.join(outputRoot, 'tuple-patch-followup', 'suite-summary.json'));
  await fs.access(path.join(outputRoot, 'tuple-family-suite', 'candidates', 'diagonal-main', 'trained-tuple-residual-profile.calibrated.json'));
  await fs.access(path.join(outputRoot, 'tuple-patch-followup', 'candidates', 'diagonal-top24-latea-endgame', 'trained-tuple-residual-profile.patched.json'));

  await execFileAsync(process.execPath, [
    bundleScript,
    '--input', corpusPath,
    '--output-root', outputRoot,
    '--phase', 'all',
    '--eta-sample-limit', '64',
    '--suite-config', suiteConfigPath,
    '--patch-config', patchConfigPath,
    '--resume',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const resumedStatus = JSON.parse(await fs.readFile(
    path.join(outputRoot, 'tuple-family-suite', 'candidates', 'diagonal-main', 'candidate-status.json'),
    'utf8',
  ));
  assert.equal(resumedStatus.steps['train-tuple-residual-profile'].skipReason, 'resume-signature-match');

  const resumedPatchStatus = JSON.parse(await fs.readFile(
    path.join(outputRoot, 'tuple-patch-followup', 'candidates', 'diagonal-top24-latea-endgame', 'candidate-status.json'),
    'utf8',
  ));
  assert.equal(resumedPatchStatus.steps['patch-tuple-residual-profile'].skipReason, 'resume-signature-match');

  console.log('stage126 weight learning bundle smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
