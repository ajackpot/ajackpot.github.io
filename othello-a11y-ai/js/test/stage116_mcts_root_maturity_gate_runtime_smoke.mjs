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
    mctsProofPriorityRootMaturityGateMode: 'best-metric-lte-1-or-solved-child',
    mctsProofPriorityRootMaturityGateMetricMode: 'per-player',
    mctsProofPriorityRootMaturityGateBiasMode: 'pnmax',
    mctsMaxIterations: 24,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const lateState = playSeededRandomUntilEmptyCount(12, 123);

const baselineResult = withBenchRandom(12307, () => createEngine({
  mctsProofPriorityRootMaturityGateEnabled: false,
}).findBestMove(lateState));
const baselineTelemetry = baselineResult.mctsProofTelemetry;
assert.ok(baselineTelemetry);
assert.equal(baselineTelemetry.proofPriorityRootMaturityGateEnabled, false);
assert.equal(baselineTelemetry.proofMetricMode, 'legacy-root');
assert.equal(baselineTelemetry.proofPriorityBiasMode, 'rank');

const gatedResult = withBenchRandom(12307, () => createEngine().findBestMove(lateState));
const gatedTelemetry = gatedResult.mctsProofTelemetry;
assert.ok(gatedTelemetry);
assert.equal(gatedTelemetry.proofPriorityRootMaturityGateEnabled, true);
assert.equal(gatedTelemetry.proofPriorityRootMaturityGateMode, 'best-metric-lte-1-or-solved-child');
assert.equal(gatedTelemetry.proofPriorityRootMaturityGateMetricMode, 'per-player');
assert.equal(gatedTelemetry.proofPriorityRootMaturityGateBiasMode, 'pnmax');
assert.equal(gatedTelemetry.proofPriorityRootMaturityGateActivated, true);
assert.equal(gatedTelemetry.proofMetricMode, 'per-player');
assert.equal(gatedTelemetry.proofPriorityBiasMode, 'pnmax');
assert.ok(Number.isFinite(gatedTelemetry.proofPriorityRootMaturityGateActivationIteration));
assert.ok((gatedResult.stats?.mctsProofPriorityRootMaturityGateChecks ?? 0) > 0);
assert.ok((gatedResult.stats?.mctsProofPriorityRootMaturityGateActivations ?? 0) > 0);
assert.match(formatMctsProofSummary(gatedResult), /root-gate/);

const resolvedOptionsLines = formatResolvedOptionsList(createEngine().options);
const proofPriorityLine = resolvedOptionsLines.find((entry) => entry.label === 'MCTS proof-priority');
assert.ok(proofPriorityLine);
assert.match(proofPriorityLine.value, /root-gate/);
assert.match(proofPriorityLine.value, /per-player\/pnmax/);

console.log('stage116 mcts root-maturity gate runtime smoke passed');
