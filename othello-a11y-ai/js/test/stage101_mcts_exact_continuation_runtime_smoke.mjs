import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { createSeededRandom, playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function withBenchRandom(seed, callback) {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function createEngine(overrides = {}) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: 'mcts-hybrid',
    timeLimitMs: 120,
    maxDepth: 4,
    exactEndgameEmpties: 8,
    wldPreExactEmpties: 0,
    mctsSolverEnabled: true,
    mctsSolverWldEmpties: 2,
    mctsExactContinuationEnabled: true,
    mctsExactContinuationExtraEmpties: 2,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

function createReferenceEngine(overrides = {}) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: 'classic',
    timeLimitMs: 4000,
    maxDepth: 4,
    exactEndgameEmpties: 20,
    wldPreExactEmpties: 0,
    mctsSolverEnabled: false,
    mctsSolverWldEmpties: 0,
    mctsExactContinuationEnabled: false,
    mctsExactContinuationExtraEmpties: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const lateProofState = playSeededRandomUntilEmptyCount(10, 17);
const exactReference = createReferenceEngine().findBestMove(lateProofState);
const continuationOff = withBenchRandom(1707, () => createEngine({
  mctsExactContinuationEnabled: false,
  mctsExactContinuationExtraEmpties: 0,
}).findBestMove(lateProofState));
const continuationOn = withBenchRandom(1707, () => createEngine().findBestMove(lateProofState));

assert.equal(continuationOff.searchMode, 'mcts-hybrid');
assert.equal(continuationOff.isExactResult, false);
assert.equal(continuationOff.isWldResult, true);
assert.equal(continuationOff.mctsRootSolvedOutcome, 'win');
assert.equal(continuationOff.mctsRootSolvedExact, false);
assert.equal(continuationOff.stats?.mctsExactContinuationRuns ?? 0, 0);
assert.equal(continuationOff.stats?.mctsExactContinuationCompletions ?? 0, 0);
assert.equal(continuationOff.stats?.mctsExactContinuationTimeouts ?? 0, 0);

assert.equal(continuationOn.searchMode, 'mcts-hybrid');
assert.equal(continuationOn.isExactResult, true);
assert.equal(continuationOn.isWldResult, false);
assert.equal(continuationOn.mctsRootSolvedOutcome, 'win');
assert.equal(continuationOn.mctsRootSolvedExact, true);
assert.equal(continuationOn.mctsExactContinuationAttempted, true);
assert.equal(continuationOn.mctsExactContinuationCompleted, true);
assert.equal(continuationOn.mctsExactContinuationApplied, true);
assert.ok((continuationOn.stats?.mctsExactContinuationRuns ?? 0) > 0);
assert.ok((continuationOn.stats?.mctsExactContinuationCompletions ?? 0) > 0);
assert.equal(continuationOn.stats?.mctsExactContinuationTimeouts ?? 0, 0);
assert.equal(continuationOn.score, exactReference.score);
assert.ok(continuationOn.analyzedMoves.every((move) => move.solvedExact === true));
assert.ok(continuationOn.analyzedMoves.every((move) => Number.isFinite(move.solvedScore)));

const outsideWindowState = playSeededRandomUntilEmptyCount(11, 31);
const outsideWindowResult = withBenchRandom(3107, () => createEngine().findBestMove(outsideWindowState));
assert.equal(outsideWindowResult.isExactResult, false);
assert.equal(outsideWindowResult.isWldResult, true);
assert.equal(outsideWindowResult.stats?.mctsExactContinuationRuns ?? 0, 0);
assert.equal(outsideWindowResult.stats?.mctsExactContinuationCompletions ?? 0, 0);
assert.equal(outsideWindowResult.stats?.mctsExactContinuationTimeouts ?? 0, 0);

console.log('stage101 mcts exact continuation runtime smoke passed');
