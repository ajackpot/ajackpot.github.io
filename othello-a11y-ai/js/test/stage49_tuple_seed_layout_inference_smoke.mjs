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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage49-seed-layout-'));

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

function buildZeroEvaluationProfile(name = 'stage49-zero-eval') {
  return makeTrainingProfileFromWeights({
    name,
    description: 'stage49 zero evaluation profile',
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
  const corpusPath = path.join(tempDir, 'corpus.jsonl');
  const evaluationJsonPath = path.join(tempDir, 'zero-eval.json');
  const seedProfilePath = path.join(tempDir, 'seed-profile.json');
  const outputJsonPath = path.join(tempDir, 'trained-from-seed.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');

  const reducedLayout = {
    name: 'stage49-small-layout',
    description: 'stage49 reduced layout',
    tuples: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.slice(0, 4),
  };
  const seedProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage49-seed-profile',
    description: 'stage49 seed profile',
    layout: reducedLayout,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        bias: 300,
        tupleWeights: reducedLayout.tuples.map((tuple) => Array.from({ length: tuple.tableSize }, () => 0)),
      },
    ],
  });

  const zeroEvaluationProfile = buildZeroEvaluationProfile();
  const rng = mulberry32(49_123);
  const records = [];
  while (records.length < 80) {
    const targetEmpties = 13 + Math.floor(rng() * 7);
    const state = generateRandomState(targetEmpties, Math.floor(rng() * 1_000_000));
    records.push(JSON.stringify({
      black: state.black.toString(),
      white: state.white.toString(),
      currentPlayer: state.currentPlayer,
      target: 900,
    }));
  }

  await fs.writeFile(corpusPath, `${records.join('\n')}\n`, 'utf8');
  await fs.writeFile(evaluationJsonPath, JSON.stringify(zeroEvaluationProfile, null, 2), 'utf8');
  await fs.writeFile(seedProfilePath, JSON.stringify(seedProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/train-tuple-residual-profile.mjs'),
    '--input', corpusPath,
    '--evaluation-profile-json', evaluationJsonPath,
    '--seed-profile', seedProfilePath,
    '--phase-buckets', 'late-a',
    '--holdout-mod', '5',
    '--sample-stride', '1',
    '--epochs', '1',
    '--learning-rate', '0',
    '--bias-learning-rate', '2',
    '--l2', '0',
    '--gradient-clip', '5000',
    '--min-visits', '1',
    '--progress-every', '0',
    '--name', 'stage49-trained-from-seed-layout',
    '--output-json', outputJsonPath,
    '--output-module', outputModulePath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 32,
  });

  const trained = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  assert.equal(trained.layout.name, 'stage49-small-layout');
  assert.equal(trained.layout.tupleCount, 4);
  assert.equal(trained.trainedBuckets.length, 1);
  assert.equal(trained.trainedBuckets[0].tupleWeights.length, 4);

  console.log('stage49 tuple seed layout inference smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
