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
const baselineLoss = withBenchRandom(38307, () => createEngine({ mctsExactContinuationAdaptiveEnabled: false }).findBestMove(lossState));
const baselineLossTelemetry = baselineLoss.mctsProofTelemetry;
assert.ok(baselineLossTelemetry);
assert.equal(baselineLoss.isExactResult, false);
assert.equal(baselineLoss.isWldResult, true);
assert.equal(baselineLoss.mctsRootSolvedOutcome, 'loss');
assert.equal(baselineLoss.mctsExactContinuationApplied, undefined);
assert.equal(baselineLossTelemetry.continuationDepthEligible, false);
assert.equal(baselineLossTelemetry.adaptiveContinuationEligible, false);
assert.equal(baselineLossTelemetry.proofPriorityEnabled, true);
assert.ok((baselineLoss.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.doesNotMatch(formatMctsProofSummary(baselineLoss), /adaptive continuation/);

const adaptiveLoss = withBenchRandom(38307, () => createEngine({
  mctsExactContinuationAdaptiveEnabled: true,
  mctsExactContinuationAdaptiveExtraEmpties: 1,
  mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
  mctsExactContinuationAdaptiveMaxLegalMoves: 0,
}).findBestMove(lossState));
const adaptiveLossTelemetry = adaptiveLoss.mctsProofTelemetry;
assert.ok(adaptiveLossTelemetry);
assert.equal(adaptiveLoss.isExactResult, true);
assert.equal(adaptiveLoss.isWldResult, false);
assert.equal(adaptiveLoss.mctsRootSolvedOutcome, 'loss');
assert.equal(adaptiveLoss.mctsRootSolvedExact, true);
assert.equal(adaptiveLoss.mctsExactContinuationAttempted, true);
assert.equal(adaptiveLoss.mctsExactContinuationCompleted, true);
assert.equal(adaptiveLoss.mctsExactContinuationApplied, true);
assert.equal(adaptiveLoss.mctsExactContinuationAdaptiveTriggered, true);
assert.equal(adaptiveLossTelemetry.continuationDepthEligible, false);
assert.equal(adaptiveLossTelemetry.adaptiveContinuationDepthEligible, true);
assert.equal(adaptiveLossTelemetry.adaptiveContinuationOutcomeEligible, true);
assert.equal(adaptiveLossTelemetry.adaptiveContinuationEligible, true);
assert.equal(adaptiveLossTelemetry.adaptiveContinuationTriggered, true);
assert.equal(adaptiveLossTelemetry.proofPriorityEnabled, true);
assert.equal(adaptiveLossTelemetry.proofPrioritySuppressedByContinuationWindow, false);
assert.ok((adaptiveLoss.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.ok((adaptiveLoss.stats?.mctsExactContinuationAdaptiveRuns ?? 0) >= 1);
assert.ok((adaptiveLoss.stats?.mctsExactContinuationAdaptiveCompletions ?? 0) >= 1);
assert.match(formatMctsProofSummary(adaptiveLoss), /adaptive continuation 적용/);
assert.doesNotMatch(formatMctsProofSummary(adaptiveLoss), /proof→continuation handoff/);

const winState = playSeededRandomUntilEmptyCount(12, 41);
const adaptiveWin = withBenchRandom(4107, () => createEngine({
  mctsExactContinuationAdaptiveEnabled: true,
  mctsExactContinuationAdaptiveExtraEmpties: 1,
  mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
  mctsExactContinuationAdaptiveMaxLegalMoves: 0,
}).findBestMove(winState));
const adaptiveWinTelemetry = adaptiveWin.mctsProofTelemetry;
assert.ok(adaptiveWinTelemetry);
assert.equal(adaptiveWin.isExactResult, false);
assert.equal(adaptiveWin.isWldResult, true);
assert.equal(adaptiveWin.mctsRootSolvedOutcome, 'win');
assert.equal(adaptiveWin.mctsExactContinuationApplied, undefined);
assert.equal(adaptiveWinTelemetry.adaptiveContinuationDepthEligible, true);
assert.equal(adaptiveWinTelemetry.adaptiveContinuationOutcomeEligible, false);
assert.equal(adaptiveWinTelemetry.adaptiveContinuationEligible, false);
assert.equal(adaptiveWinTelemetry.adaptiveContinuationTriggered, false);
assert.equal(adaptiveWinTelemetry.proofPriorityEnabled, true);
assert.ok((adaptiveWin.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.doesNotMatch(formatMctsProofSummary(adaptiveWin), /adaptive continuation 적용/);

console.log('stage110 mcts adaptive continuation runtime smoke passed');
