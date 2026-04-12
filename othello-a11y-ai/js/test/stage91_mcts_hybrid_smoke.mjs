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

const hybridEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'mcts-hybrid',
  maxDepth: 4,
  timeLimitMs: 240,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 40000,
});

const openingState = GameState.initial();
const openingLegalMoves = new Set(openingState.getLegalMoves().map((move) => move.coord));
const openingResult = withMockedRandom(0, () => hybridEngine.findBestMove(openingState));
assert.equal(openingResult.searchMode, 'mcts-hybrid', 'MCTS Hybrid mode should dispatch onto the dedicated hybrid root search lane outside the exact/WLD buckets.');
assert.equal(openingResult.searchCompletion, 'complete', 'MCTS Hybrid should treat its time-budgeted search as complete when at least one iteration finishes.');
assert.ok(openingLegalMoves.has(openingResult.bestMoveCoord), 'MCTS Hybrid must still return a legal root move.');
assert.ok(openingResult.stats.mctsIterations > 0, 'MCTS Hybrid should record at least one completed iteration on the opening position.');
assert.ok(openingResult.stats.mctsRollouts > 0, 'MCTS Hybrid should execute rollout playouts.');
assert.ok(openingResult.stats.mctsTreeNodes > 1, 'MCTS Hybrid should grow a tree beyond the root node.');
assert.ok(openingResult.stats.mctsCutoffEvaluations > 0, 'MCTS Hybrid should continue to reuse cutoff evaluator rollouts from the guided baseline.');
assert.ok(openingResult.stats.mctsGuidedPolicySelections > 0, 'MCTS Hybrid should still perform guided policy selections during expansion/rollout.');
assert.ok(openingResult.stats.mctsHybridPriorSearches > 0, 'MCTS Hybrid should run shallow minimax prior searches for expanded nodes.');
assert.ok(openingResult.stats.mctsHybridPriorUses > 0, 'MCTS Hybrid should apply the computed minimax priors to at least one expanded node.');
assert.equal(openingResult.options.searchAlgorithm, 'mcts-hybrid', 'Result snapshots should preserve the active MCTS Hybrid algorithm choice.');
assert.ok(openingResult.analyzedMoves.every((move) => Number.isInteger(move.visits) && move.visits > 0), 'Each analyzed MCTS Hybrid root move should expose a positive visit count.');
assert.ok(openingResult.analyzedMoves.some((move) => Number.isFinite(move.hybridPriorScore)), 'MCTS Hybrid analyzed moves should surface the shallow minimax prior score that influenced expansion.');

const exactOverrideState = playSeededRandomUntilEmptyCount(8, 41);
const exactOverrideResult = withMockedRandom(0, () => hybridEngine.findBestMove(exactOverrideState));
assert.equal(exactOverrideResult.searchMode, 'exact-endgame', 'MCTS Hybrid should still defer to the existing exact endgame lane once the configured exact threshold is reached.');
assert.ok(exactOverrideResult.isExactResult, 'The exact override path should remain a true exact result even when the top-level algorithm is MCTS Hybrid.');
assert.equal(exactOverrideResult.options.searchAlgorithm, 'mcts-hybrid', 'Exact override results should still report the parent algorithm selection in their resolved options.');

assert.equal(normalizeSearchAlgorithm('mcts-hybrid'), 'mcts-hybrid', 'Known MCTS Hybrid algorithm keys should survive normalization unchanged.');
assert.equal(describeSearchAlgorithm('mcts-hybrid')?.key, 'mcts-hybrid', 'The MCTS Hybrid search-algorithm descriptor should be discoverable for UI rendering.');

console.log('stage91 mcts hybrid smoke passed');
