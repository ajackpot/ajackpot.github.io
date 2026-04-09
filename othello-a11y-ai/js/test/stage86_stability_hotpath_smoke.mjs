import assert from 'node:assert/strict';
import { Evaluator } from '../ai/evaluator.js';
import { createStateFromBitboards } from '../core/game-state.js';

const CASES = [
  {
    label: 'depth20_seed11_black',
    state: {
      black: '9820220080927155714',
      white: '361133620195039497',
      currentPlayer: 'black',
    },
    expected: {
      score: -101477,
      stability: -55.55555555555556,
      stableDiscs: 2,
      opponentStableDiscs: 7,
    },
  },
  {
    label: 'depth20_seed29_black',
    state: {
      black: '9246013318135680542',
      white: '8071730763877150977',
      currentPlayer: 'black',
    },
    expected: {
      score: 50328,
      stability: -66.66666666666667,
      stableDiscs: 1,
      opponentStableDiscs: 5,
    },
  },
  {
    label: 'depth18_seed1_black',
    state: {
      black: '9268327500919233792',
      white: '8079537164198092800',
      currentPlayer: 'black',
    },
    expected: {
      score: -35056,
      stability: 100,
      stableDiscs: 5,
      opponentStableDiscs: 0,
    },
  },
  {
    label: 'depth14_seed3_black',
    state: {
      black: '144700267591426276',
      white: '610778569895779336',
      currentPlayer: 'black',
    },
    expected: {
      score: 56844,
      stability: 100,
      stableDiscs: 6,
      opponentStableDiscs: 0,
    },
  },
];

const evaluator = new Evaluator();
for (const testCase of CASES) {
  const state = createStateFromBitboards(testCase.state);
  const score = evaluator.evaluate(state);
  const features = evaluator.explainFeatures(state);

  assert.equal(score, testCase.expected.score, `${testCase.label}: evaluator score should remain stable.`);
  assert.equal(features.stability, testCase.expected.stability, `${testCase.label}: stability feature should remain stable.`);
  assert.equal(features.stableDiscs, testCase.expected.stableDiscs, `${testCase.label}: player stable-disc count should remain stable.`);
  assert.equal(features.opponentStableDiscs, testCase.expected.opponentStableDiscs, `${testCase.label}: opponent stable-disc count should remain stable.`);
}

console.log('stage86 stability hotpath smoke passed');
