import assert from 'node:assert/strict';
import {
  GameState,
  createStateFromBitboards,
  createStateFromMoveSequence,
  createStateHistoryFromMoveSequence,
} from '../core/game-state.js';
import { bitFromIndex, FULL_BOARD, popcount } from '../core/bitboard.js';
import { SearchEngine } from '../ai/search-engine.js';
import { legalMovesBitboard } from '../core/rules.js';
import { Evaluator, MoveOrderingEvaluator } from '../ai/evaluator.js';
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

function playDeterministicallyUntilEmptyCount(state, targetEmptyCount) {
  let current = state;
  let guard = 0;
  while (!current.isTerminal() && current.getEmptyCount() > targetEmptyCount) {
    const legalMoves = current.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    current = legalMoves.length === 0
      ? current.passTurn()
      : current.applyMove(legalMoves[0].index).state;

    guard += 1;
    assert.ok(guard < 200, 'Deterministic playout should not loop forever.');
  }
  return current;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function playSeededRandomUntilEmptyCount(targetEmptyCount, seed) {
  const random = createSeededRandom(seed);
  let current = GameState.initial();
  let guard = 0;

  while (!current.isTerminal() && current.getEmptyCount() > targetEmptyCount) {
    const legalMoves = current.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    current = legalMoves.length === 0
      ? current.passTurn()
      : current.applyMove(legalMoves[Math.floor(random() * legalMoves.length)].index).state;

    guard += 1;
    assert.ok(guard < 200, 'Seeded playout should not loop forever.');
  }

  return current;
}

function withMockedRandom(value, callback) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function findSearchRandomnessRegressionState() {
  const probeEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 4,
    timeLimitMs: 600,
    exactEndgameEmpties: 8,
    aspirationWindow: 40,
    randomness: 0,
  });

  for (let plies = 13; plies <= 32; plies += 1) {
    const state = playDeterministicPly(GameState.initial(), plies);
    const result = probeEngine.findBestMove(state, {
      presetKey: 'custom',
      maxDepth: 4,
      timeLimitMs: 600,
      exactEndgameEmpties: 8,
      aspirationWindow: 40,
      randomness: 0,
      styleKey: 'balanced',
    });

    if (result.source !== 'search' || result.analyzedMoves.length < 2) {
      continue;
    }

    if ((result.analyzedMoves[0].score - result.analyzedMoves[1].score) <= 60) {
      return state;
    }
  }

  return null;
}


function assertZeroSumEvaluation(evaluator, state, message) {
  const blackScore = evaluator.evaluate(state, 'black');
  const whiteScore = evaluator.evaluate(state, 'white');
  assert.ok(
    Object.is(blackScore, -whiteScore) || (blackScore + whiteScore) === 0,
    `${message}: black ${blackScore}, white ${whiteScore}`,
  );
}

function bruteForceExactScore(state) {
  if (state.isTerminal()) {
    return state.getDiscDifferential(state.currentPlayer) * 10000;
  }

  const legalMoves = state.getLegalMoves();
  if (legalMoves.length === 0) {
    return -bruteForceExactScore(state.passTurn());
  }

  let bestScore = -Infinity;
  for (const move of legalMoves) {
    const outcome = state.applyMove(move.index);
    assert.ok(outcome, 'Brute-force solver should only examine legal moves.');
    bestScore = Math.max(bestScore, -bruteForceExactScore(outcome.state));
  }
  return bestScore;
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

  const fastState = initial.applyMoveFast(initial.getLegalMoves().find((move) => move.coord === 'D3').index);
  assert.ok(fastState, 'Fast move application should accept the same legal move.');
  assert.equal(fastState.black, moveResult.state.black, 'Fast move application should match the regular board update.');
  assert.equal(fastState.white, moveResult.state.white, 'Fast move application should match the regular board update.');
  assert.equal(fastState.currentPlayer, moveResult.state.currentPlayer, 'Fast move application should preserve the side to move.');

  assert.deepEqual(
    initial.getSearchMoves().map((move) => move.index),
    initial.getLegalMoves().map((move) => move.index),
    'Search move generation should list the same legal moves as the full-detail UI generator.',
  );

  const imported = createStateFromMoveSequence('c4c3');
  assert.equal(imported.currentPlayer, 'black', 'Compact move-sequence input should be accepted.');
  assert.deepEqual(imported.getDiscCounts(), { black: 3, white: 3 });

  const cloneHash = imported.clone().hashKey();
  assert.equal(typeof cloneHash, 'bigint', 'Hash keys should use a packed BigInt representation.');
  assert.equal(cloneHash, imported.hashKey(), 'Cloning should preserve the same hash key.');

  const sideToMoveChanged = createStateFromBitboards({
    black: imported.black,
    white: imported.white,
    currentPlayer: 'white',
  });
  assert.notEqual(
    imported.hashKey(),
    sideToMoveChanged.hashKey(),
    'Hash keys should distinguish the side to move for transposition lookups.',
  );

  const history = createStateHistoryFromMoveSequence('C4 C3');
  assert.equal(history.length, 3, 'Position import should preserve the full state history from the opening state.');
  assert.equal(history.at(-1).moveHistory.length, 2);

  assert.throws(
    () => createStateHistoryFromMoveSequence('pass'),
    /Illegal pass/i,
    'Position import should reject pass tokens while legal moves still exist.',
  );

  assert.throws(
    () => createStateFromBitboards({ black: 1n, white: 1n }),
    /overlap/i,
    'Bitboard import should reject overlapping occupancy.',
  );
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

  const lateGame = playDeterministicPly(initial, 49);
  assert.equal(lateGame.getEmptyCount(), 14, 'The parity regression test should reach the late game.');
  assertZeroSumEvaluation(
    evaluator,
    lateGame,
    'Evaluations from opposite perspectives should stay zero-sum in the late game',
  );

  for (const seed of [11, 23, 37, 59, 71, 89]) {
    const randomLate = playSeededRandomUntilEmptyCount(10 + (seed % 6), seed);
    assertZeroSumEvaluation(
      evaluator,
      randomLate,
      `Evaluations from opposite perspectives should stay zero-sum on seeded regression ${seed}`,
    );
  }

  const orderingEvaluator = new MoveOrderingEvaluator();
  assertZeroSumEvaluation(
    orderingEvaluator,
    lateGame,
    'Move-ordering evaluations should stay zero-sum in the late game',
  );

  const cornerSafe = createStateFromMoveSequence('D3 C3 B3 B2 C4 A3 A1');
  const cornerRisky = createStateFromMoveSequence('D3 C3 B3 B2 B1');
  const safeFeatures = evaluator.explainFeatures(cornerSafe, 'black');
  const riskyFeatures = evaluator.explainFeatures(cornerRisky, 'black');
  assert.ok(Number.isFinite(safeFeatures.edgePattern), 'Edge pattern feature should be computed for analysis output.');
  assert.ok(Number.isFinite(safeFeatures.cornerPattern), 'Corner pattern feature should be computed for analysis output.');
  assert.ok(
    safeFeatures.cornerPattern > riskyFeatures.cornerPattern,
    'Owning a corner should improve the corner-pattern score compared with lingering near an empty corner.',
  );

  const mixedFullEdge = createStateFromBitboards({
    black: 153n,
    white: 102n,
    currentPlayer: 'black',
  });
  const mixedEdgeBlackFeatures = evaluator.explainFeatures(mixedFullEdge, 'black');
  const mixedEdgeWhiteFeatures = evaluator.explainFeatures(mixedFullEdge, 'white');
  assert.equal(
    mixedEdgeBlackFeatures.stability,
    0,
    'A fully occupied edge should count all edge discs as stable even when the edge colors are mixed.',
  );
  assert.equal(
    mixedEdgeWhiteFeatures.stability,
    0,
    'Mixed full-edge stability should remain zero-sum from the opposite perspective as well.',
  );

  const interiorStabilityBase = createStateFromBitboards({
    black: 104991460194059647n,
    white: 18341066517284440192n,
    currentPlayer: 'black',
  });
  const interiorStabilityBoosted = createStateFromBitboards({
    black: 104991460194059647n | bitFromIndex(9),
    white: 18341066517284440192n,
    currentPlayer: 'black',
  });
  const interiorBaseFeatures = evaluator.explainFeatures(interiorStabilityBase, 'black');
  const interiorBoostedFeatures = evaluator.explainFeatures(interiorStabilityBoosted, 'black');
  assert.ok(
    interiorBoostedFeatures.stableDiscs > interiorBaseFeatures.stableDiscs,
    'Late-game stability refinement should propagate beyond edge anchors when an interior disc is shielded by stable chains.',
  );
  assert.ok(
    interiorBoostedFeatures.stability > interiorBaseFeatures.stability,
    'Additional interior stable discs should improve the reported stability score.',
  );

  const splitParityWhite = bitFromIndex(1) | bitFromIndex(61);
  const splitParityState = createStateFromBitboards({
    black: FULL_BOARD & ~(bitFromIndex(0) | bitFromIndex(63) | splitParityWhite),
    white: splitParityWhite,
    currentPlayer: 'black',
  });
  const splitParityBlackFeatures = evaluator.explainFeatures(splitParityState, 'black');
  const splitParityWhiteFeatures = evaluator.explainFeatures(splitParityState, 'white');
  assert.equal(
    splitParityBlackFeatures.parityGlobal,
    -100,
    'Global parity should still see an even number of remaining empties as unfavorable for the side to move.',
  );
  assert.equal(
    splitParityBlackFeatures.parityRegionCount,
    2,
    'Region-aware parity should recognize the two isolated singleton empty regions.',
  );
  assert.equal(
    splitParityBlackFeatures.parityOddRegions,
    2,
    'Both isolated singleton regions should count as odd empty regions.',
  );
  assert.ok(
    splitParityBlackFeatures.parity > splitParityBlackFeatures.parityGlobal,
    'Region-aware parity should soften the flat global-even penalty when the odd regions are split between the players.',
  );
  assert.equal(
    splitParityWhiteFeatures.parity,
    -splitParityBlackFeatures.parity,
    'Region-aware parity should remain zero-sum across opposite evaluation perspectives.',
  );
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
  assert.ok(fortress.edgePatternScale > balanced.edgePatternScale, 'Fortress style should value edge patterns more strongly.');
  assert.ok(fortress.cornerPatternScale > balanced.cornerPatternScale, 'Fortress style should value corner patterns more strongly.');
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

  const randomnessRegressionState = findSearchRandomnessRegressionState();
  assert.ok(randomnessRegressionState, 'The regression test should find a search position with at least two near-best moves.');

  const randomizedEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 4,
    timeLimitMs: 600,
    exactEndgameEmpties: 8,
    aspirationWindow: 40,
    randomness: 60,
  });
  const randomizedResult = withMockedRandom(0.999999, () => randomizedEngine.findBestMove(randomnessRegressionState, {
    presetKey: 'custom',
    maxDepth: 4,
    timeLimitMs: 600,
    exactEndgameEmpties: 8,
    aspirationWindow: 40,
    randomness: 60,
    styleKey: 'balanced',
  }));
  assert.notEqual(
    randomizedResult.bestMoveIndex,
    randomizedResult.analyzedMoves[0].index,
    'Mocked randomness should force the engine to choose a non-top near-best move for this regression.',
  );
  const chosenAnalyzedMove = randomizedResult.analyzedMoves.find((move) => move.index === randomizedResult.bestMoveIndex);
  assert.ok(chosenAnalyzedMove, 'The randomized root move must still be present in the analyzed move list.');
  assert.equal(
    randomizedResult.principalVariation[0],
    randomizedResult.bestMoveIndex,
    'Randomized root selection must keep the principal variation aligned with the chosen move.',
  );
  assert.equal(
    randomizedResult.score,
    chosenAnalyzedMove.score,
    'Randomized root selection must keep the reported score aligned with the chosen move.',
  );

  const repeatedMidgameResult = engine.findBestMove(midgame, { presetKey: 'custom', timeLimitMs: 500, maxDepth: 5, styleKey: 'fortress' });
  assert.equal(
    repeatedMidgameResult.bestMoveIndex,
    midgameResult.bestMoveIndex,
    'Re-searching the same position with deterministic settings should keep the same best move.',
  );
  assert.ok(
    repeatedMidgameResult.stats.ttFirstSearches > 0,
    'A repeated search should reuse the stored transposition-table move before running full move ordering.',
  );

  const lmrProbe = playSeededRandomUntilEmptyCount(18, 7);
  assert.equal(lmrProbe.getEmptyCount(), 18, 'The LMR regression setup should land in a representative midgame.');
  const lmrEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 5,
    timeLimitMs: 1800,
    exactEndgameEmpties: 12,
    aspirationWindow: 40,
    randomness: 0,
  });
  const lmrResult = lmrEngine.findBestMove(lmrProbe, {
    presetKey: 'custom',
    maxDepth: 5,
    timeLimitMs: 1800,
    exactEndgameEmpties: 12,
    aspirationWindow: 40,
    randomness: 0,
    styleKey: 'balanced',
  });
  assert.ok(
    lmrResult.stats.lmrReductions > 0,
    'Conservative late-move reductions should activate on representative midgame searches.',
  );

  const orderingProbe = playSeededRandomUntilEmptyCount(12, 19);
  assert.equal(orderingProbe.getEmptyCount(), 12, 'Ordering-evaluator regression setup should reach twelve empties.');
  const orderingEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 5,
    timeLimitMs: 3000,
    exactEndgameEmpties: 16,
    aspirationWindow: 40,
    randomness: 0,
  });
  const orderingResult = orderingEngine.findBestMove(orderingProbe, {
    presetKey: 'custom',
    maxDepth: 5,
    timeLimitMs: 3000,
    exactEndgameEmpties: 16,
    aspirationWindow: 40,
    randomness: 0,
    styleKey: 'balanced',
  });
  assert.ok(
    orderingResult.stats.orderingEvalCalls > 0,
    'The lightweight move-ordering evaluator should activate in the intended late-search window.',
  );

  const childBucketProbe = playSeededRandomUntilEmptyCount(13, 21);
  assert.equal(childBucketProbe.getEmptyCount(), 13, 'Child-empty late-ordering regression setup should reach thirteen empties.');
  const childBucketMove = childBucketProbe.getSearchMoves()[0];
  const childBucketState = childBucketProbe.applyMoveFast(childBucketMove.index, childBucketMove.flips ?? null);
  const childBucketBoards = childBucketState.getPlayerBoards();
  const childBucketOpponentMoveCount = popcount(legalMovesBitboard(childBucketBoards.player, childBucketBoards.opponent));
  const parentPhaseOrderingScore = orderingEngine.scoreLightweightOrderingEvaluation(
    childBucketState,
    childBucketProbe.currentPlayer,
    childBucketProbe.getEmptyCount(),
    childBucketOpponentMoveCount,
  );
  const childPhaseOrderingScore = orderingEngine.scoreLightweightOrderingEvaluation(
    childBucketState,
    childBucketProbe.currentPlayer,
    childBucketState.getEmptyCount(),
    childBucketOpponentMoveCount,
  );
  assert.notEqual(
    childPhaseOrderingScore,
    parentPhaseOrderingScore,
    'Late move-ordering scoring should react to the post-move empty count so the trained 12-empty bucket activates immediately.',
  );

  const trainedThirteenBucket = orderingEngine.moveOrderingEvaluator.selectTrainedBucket(13);
  assert.deepEqual(
    trainedThirteenBucket?.weights,
    {
      mobility: 2000,
      corners: 0,
      cornerAdjacency: 0,
      edgePattern: 1000,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    },
    'The move-ordering evaluator should expose the exact-teacher 13~14-empty bucket weights.',
  );

  const exactLateOrderingProfile = orderingEngine.selectLateOrderingProfile(14);
  assert.ok(
    exactLateOrderingProfile.lightweightEvalScale >= 4,
    'Exact-window move ordering should strongly boost the trained lightweight evaluator signal.',
  );
  assert.equal(
    exactLateOrderingProfile.historyScale,
    0,
    'Exact-window move ordering should fully suppress generic history ordering noise after the Stage 10 retune.',
  );
  assert.equal(
    exactLateOrderingProfile.positionalScale,
    0,
    'Exact-window move ordering should fully suppress generic positional ordering noise after the Stage 10 retune.',
  );
  assert.equal(
    exactLateOrderingProfile.flipScale,
    0,
    'Exact-window move ordering should fully suppress generic flip-count ordering noise after the Stage 10 retune.',
  );
  assert.ok(
    exactLateOrderingProfile.riskScale < 0.3,
    'Exact-window move ordering should keep only a light residual positional-risk penalty.',
  );

  const tablePolicyEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 3,
    timeLimitMs: 200,
    maxTableEntries: 100,
    randomness: 0,
  });
  const tablePolicyState = playDeterministicPly(GameState.initial(), 6);
  const tablePolicyMoves = tablePolicyState.getLegalMoves();
  tablePolicyEngine.searchGeneration = 4;
  tablePolicyEngine.storeTransposition(tablePolicyState, {
    depth: 6,
    value: 40,
    flag: 'lower',
    bestMoveIndex: tablePolicyMoves[0].index,
  });
  tablePolicyEngine.searchGeneration = 5;
  tablePolicyEngine.storeTransposition(tablePolicyState, {
    depth: 4,
    value: 20,
    flag: 'exact',
    bestMoveIndex: tablePolicyMoves.at(-1).index,
  });
  const storedExactEntry = tablePolicyEngine.lookupTransposition(tablePolicyState);
  assert.equal(
    storedExactEntry.flag,
    'exact',
    'A shallower exact transposition entry should replace a moderately deeper bound entry for the same position.',
  );
  assert.equal(
    storedExactEntry.depth,
    4,
    'Exact transposition replacement should preserve the incoming exact entry depth.',
  );

  const agingEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 2,
    timeLimitMs: 100,
    randomness: 0,
  });
  agingEngine.options.maxTableEntries = 1000;
  agingEngine.transpositionTable.clear();
  for (let index = 0; index < 1000; index += 1) {
    agingEngine.transpositionTable.set(`stale-${index}`, {
      depth: 1,
      value: index,
      flag: index % 2 === 0 ? 'upper' : 'lower',
      bestMoveIndex: null,
      generation: 1,
    });
  }
  agingEngine.transpositionTable.set('recent-exact', {
    depth: 8,
    value: 500,
    flag: 'exact',
    bestMoveIndex: 19,
    generation: 5,
  });
  agingEngine.searchGeneration = 6;
  agingEngine.trimTranspositionTable();
  assert.ok(
    agingEngine.transpositionTable.has('recent-exact'),
    'Generation-aware trimming should keep recent deep exact entries.',
  );
  assert.ok(
    !agingEngine.transpositionTable.has('stale-0'),
    'Generation-aware trimming should evict stale shallow bound entries first.',
  );
  assert.ok(
    agingEngine.transpositionTable.size <= 881,
    'Table trimming should remove a significant stale batch once the entry budget is exceeded.',
  );

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
  const passChild = engine.negamax(forcedPass.passTurn(), Math.max(0, passResult.stats.completedDepth - 1), -1e9, 1e9, 1);
  assert.equal(
    passResult.score,
    -passChild.score,
    'Root pass handling should report the searched score instead of a hard-coded zero.',
  );

  const cachedPassLine = engine.negamax(forcedPass, 4, -1e9, 1e9, 0);
  const cachedPassEntry = engine.lookupTransposition(forcedPass);
  assert.ok(
    cachedPassEntry,
    'Pass nodes should now be cached in the transposition table for reuse.',
  );
  assert.equal(
    cachedPassEntry.bestMoveIndex,
    null,
    'Pass-node table entries should keep a null move marker.',
  );
  assert.equal(
    cachedPassEntry.value,
    cachedPassLine.score,
    'Cached pass-node values should match the searched negamax result.',
  );

  const nearEndgame = playDeterministicallyUntilEmptyCount(GameState.initial(), 4);
  assert.equal(nearEndgame.getEmptyCount(), 4, 'Small endgame regression setup should reach four empties.');
  const exactScore = bruteForceExactScore(nearEndgame);
  const nearEndgameResult = engine.findBestMove(nearEndgame, {
    presetKey: 'custom',
    timeLimitMs: 1200,
    maxDepth: 4,
    exactEndgameEmpties: 16,
    randomness: 0,
    styleKey: 'balanced',
  });
  assert.equal(
    nearEndgameResult.score,
    exactScore,
    'The near-terminal specialized solver should preserve the exact endgame score.',
  );
  assert.ok(
    nearEndgameResult.stats.smallSolverCalls > 0,
    'Near-terminal exact search should route through the specialized small-endgame solver.',
  );

  assert.equal(
    nearEndgameResult.stats.lmrReductions,
    0,
    'Late-move reduction should stay disabled inside exact endgame search.',
  );

  const tinyOrderingProbe = playSeededRandomUntilEmptyCount(8, 6);
  assert.equal(tinyOrderingProbe.getEmptyCount(), 8, 'Tiny late-game regression setup should reach eight empties.');
  const tinyOrderingResult = engine.findBestMove(tinyOrderingProbe, {
    presetKey: 'custom',
    timeLimitMs: 1800,
    maxDepth: 4,
    exactEndgameEmpties: 16,
    randomness: 0,
    styleKey: 'balanced',
  });
  assert.equal(
    tinyOrderingResult.stats.orderingEvalCalls,
    0,
    'The lightweight move-ordering evaluator should stay disabled once the endgame is already tiny enough for direct tactical heuristics to dominate.',
  );

  for (const seed of [1, 2, 3]) {
    const seededNearEndgame = playSeededRandomUntilEmptyCount(6, seed);
    assert.equal(seededNearEndgame.getEmptyCount(), 6, `Seeded endgame regression ${seed} should reach six empties.`);
    const seededExactScore = bruteForceExactScore(seededNearEndgame);
    const seededResult = engine.findBestMove(seededNearEndgame, {
      presetKey: 'custom',
      timeLimitMs: 1800,
      maxDepth: 4,
      exactEndgameEmpties: 16,
      randomness: 0,
      styleKey: 'balanced',
    });
    assert.equal(
      seededResult.score,
      seededExactScore,
      `Exact endgame search should match brute force on seeded regression position ${seed}.`,
    );
  }
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
