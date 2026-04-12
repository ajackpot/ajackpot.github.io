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

const drawOffEngine = createEngine({
  mctsScoreBoundsEnabled: false,
  mctsScoreBoundDrawPriorityScale: 0,
});
const drawOffResult = withBenchRandom(1507, () => drawOffEngine.findBestMove(drawState));
const drawOffTelemetry = drawOffResult.mctsProofTelemetry;
assert.ok(drawOffTelemetry);
assert.equal(drawOffTelemetry.scoreBoundsEnabled, false);
assert.equal(drawOffResult.stats?.mctsScoreBoundUpdates ?? 0, 0);
assert.equal(drawOffResult.stats?.mctsScoreBoundDominatedChildrenSkipped ?? 0, 0);
assert.equal(drawOffTelemetry.rootScoreLowerBound, -640000);
assert.equal(drawOffTelemetry.rootScoreUpperBound, 640000);
assert.doesNotMatch(formatMctsProofSummary(drawOffResult), /score-bound/);

const drawOnEngine = createEngine({
  mctsScoreBoundsEnabled: true,
  mctsScoreBoundDrawPriorityScale: 0,
});
const drawOnResult = withBenchRandom(1507, () => drawOnEngine.findBestMove(drawState));
const drawOnTelemetry = drawOnResult.mctsProofTelemetry;
assert.ok(drawOnTelemetry);
assert.equal(drawOnTelemetry.scoreBoundsEnabled, true);
assert.equal(drawOnTelemetry.rootScoreLowerBound, 0);
assert.equal(drawOnTelemetry.rootScoreUpperBound, 640000);
assert.equal(drawOnTelemetry.bestMoveScoreLowerBound, 0);
assert.equal(drawOnTelemetry.bestMoveScoreUpperBound, 0);
assert.ok((drawOnResult.stats?.mctsScoreBoundUpdates ?? 0) > 0);
assert.ok((drawOnResult.stats?.mctsScoreBoundDominatedChildrenSkipped ?? 0) > 0);
assert.match(formatMctsProofSummary(drawOnResult), /score-bound/);
assert.match(formatMctsProofSummary(drawOnResult), /bound cuts/);

const lossState = playSeededRandomUntilEmptyCount(12, 89);
const lossOnResult = withBenchRandom(8907, () => createEngine({
  mctsScoreBoundsEnabled: true,
  mctsScoreBoundDrawPriorityScale: 0,
}).findBestMove(lossState));
const lossOnTelemetry = lossOnResult.mctsProofTelemetry;
assert.ok(lossOnTelemetry);
assert.equal(lossOnTelemetry.scoreBoundsEnabled, true);
assert.equal(lossOnResult.mctsRootSolvedOutcome, 'loss');
assert.equal(lossOnResult.isWldResult, true);
assert.equal(lossOnTelemetry.rootScoreLowerBound, -640000);
assert.equal(lossOnTelemetry.rootScoreUpperBound, -10000);
assert.match(formatMctsProofSummary(lossOnResult), /score-bound/);

const optionRows = formatResolvedOptionsList(drawOnEngine.options);
const scoreBoundsRow = optionRows.find((entry) => entry.label === 'MCTS score-bounds');
assert.deepEqual(scoreBoundsRow, { label: 'MCTS score-bounds', value: '활성' });

console.log('stage106 mcts score bounds runtime smoke passed');
