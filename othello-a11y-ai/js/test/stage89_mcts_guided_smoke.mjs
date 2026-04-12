import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { GameState } from '../core/game-state.js';
import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../ai/search-algorithms.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function withMockedRandom(value, callback) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

const guidedEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'mcts-guided',
  maxDepth: 4,
  timeLimitMs: 200,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 40000,
});

const openingState = GameState.initial();
const openingLegalMoves = new Set(openingState.getLegalMoves().map((move) => move.coord));
const openingResult = withMockedRandom(0, () => guidedEngine.findBestMove(openingState));
assert.equal(openingResult.searchMode, 'mcts-guided', 'MCTS Guided mode should dispatch onto the dedicated guided root search lane outside the exact/WLD buckets.');
assert.equal(openingResult.searchCompletion, 'complete', 'MCTS Guided should treat its time-budgeted search as complete when at least one iteration finishes.');
assert.ok(openingLegalMoves.has(openingResult.bestMoveCoord), 'MCTS Guided must still return a legal root move.');
assert.ok(openingResult.stats.mctsIterations > 0, 'MCTS Guided should record at least one completed iteration on the opening position.');
assert.ok(openingResult.stats.mctsRollouts > 0, 'MCTS Guided should execute rollout playouts.');
assert.ok(openingResult.stats.mctsTreeNodes > 1, 'MCTS Guided should grow a tree beyond the root node.');
assert.ok(openingResult.stats.mctsCutoffEvaluations > 0, 'MCTS Guided should stop rollouts early and reuse the evaluator at the cutoff horizon.');
assert.ok(openingResult.stats.mctsGuidedPolicySelections > 0, 'MCTS Guided should perform guided selection/rollout policy choices instead of purely random playout decisions.');
assert.equal(openingResult.options.searchAlgorithm, 'mcts-guided', 'Result snapshots should preserve the active MCTS Guided algorithm choice.');
assert.ok(openingResult.analyzedMoves.every((move) => Number.isInteger(move.visits) && move.visits > 0), 'Each analyzed MCTS Guided root move should expose a positive visit count.');
assert.ok(openingResult.analyzedMoves.some((move) => Number.isFinite(move.priorReward)), 'MCTS Guided analyzed moves should surface the seeded prior reward that influenced expansion.');

const exactOverrideState = playSeededRandomUntilEmptyCount(8, 29);
const exactOverrideResult = withMockedRandom(0, () => guidedEngine.findBestMove(exactOverrideState));
assert.equal(exactOverrideResult.searchMode, 'exact-endgame', 'MCTS Guided should still defer to the existing exact endgame lane once the configured exact threshold is reached.');
assert.ok(exactOverrideResult.isExactResult, 'The exact override path should remain a true exact result even when the top-level algorithm is MCTS Guided.');
assert.equal(exactOverrideResult.options.searchAlgorithm, 'mcts-guided', 'Exact override results should still report the parent algorithm selection in their resolved options.');

assert.equal(normalizeSearchAlgorithm('mcts-guided'), 'mcts-guided', 'Known MCTS Guided algorithm keys should survive normalization unchanged.');
assert.equal(describeSearchAlgorithm('mcts-guided')?.key, 'mcts-guided', 'The MCTS Guided search-algorithm descriptor should be discoverable for UI rendering.');

console.log('stage89 mcts guided smoke passed');
