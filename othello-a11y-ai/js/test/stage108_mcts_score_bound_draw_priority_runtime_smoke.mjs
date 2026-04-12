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
    mctsMaxIterations: 24,
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
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90_000,
    ...overrides,
  });
}

const drawState = playSeededRandomUntilEmptyCount(12, 123);

const offResult = withBenchRandom(12307, () => createEngine({
  mctsScoreBoundDrawPriorityScale: 0,
}).findBestMove(drawState));

const onResult = withBenchRandom(12307, () => createEngine({
  mctsScoreBoundDrawPriorityScale: 0.5,
}).findBestMove(drawState));

assert.equal(offResult.isExactResult, false);
assert.equal(onResult.isExactResult, true);
assert.equal(onResult.score, 0);
assert.ok((onResult.stats?.mctsScoreBoundDrawPrioritySelectionNodes ?? 0) > 0);
assert.ok((onResult.stats?.mctsScoreBoundDrawPriorityBlockerChildren ?? 0) > 0);
assert.equal(onResult.stats?.mctsScoreBoundDominatedTraversalSelections ?? 0, 0);
assert.match(formatMctsProofSummary(onResult), /draw-blocker x0\.5/);

console.log('stage108 mcts score-bound draw priority runtime smoke passed');
