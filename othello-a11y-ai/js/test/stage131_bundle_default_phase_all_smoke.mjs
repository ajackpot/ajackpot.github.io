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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage131-bundle-defaults-'));
const evaluator = new Evaluator({ evaluationProfile: ACTIVE_EVALUATION_PROFILE });

async function buildTinyCorpus(corpusPath) {
  const emptiesList = [30, 22, 16, 10];
  const lines = [];

  for (const empties of emptiesList) {
    for (let seed = 1; seed <= 3; seed += 1) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      lines.push(JSON.stringify({
        black: state.black.toString(),
        white: state.white.toString(),
        currentPlayer: state.currentPlayer,
        target: evaluator.evaluate(state, state.currentPlayer),
      }));
    }
  }

  await fs.writeFile(corpusPath, `${lines.join('\n')}\n`, 'utf8');
}

try {
  const corpusPath = path.join(tempDir, 'tiny-corpus.ndjson');
  await buildTinyCorpus(corpusPath);

  const stage130OutputRoot = path.join(tempDir, 'stage130-default-output');
  const stage130SuiteConfigPath = path.join(tempDir, 'stage130-suite-config.json');
  const stage130PatchConfigPath = path.join(tempDir, 'stage130-patch-config.json');
  const stage130BundleScript = path.join(repoRoot, 'tools/evaluator-training/run-stage130-evaluation-expansion-bundle.mjs');

  await fs.writeFile(stage130SuiteConfigPath, JSON.stringify({
    defaults: {
      lambda: 1000,
      limit: null,
      exportModule: true,
      benchmarks: {
        profile: { enabled: false },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    candidates: [
      {
        key: 'balanced12-control-hard',
        bucketFamily: 'balanced12',
        featureFamily: 'control',
        smoothing: 'hard',
      },
    ],
  }, null, 2), 'utf8');

  await fs.writeFile(stage130PatchConfigPath, JSON.stringify({
    defaults: {
      exportModule: true,
      benchmarks: {
        profile: { enabled: false },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    candidates: [
      {
        key: 'balanced12-control-hard-extras95',
        sourceCandidateKey: 'balanced12-control-hard',
        featureScales: { allOptional: 0.95 },
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    stage130BundleScript,
    '--input', corpusPath,
    '--output-root', stage130OutputRoot,
    '--eta-sample-limit', '16',
    '--suite-config', stage130SuiteConfigPath,
    '--patch-config', stage130PatchConfigPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const stage130Summary = JSON.parse(await fs.readFile(path.join(stage130OutputRoot, 'bundle-summary.json'), 'utf8'));
  assert.equal(stage130Summary.phase, 'all');
  assert.equal(stage130Summary.status, 'success');
  assert.equal(stage130Summary.steps.length, 3);
  assert.deepEqual(stage130Summary.stepResults.map((step) => step.status), ['success', 'success', 'success']);
  await fs.access(path.join(stage130OutputRoot, 'training-time-estimate.json'));
  await fs.access(path.join(stage130OutputRoot, 'evaluation-profile-suite', 'suite-summary.json'));
  await fs.access(path.join(stage130OutputRoot, 'evaluation-profile-patch', 'suite-summary.json'));

  const stage126OutputRoot = path.join(tempDir, 'stage126-default-output');
  const stage126SuiteConfigPath = path.join(tempDir, 'stage126-suite-config.json');
  const stage126PatchConfigPath = path.join(tempDir, 'stage126-patch-config.json');
  const stage126BundleScript = path.join(repoRoot, 'tools/evaluator-training/run-stage126-weight-learning-bundle.mjs');

  await fs.writeFile(stage126SuiteConfigPath, JSON.stringify({
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
        profile: { enabled: false },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    phaseTraining: {
      enabled: true,
      lambda: 1000,
    },
    candidates: [
      { key: 'diagonal-main', layoutName: 'diagonal-adjacent-pairs-full-v1' },
    ],
  }, null, 2), 'utf8');

  await fs.writeFile(stage126PatchConfigPath, JSON.stringify({
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
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    stage126BundleScript,
    '--input', corpusPath,
    '--output-root', stage126OutputRoot,
    '--eta-sample-limit', '16',
    '--suite-config', stage126SuiteConfigPath,
    '--patch-config', stage126PatchConfigPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const stage126Summary = JSON.parse(await fs.readFile(path.join(stage126OutputRoot, 'stage126-weight-learning-bundle-summary.json'), 'utf8'));
  assert.equal(stage126Summary.phase, 'all');
  assert.equal(stage126Summary.status, 'success');
  assert.equal(stage126Summary.steps.length, 3);
  assert.deepEqual(stage126Summary.steps.map((step) => step.status), ['success', 'success', 'success']);
  await fs.access(path.join(stage126OutputRoot, 'training-time-estimate.json'));
  await fs.access(path.join(stage126OutputRoot, 'tuple-family-suite', 'suite-summary.json'));
  await fs.access(path.join(stage126OutputRoot, 'tuple-patch-followup', 'suite-summary.json'));

  console.log('stage131 bundle default phase-all smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
