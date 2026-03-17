import assert from 'node:assert/strict';
import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import { Evaluator } from '../ai/evaluator.js';

function coordinatesOfLegalMoves(state) {
  return state.getLegalMoves().map((move) => move.coord).sort();
}

function playDeterministicPly(state, plies) {
  let current = state;
  for (let ply = 0; ply < plies; ply += 1) {
    const legalMoves = current.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    if (legalMoves.length === 0) {
      current = current.passTurn();
      continue;
    }
    current = current.applyMove(legalMoves[0].index).state;
  }
  return current;
}

function runCoreRuleTests() {
  const initial = GameState.initial();
  const initialMoves = coordinatesOfLegalMoves(initial);
  assert.deepEqual(initialMoves, ['C4', 'D3', 'E6', 'F5']);

  const moveResult = initial.applyMove(initial.getLegalMoves().find((move) => move.coord === 'D3').index);
  assert.ok(moveResult, 'D3 should be legal for black from the initial position.');
  assert.equal(moveResult.move.coord, 'D3');
  assert.deepEqual(moveResult.move.flippedCoords, ['D4']);
  assert.equal(moveResult.state.currentPlayer, 'white');
}

function runEvaluatorTests() {
  const initial = GameState.initial();
  const evaluator = new Evaluator();
  const initialScore = evaluator.evaluate(initial);
  assert.ok(Number.isFinite(initialScore));

  const progressed = playDeterministicPly(initial, 12);
  const progressedScore = evaluator.evaluate(progressed);
  assert.ok(Number.isFinite(progressedScore));
  assert.notEqual(progressedScore, initialScore, 'A changed position should usually change the evaluation.');
}

function runSearchTests() {
  const engine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 4,
    timeLimitMs: 600,
    exactEndgameEmpties: 8,
    aspirationWindow: 40,
    randomness: 0,
  });

  const initial = GameState.initial();
  const result = engine.findBestMove(initial);
  const legalMoveIndices = new Set(initial.getLegalMoveIndices());

  assert.ok(legalMoveIndices.has(result.bestMoveIndex), 'Engine must return a legal move.');
  assert.ok(result.stats.completedDepth >= 1, 'Engine should complete at least one iteration.');
  assert.ok(result.analyzedMoves.length > 0, 'Engine should analyze root moves.');

  const midgame = playDeterministicPly(GameState.initial(), 17);
  const midgameResult = engine.findBestMove(midgame, { presetKey: 'custom', timeLimitMs: 500, maxDepth: 5 });
  assert.ok(new Set(midgame.getLegalMoveIndices()).has(midgameResult.bestMoveIndex));
  assert.ok(midgameResult.analyzedMoves.length > 0);

  const forcedPass = playDeterministicPly(GameState.initial(), 18);
  const passResult = engine.findBestMove(forcedPass, { presetKey: 'custom', timeLimitMs: 500, maxDepth: 5 });
  assert.equal(passResult.didPass, true);
  assert.equal(passResult.bestMoveIndex, null);
}

function run() {
  runCoreRuleTests();
  runEvaluatorTests();
  runSearchTests();
  console.log('core-smoke: all assertions passed');
}

run();
