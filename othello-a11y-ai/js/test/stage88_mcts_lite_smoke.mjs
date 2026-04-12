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

const mctsEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'mcts-lite',
  maxDepth: 4,
  timeLimitMs: 200,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 40000,
});

const openingState = GameState.initial();
const openingLegalMoves = new Set(openingState.getLegalMoves().map((move) => move.coord));
const openingResult = withMockedRandom(0, () => mctsEngine.findBestMove(openingState));
assert.equal(openingResult.searchMode, 'mcts-lite', 'MCTS Lite mode should dispatch onto the dedicated root search lane outside the exact/WLD buckets.');
assert.equal(openingResult.searchCompletion, 'complete', 'MCTS Lite should treat its time-budgeted search as a complete search when at least one iteration finishes.');
assert.ok(openingLegalMoves.has(openingResult.bestMoveCoord), 'MCTS Lite must still return a legal root move.');
assert.ok(openingResult.stats.mctsIterations > 0, 'MCTS Lite should record at least one completed iteration on the opening position.');
assert.ok(openingResult.stats.mctsRollouts > 0, 'MCTS Lite should execute real rollout playouts.');
assert.ok(openingResult.stats.mctsTreeNodes > 1, 'MCTS Lite should grow a tree beyond the root node.');
assert.equal(openingResult.options.searchAlgorithm, 'mcts-lite', 'Result snapshots should preserve the active MCTS Lite algorithm choice.');
assert.ok(openingResult.analyzedMoves.every((move) => Number.isInteger(move.visits) && move.visits > 0), 'Each analyzed MCTS Lite root move should expose a positive visit count.');
assert.ok(
  (openingResult.analyzedMoves[0]?.visits ?? 0) >= (openingResult.analyzedMoves[openingResult.analyzedMoves.length - 1]?.visits ?? 0),
  'MCTS Lite analyzed moves should be sorted by root visit count.',
);

const exactOverrideState = playSeededRandomUntilEmptyCount(8, 17);
const exactOverrideResult = withMockedRandom(0, () => mctsEngine.findBestMove(exactOverrideState));
assert.equal(exactOverrideResult.searchMode, 'exact-endgame', 'MCTS Lite should still defer to the existing exact endgame lane once the configured exact threshold is reached.');
assert.ok(exactOverrideResult.isExactResult, 'The exact override path should remain a true exact result even when the top-level algorithm is MCTS Lite.');
assert.equal(exactOverrideResult.options.searchAlgorithm, 'mcts-lite', 'Exact override results should still report the parent algorithm selection in their resolved options.');

const invalidAlgorithmEngine = new SearchEngine({ searchAlgorithm: 'does-not-exist' });
assert.equal(invalidAlgorithmEngine.options.searchAlgorithm, 'classic', 'Unknown search algorithms should normalize back to the classic engine.');
assert.equal(normalizeSearchAlgorithm('mcts-lite'), 'mcts-lite', 'Known MCTS Lite algorithm keys should survive normalization unchanged.');
assert.equal(describeSearchAlgorithm('mcts-lite')?.key, 'mcts-lite', 'The MCTS Lite search-algorithm descriptor should be discoverable for UI rendering.');

console.log('stage88 mcts lite smoke passed');
