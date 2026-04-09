import assert from 'node:assert/strict';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const baseOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 7,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 1600,
  randomness: 0,
};

const baselineEngine = new SearchEngine({
  ...baseOptions,
  etcInPlaceMovePreparation: false,
});
const candidateEngine = new SearchEngine({
  ...baseOptions,
  etcInPlaceMovePreparation: true,
});

assert.equal(baselineEngine.options.etcInPlaceMovePreparation, false, 'Baseline ETC toggle should remain disabled when requested.');
assert.equal(candidateEngine.options.etcInPlaceMovePreparation, true, 'Candidate ETC toggle should remain enabled by default.');

const sharedState = GameState.initial();
const sharedMoves = sharedState.getSearchMoves();
assert.ok(sharedMoves.length >= 2, 'The ETC cleanup smoke position should expose at least two legal moves.');

const failHighChild = sharedState.applyMoveFast(sharedMoves[0].index, sharedMoves[0].flips ?? null);
assert.ok(failHighChild, 'The first ETC smoke child should be legal.');
candidateEngine.storeTransposition(failHighChild, {
  depth: 2,
  value: -30000,
  flag: 'upper',
  bestMoveIndex: null,
});
const candidateFailHigh = candidateEngine.applyEnhancedTranspositionCutoff(
  sharedState,
  sharedMoves,
  3,
  -10000,
  10000,
  1,
  false,
);
assert.ok(candidateFailHigh, 'The candidate ETC helper should activate on the root-child regression.');
assert.equal(candidateFailHigh.cutoff, true, 'The candidate ETC helper should still allow conservative fail-high cutoffs.');
assert.equal(candidateFailHigh.bestMoveIndex, sharedMoves[0].index, 'The candidate ETC helper should preserve the proven fail-high move.');
assert.ok(
  sharedMoves.some((move) => move.orderingOutcome),
  'In-place ETC preparation should still annotate reusable ordering outcomes on the shared move records.',
);

const secondCandidateEngine = new SearchEngine({
  ...baseOptions,
  etcInPlaceMovePreparation: true,
});
const failLowChildValues = [20000, 15000, 18000, 22000];
for (let index = 0; index < sharedMoves.length; index += 1) {
  const child = sharedState.applyMoveFast(sharedMoves[index].index, sharedMoves[index].flips ?? null);
  assert.ok(child, 'Every shared ETC smoke child should stay legal.');
  secondCandidateEngine.storeTransposition(child, {
    depth: 2,
    value: failLowChildValues[index % failLowChildValues.length],
    flag: 'lower',
    bestMoveIndex: null,
  });
}
const candidateFailLow = secondCandidateEngine.applyEnhancedTranspositionCutoff(
  sharedState,
  sharedMoves,
  3,
  -10000,
  5000,
  1,
  false,
);
assert.ok(candidateFailLow, 'The candidate ETC helper should also activate on the fail-low regression.');
assert.equal(candidateFailLow.cutoff, true, 'The candidate ETC helper should preserve conservative fail-low pruning.');
assert.equal(candidateFailLow.score, -15000, 'Shared move reuse must not contaminate later engines with stale fail-high TT data.');
assert.equal(candidateFailLow.bestMoveIndex, null, 'A fail-low ETC cutoff should still report no best move.');

const searchState = playSeededRandomUntilEmptyCount(20, 23);
const baselineResult = baselineEngine.findBestMove(searchState);
const candidateResult = candidateEngine.findBestMove(searchState);

assert.ok(baselineResult.stats.etcNodes > 0, 'Baseline ETC cleanup benchmark search should still exercise ETC.');
assert.ok(candidateResult.stats.etcNodes > 0, 'Candidate ETC cleanup benchmark search should still exercise ETC as well.');
assert.equal(candidateResult.bestMoveIndex, baselineResult.bestMoveIndex, 'ETC move preparation cleanup should preserve the chosen move.');
assert.equal(candidateResult.score, baselineResult.score, 'ETC move preparation cleanup should preserve the root score.');
assert.deepEqual(candidateResult.principalVariation, baselineResult.principalVariation, 'ETC move preparation cleanup should preserve the principal variation on the smoke position.');

console.log('stage80 ETC hotpath cleanup smoke passed');
