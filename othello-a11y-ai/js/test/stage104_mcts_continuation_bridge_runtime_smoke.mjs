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
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const bridgeState = playSeededRandomUntilEmptyCount(11, 31);
const legacyWindow = withBenchRandom(3107, () => createEngine({
  mctsExactContinuationExtraEmpties: 2,
}).findBestMove(bridgeState));
const legacyTelemetry = legacyWindow.mctsProofTelemetry;
assert.ok(legacyTelemetry);
assert.equal(legacyWindow.isExactResult, false);
assert.equal(legacyWindow.isWldResult, true);
assert.equal(legacyTelemetry.continuationDepthEligible, false);
assert.equal(legacyTelemetry.proofPriorityEnabled, true);
assert.equal(legacyTelemetry.proofPrioritySuppressedByContinuationWindow, false);
assert.match(formatMctsProofSummary(legacyWindow), /proof-priority x0.15/);

const bridgeEnabled = withBenchRandom(3107, () => createEngine().findBestMove(bridgeState));
const bridgeTelemetry = bridgeEnabled.mctsProofTelemetry;
assert.ok(bridgeTelemetry);
assert.equal(bridgeEnabled.isExactResult, true);
assert.equal(bridgeEnabled.isWldResult, false);
assert.equal(bridgeEnabled.mctsExactContinuationAttempted, true);
assert.equal(bridgeEnabled.mctsExactContinuationCompleted, true);
assert.equal(bridgeEnabled.mctsExactContinuationApplied, true);
assert.equal(bridgeTelemetry.continuationDepthEligible, true);
assert.equal(bridgeTelemetry.proofPriorityEnabled, false);
assert.equal(bridgeTelemetry.proofPrioritySuppressedByContinuationWindow, true);
assert.equal(bridgeEnabled.stats?.mctsProofPrioritySelectionNodes ?? 0, 0);
assert.equal(bridgeEnabled.stats?.mctsProofPriorityRankedChildren ?? 0, 0);
assert.match(formatMctsProofSummary(bridgeEnabled), /continuation 적용/);
assert.match(formatMctsProofSummary(bridgeEnabled), /proof→continuation handoff/);

const proofPriorityState = playSeededRandomUntilEmptyCount(12, 71);
const proofPriorityActive = withBenchRandom(7107, () => createEngine().findBestMove(proofPriorityState));
const proofPriorityTelemetry = proofPriorityActive.mctsProofTelemetry;
assert.ok(proofPriorityTelemetry);
assert.equal(proofPriorityTelemetry.continuationDepthEligible, false);
assert.equal(proofPriorityTelemetry.proofPriorityEnabled, true);
assert.equal(proofPriorityTelemetry.proofPrioritySuppressedByContinuationWindow, false);
assert.ok((proofPriorityActive.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.match(formatMctsProofSummary(proofPriorityActive), /proof-priority x0.15/);
assert.doesNotMatch(formatMctsProofSummary(proofPriorityActive), /proof→continuation handoff/);

console.log('stage104 mcts continuation bridge runtime smoke passed');
