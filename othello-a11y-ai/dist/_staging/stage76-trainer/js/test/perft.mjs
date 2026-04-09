import assert from 'node:assert/strict';
import { GameState } from '../core/game-state.js';

const EXPECTED_MODE1 = Object.freeze({
  1: 4,
  2: 12,
  3: 56,
  4: 244,
  5: 1396,
  6: 8200,
  7: 55092,
  8: 390216,
  9: 3005288,
});

function perft(state, depth) {
  if (depth === 0 || state.isTerminal()) {
    return 1;
  }

  const moves = state.getSearchMoves();
  if (moves.length === 0) {
    return perft(state.passTurnFast(), depth - 1);
  }

  let total = 0;
  for (const move of moves) {
    total += perft(state.applyMoveFast(move.index, move.flips ?? null), depth - 1);
  }
  return total;
}

function run(maxDepth) {
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const startedAt = Date.now();
    const actual = perft(GameState.initial(), depth);
    const elapsed = Date.now() - startedAt;
    const expected = EXPECTED_MODE1[depth];
    assert.equal(
      actual,
      expected,
      `Perft depth ${depth} mismatch: expected ${expected}, got ${actual}`,
    );
    console.log(`perft depth ${depth}: ${actual} (${elapsed}ms)`);
  }
}

const full = process.argv.includes('--full');
run(full ? 9 : 8);
console.log(`perft: all assertions passed (${full ? 'depth 9' : 'depth 8'})`);
