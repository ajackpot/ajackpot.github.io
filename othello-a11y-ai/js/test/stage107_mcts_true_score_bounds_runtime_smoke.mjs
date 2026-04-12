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
    mctsMaxIterations: 16,
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
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90_000,
    ...overrides,
  });
}

const drawState = playSeededRandomUntilEmptyCount(12, 15);

const offResult = withBenchRandom(1507, () => createEngine({
  mctsScoreBoundsEnabled: false,
  mctsScoreBoundDrawPriorityScale: 0,
}).findBestMove(drawState));

const onResult = withBenchRandom(1507, () => createEngine({
  mctsScoreBoundsEnabled: true,
  mctsScoreBoundDrawPriorityScale: 0,
}).findBestMove(drawState));

assert.ok((onResult.stats?.mctsScoreBoundUpdates ?? 0) > 0);
assert.ok((onResult.stats?.mctsScoreBoundDominatedChildrenSkipped ?? 0) > 0);
assert.ok((onResult.stats?.mctsScoreBoundTraversalFilteredNodes ?? 0) > 0);
assert.equal(onResult.stats?.mctsScoreBoundDominatedTraversalSelections ?? 0, 0);
assert.ok((onResult.stats?.mctsProofPriorityRankedChildren ?? 0) < (offResult.stats?.mctsProofPriorityRankedChildren ?? Infinity));
assert.match(formatMctsProofSummary(onResult), /bound cuts/);

console.log('stage107 mcts true score bounds runtime smoke passed');
