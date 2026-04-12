import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { createSeededRandom, playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';
import { formatMctsProofSummary, formatResolvedOptionsList } from '../ui/formatters.js';

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
    timeLimitMs: 10000,
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
    mctsProofMetricMode: 'legacy-root',
    mctsProofPriorityBiasMode: 'rank',
    mctsProofPriorityRootMaturityGateEnabled: true,
    mctsProofPriorityRootMaturityGateMode: 'best-metric-threshold',
    mctsProofPriorityRootMaturityGateMetricMode: 'per-player',
    mctsProofPriorityRootMaturityGateBiasMode: 'pnmax',
    mctsProofPriorityRootMaturityGateMinVisits: 10,
    mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold: 3,
    mctsProofPriorityRootMaturityGateRequireNoSolvedChild: true,
    mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount: 4,
    mctsMaxIterations: 24,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const activatingState = playSeededRandomUntilEmptyCount(12, 149);
const baselineActivating = withBenchRandom(14907, () => createEngine({
  mctsProofPriorityRootMaturityGateEnabled: false,
}).findBestMove(activatingState));
const baselineActivatingTelemetry = baselineActivating.mctsProofTelemetry;
assert.ok(baselineActivatingTelemetry);
assert.equal(baselineActivatingTelemetry.proofPriorityRootMaturityGateEnabled, false);
assert.equal(baselineActivatingTelemetry.proofMetricMode, 'legacy-root');
assert.equal(baselineActivatingTelemetry.proofPriorityBiasMode, 'rank');

const refinedResult = withBenchRandom(14907, () => createEngine().findBestMove(activatingState));
const refinedTelemetry = refinedResult.mctsProofTelemetry;
assert.ok(refinedTelemetry);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateEnabled, true);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateMode, 'best-metric-threshold');
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateMetricMode, 'per-player');
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateBiasMode, 'pnmax');
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateMinVisits, 10);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateBestFiniteMetricThreshold, 3);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateRequireNoSolvedChild, true);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount, 4);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateActivated, true);
assert.equal(refinedTelemetry.proofMetricMode, 'per-player');
assert.equal(refinedTelemetry.proofPriorityBiasMode, 'pnmax');
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateActivationReason, 'best-metric-lte-3');
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateLastEvaluationReason, 'best-metric-lte-3');
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateLastBlockReason, null);
assert.equal(refinedTelemetry.proofPriorityRootMaturityGateFinalEligible, true);
assert.ok(Number.isFinite(refinedTelemetry.proofPriorityRootMaturityGateActivationIteration));
assert.ok((refinedResult.stats?.mctsProofPriorityRootMaturityGateChecks ?? 0) > 0);
assert.ok((refinedResult.stats?.mctsProofPriorityRootMaturityGateActivations ?? 0) > 0);
assert.match(formatMctsProofSummary(refinedResult), /metric≤3/);
assert.match(formatMctsProofSummary(refinedResult), /distinct≥4/);
assert.match(formatMctsProofSummary(refinedResult), /solved-child 없음/);

const blockedState = playSeededRandomUntilEmptyCount(12, 123);
const blockedResult = withBenchRandom(12307, () => createEngine().findBestMove(blockedState));
const blockedTelemetry = blockedResult.mctsProofTelemetry;
assert.ok(blockedTelemetry);
assert.equal(blockedTelemetry.proofPriorityRootMaturityGateActivated, false);
assert.equal(blockedTelemetry.proofMetricMode, 'legacy-root');
assert.equal(blockedTelemetry.proofPriorityBiasMode, 'rank');
assert.equal(blockedTelemetry.proofPriorityRootMaturityGateLastBlockReason, 'solved-child-present');

const resolvedOptionsLines = formatResolvedOptionsList(createEngine().options);
const proofPriorityLine = resolvedOptionsLines.find((entry) => entry.label === 'MCTS proof-priority');
assert.ok(proofPriorityLine);
assert.match(proofPriorityLine.value, /best-metric-threshold/);
assert.match(proofPriorityLine.value, /visits≥10/);
assert.match(proofPriorityLine.value, /metric≤3/);
assert.match(proofPriorityLine.value, /solved-child 없음/);
assert.match(proofPriorityLine.value, /distinct≥4/);
assert.match(proofPriorityLine.value, /per-player\/pnmax/);

console.log('stage117 mcts root-maturity gate refinement runtime smoke passed');
