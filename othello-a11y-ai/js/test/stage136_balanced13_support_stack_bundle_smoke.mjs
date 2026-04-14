import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { Evaluator } from '../ai/evaluator.js';
import { ACTIVE_EVALUATION_PROFILE } from '../ai/evaluation-profiles.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage136-support-stack-'));
const evaluator = new Evaluator({ evaluationProfile: ACTIVE_EVALUATION_PROFILE });

async function buildTinyCorpus(corpusPath) {
  const emptiesList = [19, 18, 17, 16, 13, 12, 10, 8, 6];
  const lines = [];

  for (const empties of emptiesList) {
    for (let seed = 1; seed <= 2; seed += 1) {
      const state = playSeededRandomUntilEmptyCount(empties, seed + (empties * 100));
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
  const configPath = path.join(tempDir, 'stage136-smoke-config.json');
  const outputRoot = path.join(tempDir, 'stage136-bundle-output');
  const bundleScript = path.join(repoRoot, 'tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs');

  await buildTinyCorpus(corpusPath);
  await fs.writeFile(configPath, JSON.stringify({
    tuple: {
      phaseBuckets: ['late-b', 'endgame'],
      sampleStride: 1,
      sampleResidue: 0,
      epochs: 1,
      learningRate: 0.02,
      biasLearningRate: 0.02,
      l2: 0.0001,
      gradientClip: 5000,
      minVisits: 1,
      holdoutMod: 5,
      holdoutResidue: 0,
      progressEvery: 0,
    },
    tupleCalibration: {
      scope: 'selected-all',
      shrink: 1.0,
      maxBiasStones: 2.0,
      holdoutMod: 5,
      holdoutResidue: 0,
      progressEvery: 0,
    },
    moveOrdering: {
      childBuckets: ['11-12', '15-16'],
      sampleStride: 1,
      sampleResidue: 0,
      maxRootsPerBucket: 2,
      holdoutMod: 3,
      holdoutResidue: 0,
      lambda: 1000,
      progressEvery: 0,
      exactRootMaxEmpties: 12,
      exactRootTimeLimitMs: 2000,
      teacherDepth: 2,
      teacherTimeLimitMs: 600,
      teacherExactEndgameEmpties: 12,
      targetMode: 'root-mean',
      rootWeighting: 'uniform',
      exactRootWeightScale: 1.0,
    },
    mpc: {
      calibrationBuckets: ['18-19:2>3'],
      sampleStride: 1,
      sampleResidue: 0,
      maxSamplesPerBucket: 2,
      holdoutMod: 2,
      holdoutResidue: 0,
      targetHoldoutCoverage: 0.8,
      timeLimitMs: 1500,
      progressEvery: 0,
      maxTableEntries: 40000,
      aspirationWindow: 20,
      zValues: [1, 1.5],
    },
    runtime: {
      defaultMode: 'high',
      enableHighCut: true,
      enableLowCut: false,
      maxWindow: 1,
      maxChecksPerNode: 1,
      minDepth: 2,
      minDepthGap: 1,
      maxDepthDistance: 1,
      minPly: 1,
      intervalScale: 1.0,
      highScale: 0.93,
      lowScale: 1.0,
      depthDistanceScale: 1.25,
    },
    moduleFormat: 'compact',
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    bundleScript,
    '--input', corpusPath,
    '--output-root', outputRoot,
    '--config', configPath,
    '--phase', 'all',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 64,
  });

  const summaryPath = path.join(outputRoot, 'stage136-balanced13-support-stack-bundle-summary.json');
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  assert.equal(summary.tool, 'stage136_balanced13_support_stack_bundle');
  assert.equal(summary.status, 'success');
  assert.deepEqual(summary.steps.map((step) => step.status), ['success', 'success', 'success', 'success', 'success', 'success']);

  await fs.access(path.join(outputRoot, 'tuple', 'trained-tuple-residual-profile.calibrated.json'));
  await fs.access(path.join(outputRoot, 'move-ordering', 'trained-move-ordering-profile.json'));
  await fs.access(path.join(outputRoot, 'mpc', 'runtime-mpc-profile.json'));
  await fs.access(path.join(outputRoot, 'exported', 'learned-eval-profile.generated.js'));
  assert.ok((summary?.artifacts?.generatedModule?.outputModuleBytes ?? 0) > 0);

  await execFileAsync(process.execPath, [
    bundleScript,
    '--input', corpusPath,
    '--output-root', outputRoot,
    '--config', configPath,
    '--phase', 'all',
    '--resume',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 64,
  });

  const resumedSummary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  assert.ok(resumedSummary.steps.every((step) => step.status === 'skipped'));

  console.log('stage136 balanced13 support stack bundle smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
