import assert from 'node:assert/strict';
import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import { Evaluator } from '../ai/evaluator.js';
import { lookupOpeningBook, getOpeningBookSummary } from '../ai/opening-book.js';
import { resolveEngineOptions } from '../ai/presets.js';

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

function runOpeningBookTests() {
  const summary = getOpeningBookSummary();
  assert.equal(summary.seedLineCount, 99, 'Compact opening book should expose the expected number of seed lines.');
  assert.ok(summary.positionCount > 300, 'Opening book should expand into a few hundred reachable positions.');
  assert.ok(summary.maxDepthPly >= 12, 'Opening book should cover a meaningful portion of the opening.');

  const initial = GameState.initial();
  const initialHit = lookupOpeningBook(initial);
  assert.ok(initialHit, 'Initial position should be present in the opening book.');
  assert.equal(initialHit.candidateCount, 4, 'Initial position should expose all four standard first moves.');

  const diagonalState = initial.applyMove(initial.getLegalMoves().find((move) => move.coord === 'D3').index).state;
  const diagonalHit = lookupOpeningBook(diagonalState);
  assert.ok(diagonalHit, 'Symmetric early openings should also be found in the opening book.');
}

function runPresetResolutionTests() {
  const beginner = resolveEngineOptions('beginner', {}, 'balanced');
  const easy = resolveEngineOptions('easy', {}, 'balanced');
  const balanced = resolveEngineOptions('hard', {}, 'balanced');
  const aggressive = resolveEngineOptions('hard', {}, 'aggressive');
  const fortress = resolveEngineOptions('hard', {}, 'fortress');
  const expert = resolveEngineOptions('expert', {}, 'balanced');
  const impossible = resolveEngineOptions('impossible', {}, 'balanced');
  const custom = resolveEngineOptions('custom', {
    maxDepth: 7,
    randomness: 5,
    mobilityScale: 1.4,
    riskPenaltyScale: 1.1,
  }, 'aggressive');

  assert.equal(easy.presetKey, 'easy');
  assert.equal(easy.maxDepth, 3, 'Easy should sit between beginner and normal at depth 3.');
  assert.equal(easy.exactEndgameEmpties, 6, 'Easy should begin exact endgame search from 6 empties.');
  assert.ok(beginner.timeLimitMs < easy.timeLimitMs, 'Easy should think longer than beginner.');
  assert.ok(easy.randomness < beginner.randomness, 'Easy should be less random than beginner.');
  assert.equal(impossible.presetKey, 'impossible');
  assert.equal(impossible.maxDepth, 10, 'Impossible should target depth 10.');
  assert.equal(impossible.exactEndgameEmpties, 16, 'Impossible should extend exact search to 16 empties.');
  assert.ok(impossible.timeLimitMs > 10000, 'Impossible should reserve a heavy think time budget.');
  assert.ok(impossible.timeLimitMs > expert.timeLimitMs, 'Impossible should think longer than expert.');
  assert.ok(impossible.maxTableEntries > expert.maxTableEntries, 'Impossible should allocate a larger transposition table budget.');
  assert.equal(balanced.styleKey, 'balanced');
  assert.equal(aggressive.styleKey, 'aggressive');
  assert.ok(aggressive.mobilityScale > balanced.mobilityScale, 'Aggressive style should raise mobility emphasis.');
  assert.ok(fortress.stabilityScale > balanced.stabilityScale, 'Fortress style should raise stability emphasis.');
  assert.ok(fortress.randomness <= aggressive.randomness, 'Fortress style should stay at least as deterministic as aggressive.');
  assert.equal(custom.styleKey, null);
  assert.equal(custom.styleApplied, false);
  assert.equal(custom.mobilityScale, 1.4, 'Custom inputs should bypass style-based scaling.');
  assert.equal(custom.randomness, 5, 'Custom randomness should bypass style-based randomness bonuses.');
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
  assert.equal(result.source, 'opening-book', 'Initial position should be served directly from the opening book.');
  assert.equal(result.stats.bookHits, 1, 'Opening book lookup should be recorded in the stats.');
  assert.equal(result.stats.bookMoves, 1, 'Direct opening book moves should be recorded in the stats.');
  assert.ok(result.analyzedMoves.length > 0, 'Opening book result should expose candidate moves.');

  const midgame = playDeterministicPly(GameState.initial(), 17);
  const midgameResult = engine.findBestMove(midgame, { presetKey: 'custom', timeLimitMs: 500, maxDepth: 5, styleKey: 'fortress' });
  assert.ok(new Set(midgame.getLegalMoveIndices()).has(midgameResult.bestMoveIndex));
  assert.equal(midgameResult.source, 'search', 'Later positions should still fall back to full search.');
  assert.ok(midgameResult.stats.completedDepth >= 1, 'Full-search positions should complete at least one iteration.');
  assert.ok(midgameResult.analyzedMoves.length > 0);

  const sizeBeforeUpdate = engine.transpositionTable.size;
  engine.updateOptions({
    presetKey: engine.options.presetKey,
    styleKey: engine.options.styleKey,
    maxDepth: engine.options.maxDepth,
    timeLimitMs: engine.options.timeLimitMs,
    exactEndgameEmpties: engine.options.exactEndgameEmpties,
    aspirationWindow: engine.options.aspirationWindow,
    randomness: engine.options.randomness,
  });
  assert.equal(engine.transpositionTable.size, sizeBeforeUpdate, 'Updating with equivalent options should preserve the transposition table.');

  engine.updateOptions({
    presetKey: 'custom',
    maxDepth: 5,
    timeLimitMs: 500,
    exactEndgameEmpties: engine.options.exactEndgameEmpties,
    aspirationWindow: engine.options.aspirationWindow,
    randomness: 0,
    styleKey: 'aggressive',
  });
  assert.equal(engine.transpositionTable.size, sizeBeforeUpdate, 'Style changes should be ignored while custom difficulty is active.');

  const forcedPass = playDeterministicPly(GameState.initial(), 18);
  const passResult = engine.findBestMove(forcedPass, { presetKey: 'custom', timeLimitMs: 500, maxDepth: 5, styleKey: 'balanced' });
  assert.equal(passResult.didPass, true);
  assert.equal(passResult.bestMoveIndex, null);
}

function run() {
  runCoreRuleTests();
  runEvaluatorTests();
  runOpeningBookTests();
  runPresetResolutionTests();
  runSearchTests();
  console.log('core-smoke: all assertions passed');
}

run();
