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
    mctsExactContinuationExtraEmpties: 3,
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

const proofPriorityState = playSeededRandomUntilEmptyCount(12, 71);

const legacyMetric = withBenchRandom(7107, () => createEngine({
  mctsProofMetricMode: 'legacy-root',
}).findBestMove(proofPriorityState));
const legacyTelemetry = legacyMetric.mctsProofTelemetry;
assert.ok(legacyTelemetry);
assert.equal(legacyTelemetry.proofMetricMode, 'legacy-root');
assert.equal(legacyTelemetry.proofPriorityMetricMode, 'legacy-root');
assert.equal(legacyTelemetry.proofPriorityMetricPlayer, null);
assert.ok(Number.isFinite(legacyTelemetry.rootProofNumber));
assert.ok(Number.isFinite(legacyTelemetry.rootDisproofNumber));
assert.ok(Number.isFinite(legacyTelemetry.rootBlackProofNumber));
assert.ok(Number.isFinite(legacyTelemetry.rootWhiteProofNumber));
assert.ok(Number.isFinite(legacyTelemetry.bestMoveProofNumber));
assert.ok(Number.isFinite(legacyTelemetry.bestMoveDisproofNumber));
assert.ok(Number.isFinite(legacyTelemetry.bestMoveBlackProofNumber));
assert.ok(Number.isFinite(legacyTelemetry.bestMoveWhiteProofNumber));
assert.ok(Number.isFinite(legacyTelemetry.bestMoveMetricProofNumber));
assert.ok((legacyMetric.stats?.mctsProofNumberUpdates ?? 0) > 0);
assert.ok((legacyMetric.stats?.mctsGeneralizedProofNumberUpdates ?? 0) > 0);
assert.match(formatMctsProofSummary(legacyMetric), /proof-priority x0.15/);
assert.match(formatMctsProofSummary(legacyMetric), /legacy/);
assert.match(formatMctsProofSummary(legacyMetric), /proof-rank|disproof-rank/);

const perPlayerMetric = withBenchRandom(7107, () => createEngine({
  mctsProofMetricMode: 'per-player',
}).findBestMove(proofPriorityState));
const perPlayerTelemetry = perPlayerMetric.mctsProofTelemetry;
assert.ok(perPlayerTelemetry);
assert.equal(perPlayerTelemetry.proofMetricMode, 'per-player');
assert.equal(perPlayerTelemetry.proofPriorityMetricMode, 'per-player');
assert.ok(['black', 'white'].includes(perPlayerTelemetry.proofPriorityMetricPlayer));
assert.ok(Number.isFinite(perPlayerTelemetry.rootBlackProofNumber));
assert.ok(Number.isFinite(perPlayerTelemetry.rootWhiteProofNumber));
assert.ok(Number.isFinite(perPlayerTelemetry.bestMoveBlackProofNumber));
assert.ok(Number.isFinite(perPlayerTelemetry.bestMoveWhiteProofNumber));
assert.ok(Number.isFinite(perPlayerTelemetry.bestMoveMetricProofNumber));
assert.equal(perPlayerTelemetry.bestMoveMetricMode, 'per-player');
assert.ok(['black', 'white'].includes(perPlayerTelemetry.bestMoveMetricPlayer));
assert.ok((perPlayerMetric.stats?.mctsProofNumberUpdates ?? 0) > 0);
assert.ok((perPlayerMetric.stats?.mctsGeneralizedProofNumberUpdates ?? 0) > 0);
assert.match(formatMctsProofSummary(perPlayerMetric), /proof-priority x0.15/);
assert.match(formatMctsProofSummary(perPlayerMetric), /per-player/);
assert.match(formatMctsProofSummary(perPlayerMetric), /흑|백/);

console.log('stage105 mcts generalized proof metric runtime smoke passed');
