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
    mctsProofMetricMode: 'legacy-root',
    mctsProofPriorityBiasMode: 'rank',
    mctsProofPriorityLateBiasPackageMode: 'budget-conditioned',
    mctsProofPriorityLateBiasThresholdMs: 240,
    mctsProofPriorityLateBiasMetricMode: 'per-player',
    mctsProofPriorityLateBiasBiasMode: 'pnmax',
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const lateState = playSeededRandomUntilEmptyCount(12, 383);

const underThresholdResult = withBenchRandom(38307, () => createEngine({ timeLimitMs: 160 }).findBestMove(lateState));
const underThresholdTelemetry = underThresholdResult.mctsProofTelemetry;
assert.ok(underThresholdTelemetry);
assert.equal(underThresholdTelemetry.proofPriorityLateBiasPackageMode, 'budget-conditioned');
assert.equal(underThresholdTelemetry.proofPriorityLateBiasThresholdMs, 240);
assert.equal(underThresholdTelemetry.proofPriorityLateBiasActivated, false);
assert.equal(underThresholdTelemetry.proofMetricMode, 'legacy-root');
assert.equal(underThresholdTelemetry.proofPriorityBiasMode, 'rank');
assert.ok((underThresholdResult.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);

const activatedResult = withBenchRandom(38307, () => createEngine({ timeLimitMs: 280 }).findBestMove(lateState));
const activatedTelemetry = activatedResult.mctsProofTelemetry;
assert.ok(activatedTelemetry);
assert.equal(activatedTelemetry.proofPriorityLateBiasPackageMode, 'budget-conditioned');
assert.equal(activatedTelemetry.proofPriorityLateBiasThresholdMs, 240);
assert.equal(activatedTelemetry.proofPriorityLateBiasMetricMode, 'per-player');
assert.equal(activatedTelemetry.proofPriorityLateBiasBiasMode, 'pnmax');
assert.equal(activatedTelemetry.proofPriorityLateBiasActivated, true);
assert.equal(activatedTelemetry.proofMetricMode, 'per-player');
assert.equal(activatedTelemetry.proofPriorityBiasMode, 'pnmax');
assert.ok((activatedResult.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.match(formatMctsProofSummary(activatedResult), /late-bias package/);

const resolvedOptionsLines = formatResolvedOptionsList(createEngine().options);
const proofPriorityLine = resolvedOptionsLines.find((entry) => entry.label === 'MCTS proof-priority');
assert.ok(proofPriorityLine);
assert.match(proofPriorityLine.value, /240ms/);
assert.match(proofPriorityLine.value, /per-player\/pnmax/);

console.log('stage113 mcts late-bias package runtime smoke passed');
