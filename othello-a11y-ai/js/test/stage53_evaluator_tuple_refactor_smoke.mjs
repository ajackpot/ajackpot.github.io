import assert from 'node:assert/strict';

import { Evaluator } from '../ai/evaluator.js';
import { GameState } from '../core/game-state.js';
import {
  DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  EVALUATION_FEATURE_KEYS,
  EVALUATION_PHASE_BUCKET_SPECS,
  makeTrainingProfileFromWeights,
  makeTupleResidualTrainingProfileFromWeights,
  resolveTupleResidualLayout,
  resolveTupleResidualProfile,
} from '../ai/evaluation-profiles.js';

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

function buildZeroEvaluationProfile(name = 'stage53-zero-eval') {
  return makeTrainingProfileFromWeights({
    name,
    description: 'stage53 zero evaluation profile',
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

const zeroEvaluationProfile = buildZeroEvaluationProfile();
const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
  name: 'stage53-refactor-profile',
  description: 'stage53 tuple refactor smoke profile',
  layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  patch: {
    type: 'unit-test',
    keepBuckets: ['late-a'],
    keepTopTuples: 2,
  },
  trainedBuckets: [
    {
      key: 'late-a-reversed-range',
      minEmpties: 19,
      maxEmpties: 13,
      scale: 1,
      bias: 333,
      tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple, tupleIndex) => (
        Array.from({ length: tuple.tableSize }, (_, entryIndex) => {
          if (tupleIndex === 0 && entryIndex === 4) {
            return 60;
          }
          if (tupleIndex === 1 && entryIndex === 8) {
            return -45;
          }
          return 0;
        })
      )),
    },
  ],
});

const resolvedProfile = resolveTupleResidualProfile(tupleProfile);
assert.deepEqual(resolvedProfile.patch, tupleProfile.patch);
assert.equal(resolvedProfile.trainedBuckets[0].minEmpties, 13);
assert.equal(resolvedProfile.trainedBuckets[0].maxEmpties, 19);

const rebuiltProfile = makeTupleResidualTrainingProfileFromWeights({
  ...resolvedProfile,
  layout: resolvedProfile.layout,
  trainedBuckets: resolvedProfile.trainedBuckets,
});
assert.deepEqual(rebuiltProfile.patch, tupleProfile.patch);
assert.equal(rebuiltProfile.trainedBuckets[0].minEmpties, 13);
assert.equal(rebuiltProfile.trainedBuckets[0].maxEmpties, 19);

const evaluator = new Evaluator({
  evaluationProfile: zeroEvaluationProfile,
  tupleResidualProfile: rebuiltProfile,
});

const state = generateRandomState(18, 53_018);
const currentColor = state.currentPlayer;
const opponentColor = state.getOpponentColor(currentColor);
const currentScore = evaluator.evaluate(state, currentColor);
const opponentScore = evaluator.evaluate(state, opponentColor);
const explanation = evaluator.explainFeatures(state, currentColor);

assert.equal(currentScore, -opponentScore);
assert.equal(currentScore, explanation.tupleResidualContribution);
assert.equal(explanation.tupleResidualContribution, explanation.tupleResidualTotalContribution);
assert.equal(explanation.tupleResidualSideToMoveContribution, explanation.tupleResidualSideToMoveTotalContribution);
assert.equal(
  explanation.tupleResidualEntries.reduce((sum, entry) => sum + entry.value, 0),
  explanation.tupleResidualSideToMovePatternContribution,
);
assert.equal(
  explanation.tupleResidualSideToMovePatternContribution + explanation.tupleResidualSideToMoveBiasContribution,
  explanation.tupleResidualSideToMoveTotalContribution,
);
assert.equal(
  explanation.tupleResidualPatternContribution + explanation.tupleResidualBiasContribution,
  explanation.tupleResidualTotalContribution,
);
assert.equal(explanation.tupleResidualBiasContribution, 333);
assert.equal(explanation.tupleResidualBucketKey, 'late-a-reversed-range');

assert.throws(() => resolveTupleResidualLayout({
  name: 'duplicate-key-layout',
  tuples: [
    { key: 'dup', squares: ['A1', 'B1'] },
    { key: 'dup', squares: ['C1', 'D1'] },
  ],
}), /Tuple layout keys must be unique/);

console.log('stage53_evaluator_tuple_refactor_smoke: ok');
