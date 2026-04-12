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
    mctsExactContinuationEnabled: false,
    mctsExactContinuationExtraEmpties: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const proofPriorityState = playSeededRandomUntilEmptyCount(12, 71);

const proofPriorityOff = withBenchRandom(7107, () => createEngine({
  mctsProofPriorityEnabled: false,
  mctsProofPriorityScale: 0,
  mctsProofPriorityMaxEmpties: 0,
}).findBestMove(proofPriorityState));
const proofPriorityOffTelemetry = proofPriorityOff.mctsProofTelemetry;
assert.ok(proofPriorityOffTelemetry);
assert.equal(proofPriorityOffTelemetry.proofPriorityEnabled, false);
assert.equal(proofPriorityOffTelemetry.proofPriorityDepthEligible, false);
assert.equal(proofPriorityOff.stats?.mctsProofPrioritySelectionNodes ?? 0, 0);
assert.equal(proofPriorityOff.stats?.mctsProofPriorityRankedChildren ?? 0, 0);
assert.doesNotMatch(formatMctsProofSummary(proofPriorityOff), /proof-priority/);

const proofPriorityOn = withBenchRandom(7107, () => createEngine().findBestMove(proofPriorityState));
const proofPriorityOnTelemetry = proofPriorityOn.mctsProofTelemetry;
assert.ok(proofPriorityOnTelemetry);
assert.equal(proofPriorityOnTelemetry.proofPriorityEnabled, true);
assert.equal(proofPriorityOnTelemetry.proofPriorityScale, 0.15);
assert.equal(proofPriorityOnTelemetry.proofPriorityMaxEmpties, 12);
assert.equal(proofPriorityOnTelemetry.proofPriorityDepthEligible, true);
assert.equal(proofPriorityOnTelemetry.proofPriorityMetric, 'proofNumber');
assert.ok(Number.isFinite(proofPriorityOnTelemetry.rootProofNumber));
assert.ok(Number.isFinite(proofPriorityOnTelemetry.rootDisproofNumber));
assert.ok(Number.isFinite(proofPriorityOnTelemetry.bestMoveProofRank));
assert.ok((proofPriorityOn.stats?.mctsProofPrioritySelectionNodes ?? 0) > 0);
assert.ok((proofPriorityOn.stats?.mctsProofPriorityRankedChildren ?? 0) > 0);
assert.ok((proofPriorityOn.stats?.mctsProofNumberUpdates ?? 0) > 0);
assert.ok(proofPriorityOn.analyzedMoves.some((move) => Number.isFinite(move?.pnRootRank)));
assert.match(formatMctsProofSummary(proofPriorityOn), /proof-priority x0.15/);
assert.match(formatMctsProofSummary(proofPriorityOn), /proof-rank/);

console.log('stage103 mcts proof priority runtime smoke passed');
