import assert from 'node:assert/strict';

import { Evaluator } from '../ai/evaluator.js';
import { GameState } from '../core/game-state.js';
import {
  DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  EVALUATION_FEATURE_KEYS,
  EVALUATION_PHASE_BUCKET_SPECS,
  makeTrainingProfileFromWeights,
  makeTupleResidualTrainingProfileFromWeights,
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

const zeroEvaluationProfile = buildZeroEvaluationProfile();
const state = generateRandomState(18, 46_018);
const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
  name: 'stage46-runtime-tuple',
  description: 'stage46 tuple runtime smoke profile',
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
            return 60;
          }
          if (entryIndex === 8) {
            return -60;
          }
          return 0;
        })
      )),
    },
  ],
});

const zeroEvaluator = new Evaluator({
  evaluationProfile: zeroEvaluationProfile,
  tupleResidualProfile: null,
});
const tupleEvaluator = new Evaluator({
  evaluationProfile: zeroEvaluationProfile,
  tupleResidualProfile: tupleProfile,
});

const currentColor = state.currentPlayer;
const opponentColor = state.getOpponentColor(currentColor);
const zeroCurrent = zeroEvaluator.evaluate(state, currentColor);
const zeroOpponent = zeroEvaluator.evaluate(state, opponentColor);
const tupleCurrent = tupleEvaluator.evaluate(state, currentColor);
const tupleOpponent = tupleEvaluator.evaluate(state, opponentColor);
const explanation = tupleEvaluator.explainFeatures(state, currentColor);

assert.equal(state.getEmptyCount(), 18);
assert.equal(zeroCurrent, 0);
assert.equal(zeroOpponent, 0);
assert.equal(tupleCurrent, -tupleOpponent);
assert.equal(tupleCurrent, explanation.tupleResidualContribution);
assert.equal(explanation.tupleResidualProfileName, 'stage46-runtime-tuple');
assert.equal(explanation.tupleResidualBucketKey, 'late-a');
assert.equal(explanation.tupleResidualEntries.length, DEFAULT_TUPLE_RESIDUAL_LAYOUT.tupleCount);
assert.equal(
  explanation.tupleResidualEntries.reduce((sum, entry) => sum + entry.value, 0),
  explanation.tupleResidualSideToMoveContribution,
);
assert.notEqual(tupleCurrent, 0);

console.log('stage46 tuple residual runtime smoke passed');
