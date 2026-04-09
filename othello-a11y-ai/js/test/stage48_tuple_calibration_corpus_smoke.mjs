import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { GameState } from '../core/game-state.js';
import {
  DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  EVALUATION_FEATURE_KEYS,
  EVALUATION_PHASE_BUCKET_SPECS,
  makeTrainingProfileFromWeights,
  makeTupleResidualTrainingProfileFromWeights,
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage48-calibrate-'));

function mulberry32(seed) {
  let cursor = seed >>> 0;
  return () => {
    cursor += 0x6D2B79F5;
    let value = cursor;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildZeroEvaluationProfile(name = 'stage48-zero-eval') {
  return makeTrainingProfileFromWeights({
    name,
    description: 'stage48 zero evaluation profile',
    phaseBuckets: EVALUATION_PHASE_BUCKET_SPECS.map((bucket) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: Object.fromEntries(EVALUATION_FEATURE_KEYS.map((featureKey) => [featureKey, 0])),
    })),
  });
}

function generateRandomState(targetEmpties, seed) {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const rng = mulberry32(seed + attempt);
    let state = GameState.initial();
    let safety = 0;

    while (state.getEmptyCount() > targetEmpties && safety < 256) {
      const moves = state.getLegalMoves();
      if (moves.length === 0) {
        if (state.consecutivePasses >= 1) {
          break;
        }
        state = state.passTurnFast();
        safety += 1;
        continue;
      }
      const choice = moves[Math.floor(rng() * moves.length)];
      state = state.applyMoveFast(choice.index, choice.flips);
      safety += 1;
    }

    if (state.getEmptyCount() === targetEmpties) {
      return state;
    }
  }

  throw new Error(`could not generate random state for empties=${targetEmpties}`);
}

try {
  const corpusPath = path.join(tempDir, 'tuple-calibration-smoke.jsonl');
  const evaluationJsonPath = path.join(tempDir, 'zero-eval.json');
  const tupleJsonPath = path.join(tempDir, 'tuple-before.json');
  const outputJsonPath = path.join(tempDir, 'tuple-after.json');

  const zeroEvaluationProfile = buildZeroEvaluationProfile();
  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage48-calibration-source',
    description: 'stage48 tuple calibration source profile',
    layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        scale: 1,
        bias: 0,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple) => (
          Array.from({ length: tuple.tableSize }, () => 0)
        )),
      },
    ],
    source: {
      targetScale: 3000,
      evaluationProfileName: zeroEvaluationProfile.name,
      holdoutMod: 5,
      holdoutResidue: 0,
    },
    diagnostics: {
      holdoutSelected: {
        candidate: { meanResidual: -1500, meanResidualInStones: -0.5 },
        delta: { maeInStones: -0.1 },
      },
      selectedAll: {
        candidate: { meanResidual: -1500, meanResidualInStones: -0.5 },
        delta: { maeInStones: -0.1 },
      },
      allSamples: {
        candidate: { meanResidual: -1500, meanResidualInStones: -0.5 },
        delta: { maeInStones: -0.1 },
      },
      byBucket: [
        {
          key: 'late-a',
          minEmpties: 13,
          maxEmpties: 19,
          holdout: {
            candidate: { meanResidual: -1500, meanResidualInStones: -0.5 },
            delta: { maeInStones: -0.1 },
          },
          all: {
            candidate: { meanResidual: -1500, meanResidualInStones: -0.5 },
            delta: { maeInStones: -0.1 },
          },
          weightStats: {
            totalWeights: 504,
            visitedWeights: 504,
            retainedWeights: 504,
            nonZeroCount: 0,
            meanAbsWeight: 0,
            maxAbsWeight: 0,
          },
        },
      ],
    },
  });

  const rng = mulberry32(48_999);
  const records = [];
  while (records.length < 320) {
    const targetEmpties = 13 + Math.floor(rng() * 7);
    const state = generateRandomState(targetEmpties, Math.floor(rng() * 1_000_000));
    records.push(JSON.stringify({
      black: state.black.toString(),
      white: state.white.toString(),
      currentPlayer: state.currentPlayer,
      target: 1500,
    }));
  }

  await fs.writeFile(corpusPath, `${records.join('\n')}\n`, 'utf8');
  await fs.writeFile(evaluationJsonPath, JSON.stringify(zeroEvaluationProfile, null, 2), 'utf8');
  await fs.writeFile(tupleJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/calibrate-tuple-residual-profile.mjs'),
    '--tuple-json', tupleJsonPath,
    '--corpus', corpusPath,
    '--evaluation-profile-json', evaluationJsonPath,
    '--progress-every', '0',
    '--output-json', outputJsonPath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 32,
  });

  const calibrated = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  const bucket = calibrated?.trainedBuckets?.[0] ?? null;
  const verified = calibrated?.calibration?.verifiedDiagnostics ?? null;
  assert.ok(Number.isFinite(bucket?.bias));
  assert.ok(Math.abs(bucket.bias - 1500) < 10, `expected calibrated bias near 1500, got ${bucket?.bias}`);
  assert.ok(verified);
  assert.ok(Math.abs(verified?.holdoutSelected?.candidate?.meanResidual ?? 0) < 1e-6);
  assert.ok((verified?.holdoutSelected?.delta?.mae ?? 0) <= 0);

  console.log('stage48 tuple calibration corpus smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
