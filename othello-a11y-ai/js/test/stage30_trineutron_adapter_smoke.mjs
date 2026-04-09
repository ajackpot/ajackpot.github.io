import assert from 'node:assert/strict';

import { GameState } from '../core/game-state.js';
import { PLAYER_COLORS } from '../core/rules.js';
import { TrineutronEngine } from '../../tools/engine-match/opponents/trineutron-engine.mjs';

const engine = new TrineutronEngine({ timeLimitMs: 20, maxDepth: 12, noiseScale: 4, seed: 123 });

const initial = GameState.initial();
const initialResult = engine.findBestMove(initial);
assert.ok(Number.isInteger(initialResult.bestMoveIndex), 'Initial position should return a move.');
assert.ok(initial.isLegalMove(initialResult.bestMoveIndex), 'Returned move should be legal on the initial board.');
assert.equal(initial.currentPlayer, PLAYER_COLORS.BLACK, 'Initial side to move should be black.');

const afterBlackMove = initial.applyMove(initialResult.bestMoveIndex).state;
assert.equal(afterBlackMove.currentPlayer, PLAYER_COLORS.WHITE, 'After black move, white should move next.');
const whiteResult = engine.findBestMove(afterBlackMove, { seed: 456 });
assert.ok(Number.isInteger(whiteResult.bestMoveIndex), 'White position should also return a move.');
assert.ok(afterBlackMove.isLegalMove(whiteResult.bestMoveIndex), 'Returned move should be legal for white too.');

let current = initial;
let guard = 0;
while (!current.isTerminal() && guard < 16) {
  const legalMoves = current.getLegalMoves();
  if (legalMoves.length === 0) {
    current = current.passTurn();
    guard += 1;
    continue;
  }
  const result = engine.findBestMove(current, { seed: 1000 + guard });
  assert.ok(current.isLegalMove(result.bestMoveIndex), 'Every intermediate move should stay legal.');
  current = current.applyMove(result.bestMoveIndex).state;
  guard += 1;
}

console.log('stage30_trineutron_adapter_smoke: all assertions passed');
