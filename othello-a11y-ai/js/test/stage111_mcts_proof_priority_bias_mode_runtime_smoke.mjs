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
    timeLimitMs: 280,
    maxDepth: 4,
    exactEndgameEmpties: 8,
    wldPreExactEmpties: 0,
    mctsSolverEnabled: true,
    mctsSolverWldEmpties: 2,
    mctsExactContinuationEnabled: true,
    mctsExactContinuationExtraEmpties: 3,
    mctsExactContinuationAdaptiveEnabled: true,
    mctsExactContinuationAdaptiveExtraEmpties: 1,
    mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
    mctsExactContinuationAdaptiveMaxLegalMoves: 0,
    mctsProofPriorityEnabled: true,
    mctsProofPriorityScale: 0.15,
    mctsProofPriorityMaxEmpties: 12,
    mctsProofPriorityContinuationHandoffEnabled: true,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const lossState = playSeededRandomUntilEmptyCount(12, 383);
const rankResult = withBenchRandom(38307, () => createEngine({
  mctsProofPriorityBiasMode: 'rank',
}).findBestMove(lossState));
const rankTelemetry = rankResult.mctsProofTelemetry;
assert.ok(rankTelemetry);
assert.equal(rankResult.isExactResult, true);
assert.equal(rankTelemetry.proofPriorityBiasMode, 'rank');
assert.equal(rankTelemetry.proofPriorityEnabled, true);
assert.ok((rankResult.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.match(formatMctsProofSummary(rankResult), /legacy proof-rank/);

const pnmaxResult = withBenchRandom(38307, () => createEngine({
  mctsProofPriorityBiasMode: 'pnmax',
}).findBestMove(lossState));
const pnmaxTelemetry = pnmaxResult.mctsProofTelemetry;
assert.ok(pnmaxTelemetry);
assert.equal(pnmaxResult.isExactResult, true);
assert.equal(pnmaxTelemetry.proofPriorityBiasMode, 'pnmax');
assert.equal(pnmaxTelemetry.proofPriorityEnabled, true);
assert.ok((pnmaxResult.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.match(formatMctsProofSummary(pnmaxResult), /pnmax/);

const pnsumResult = withBenchRandom(38307, () => createEngine({
  mctsProofPriorityBiasMode: 'pnsum',
}).findBestMove(lossState));
const pnsumTelemetry = pnsumResult.mctsProofTelemetry;
assert.ok(pnsumTelemetry);
assert.equal(pnsumResult.isExactResult, true);
assert.equal(pnsumTelemetry.proofPriorityBiasMode, 'pnsum');
assert.equal(pnsumTelemetry.proofPriorityEnabled, true);
assert.ok((pnsumResult.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.match(formatMctsProofSummary(pnsumResult), /pnsum/);

console.log('stage111 mcts proof-priority bias mode runtime smoke passed');
