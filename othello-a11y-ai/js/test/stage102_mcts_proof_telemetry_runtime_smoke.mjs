import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { createSeededRandom, playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';
import { formatMctsProofSummary } from '../ui/formatters.js';

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

const lateProofState = playSeededRandomUntilEmptyCount(10, 17);
const continuationOff = withBenchRandom(1707, () => createEngine({
  mctsExactContinuationEnabled: false,
  mctsExactContinuationExtraEmpties: 0,
}).findBestMove(lateProofState));
const continuationOffProof = continuationOff.mctsProofTelemetry;
assert.ok(continuationOffProof);
assert.equal(continuationOffProof.rootSolved, true);
assert.equal(continuationOffProof.rootSolvedExact, false);
assert.equal(continuationOffProof.proofStatus, 'wld-root');
assert.equal(continuationOffProof.rootInLateSolverWindow, true);
assert.equal(continuationOffProof.continuationEnabled, false);
assert.equal(continuationOffProof.continuationDepthEligible, false);
assert.equal(continuationOffProof.continuationApplied, false);
assert.ok(continuationOffProof.solvedMoveCount > 0);
assert.match(formatMctsProofSummary(continuationOff), /루트 WLD/);
assert.doesNotMatch(formatMctsProofSummary(continuationOff), /continuation 적용/);

const continuationOn = withBenchRandom(1707, () => createEngine().findBestMove(lateProofState));
const continuationOnProof = continuationOn.mctsProofTelemetry;
assert.ok(continuationOnProof);
assert.equal(continuationOnProof.rootSolved, true);
assert.equal(continuationOnProof.rootSolvedExact, true);
assert.equal(continuationOnProof.proofStatus, 'exact-root');
assert.equal(continuationOnProof.continuationEnabled, true);
assert.equal(continuationOnProof.continuationDepthEligible, true);
assert.equal(continuationOnProof.continuationAttempted, true);
assert.equal(continuationOnProof.continuationCompleted, true);
assert.equal(continuationOnProof.continuationApplied, true);
assert.equal(continuationOnProof.exactSolvedMoveCount, continuationOnProof.analyzedMoveCount);
assert.equal(continuationOnProof.unresolvedMoveCount, 0);
assert.equal(continuationOnProof.bestMoveSolvedExact, true);
assert.match(formatMctsProofSummary(continuationOn), /루트 exact/);
assert.match(formatMctsProofSummary(continuationOn), /continuation 적용/);

const outsideWindowState = playSeededRandomUntilEmptyCount(11, 31);
const outsideWindowResult = withBenchRandom(3107, () => createEngine().findBestMove(outsideWindowState));
const outsideWindowProof = outsideWindowResult.mctsProofTelemetry;
assert.ok(outsideWindowProof);
assert.equal(outsideWindowProof.rootInLateSolverWindow, false);
assert.equal(outsideWindowProof.continuationDepthEligible, false);
assert.equal(outsideWindowProof.continuationAttempted, false);
assert.ok(typeof formatMctsProofSummary(outsideWindowResult) === 'string');

console.log('stage102 mcts proof telemetry runtime smoke passed');
