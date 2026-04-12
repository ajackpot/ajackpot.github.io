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
    timeLimitMs: 10_000,
    mctsMaxIterations: 32,
    maxDepth: 4,
    exactEndgameEmpties: 8,
    wldPreExactEmpties: 0,
    mctsSolverEnabled: true,
    mctsSolverWldEmpties: 2,
    mctsExactContinuationEnabled: true,
    mctsExactContinuationExtraEmpties: 3,
    mctsProofPriorityEnabled: true,
    mctsProofPriorityScale: 0.15,
    mctsProofPriorityMaxEmpties: 12,
    mctsProofPriorityContinuationHandoffEnabled: true,
    mctsProofMetricMode: 'legacy-root',
    mctsScoreBoundsEnabled: true,
    mctsScoreBoundDrawPriorityScale: 0.35,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90_000,
    ...overrides,
  });
}

const state = playSeededRandomUntilEmptyCount(12, 167);
const legalMoveCount = state.getLegalMoves().length;

const firstResult = withBenchRandom(16707, () => createEngine().findBestMove(state));
const secondResult = withBenchRandom(16707, () => createEngine().findBestMove(state));

assert.ok(firstResult && typeof firstResult.bestMoveCoord === 'string');
assert.equal(firstResult.bestMoveCoord, secondResult.bestMoveCoord);
assert.equal(firstResult.score, secondResult.score);
assert.equal(firstResult.mctsProofTelemetry?.candidateMoveCount, legalMoveCount);
assert.equal(firstResult.mctsProofTelemetry?.legalMoveCount, legalMoveCount);
assert.ok(Array.isArray(firstResult.analyzedMoves) && firstResult.analyzedMoves.length > 0);
assert.deepEqual(
  firstResult.analyzedMoves.map((move) => move.coord),
  secondResult.analyzedMoves.map((move) => move.coord),
);
assert.ok(firstResult.analyzedMoves.every((move) => Number.isFinite(move.score)));
assert.ok(firstResult.analyzedMoves.every((move) => Number.isFinite(move.pnProofNumber)));
assert.ok(firstResult.analyzedMoves.every((move) => Number.isFinite(move.scoreLowerBound)));
assert.ok(firstResult.analyzedMoves.every((move) => Number.isFinite(move.scoreUpperBound)));
assert.ok(firstResult.analyzedMoves.every((move) => (move.scoreUpperBound - move.scoreLowerBound) >= 0));
assert.equal(firstResult.stats?.mctsScoreBoundDominatedTraversalSelections ?? 0, 0);
assert.ok((firstResult.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.ok((firstResult.stats?.mctsScoreBoundUpdates ?? 0) > 0);
assert.ok(typeof formatMctsProofSummary(firstResult) === 'string' && formatMctsProofSummary(firstResult).length > 0);

console.log('stage109 mcts refactor runtime smoke passed');
