import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Evaluator } from '../ai/evaluator.js';
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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage46-tuple-train-'));

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

function buildZeroEvaluationProfile(name = 'stage46-zero-eval') {
  return makeTrainingProfileFromWeights({
    name,
    description: 'stage46 zero evaluation profile',
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
  const corpusPath = path.join(tempDir, 'tuple-train-smoke.jsonl');
  const evaluationJsonPath = path.join(tempDir, 'zero-eval.json');
  const outputJsonPath = path.join(tempDir, 'trained-tuple.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');

  const zeroEvaluationProfile = buildZeroEvaluationProfile();
  const hiddenTupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage46-hidden-target',
    description: 'hidden tuple target for training smoke',
    layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        scale: 1,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple) => (
          Array.from({ length: tuple.tableSize }, (_, entryIndex) => {
            if (entryIndex === 4) {
              return 90;
            }
            if (entryIndex === 8) {
              return -90;
            }
            return 0;
          })
        )),
      },
    ],
  });
  const hiddenEvaluator = new Evaluator({
    evaluationProfile: zeroEvaluationProfile,
    tupleResidualProfile: hiddenTupleProfile,
  });
  const rng = mulberry32(46_777);
  const records = [];

  while (records.length < 320) {
    const targetEmpties = 13 + Math.floor(rng() * 7);
    const state = generateRandomState(targetEmpties, Math.floor(rng() * 1_000_000));
    const target = hiddenEvaluator.evaluate(state, state.currentPlayer);
    records.push(JSON.stringify({
      black: state.black.toString(),
      white: state.white.toString(),
      currentPlayer: state.currentPlayer,
      target,
    }));
  }

  await fs.writeFile(corpusPath, `${records.join('\n')}\n`, 'utf8');
  await fs.writeFile(evaluationJsonPath, JSON.stringify(zeroEvaluationProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/train-tuple-residual-profile.mjs'),
    '--input', corpusPath,
    '--evaluation-profile-json', evaluationJsonPath,
    '--layout-name', 'orthogonal-adjacent-pairs-outer2-v1',
    '--phase-buckets', 'late-a',
    '--holdout-mod', '5',
    '--sample-stride', '1',
    '--epochs', '4',
    '--learning-rate', '1.25',
    '--l2', '0',
    '--gradient-clip', '6000',
    '--min-visits', '1',
    '--progress-every', '0',
    '--name', 'stage46-trained-tuple-smoke',
    '--output-json', outputJsonPath,
    '--output-module', outputModulePath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 32,
  });

  const trainedProfile = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  const holdout = trainedProfile?.diagnostics?.holdoutSelected;
  assert.equal(trainedProfile.name, 'stage46-trained-tuple-smoke');
  assert.equal(trainedProfile.trainedBuckets.length, 1);
  assert.ok(Number.isFinite(holdout?.base?.mae) && holdout.base.mae > 0);
  assert.ok(Number.isFinite(holdout?.candidate?.mae) && holdout.candidate.mae >= 0);
  assert.ok(Number.isFinite(holdout?.delta?.mae) && holdout.delta.mae < 0, `expected negative MAE delta, got ${holdout?.delta?.mae}`);
  assert.ok(holdout.candidate.mae < holdout.base.mae * 0.8, `expected candidate MAE to improve meaningfully: base=${holdout.base.mae}, candidate=${holdout.candidate.mae}`);
  assert.ok((trainedProfile?.diagnostics?.weightStatsByBucket?.[0]?.nonZeroCount ?? 0) > 0);

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.name, 'stage46-trained-tuple-smoke');
  assert.equal(imported.default?.name, 'stage46-zero-eval');

  console.log('stage46 tuple residual training smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
