import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
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

function buildZeroEvaluationProfile(name = 'stage47-zero-eval') {
  return makeTrainingProfileFromWeights({
    name,
    description: 'stage47 zero evaluation profile',
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
  name: 'stage47-search-tuple',
  description: 'stage47 search engine tuple option smoke profile',
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
            return 80;
          }
          if (entryIndex === 8) {
            return -80;
          }
          return 0;
        })
      )),
    },
  ],
});

const state = generateRandomState(18, 47_018);
const baselineEngine = new SearchEngine({
  presetKey: 'custom',
  maxDepth: 1,
  timeLimitMs: 50,
  aspirationWindow: 0,
  randomness: 0,
  evaluationProfile: zeroEvaluationProfile,
  tupleResidualProfile: null,
});
const candidateEngine = new SearchEngine({
  presetKey: 'custom',
  maxDepth: 1,
  timeLimitMs: 50,
  aspirationWindow: 0,
  randomness: 0,
  evaluationProfile: zeroEvaluationProfile,
  tupleResidualProfile: tupleProfile,
});

const baselineScore = baselineEngine.evaluator.evaluate(state, state.currentPlayer);
const candidateScore = candidateEngine.evaluator.evaluate(state, state.currentPlayer);

assert.equal(baselineEngine.options.tupleResidualProfile, null);
assert.equal(candidateEngine.options.tupleResidualProfile, tupleProfile);
assert.equal(baselineScore, 0);
assert.notEqual(candidateScore, baselineScore);
assert.equal(candidateScore, candidateEngine.evaluator.explainFeatures(state, state.currentPlayer).tupleResidualContribution);

console.log('stage47 search engine tuple option smoke passed');
