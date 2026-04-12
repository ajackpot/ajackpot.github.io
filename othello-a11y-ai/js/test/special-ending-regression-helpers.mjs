import assert from 'node:assert/strict';

import { coordToIndex } from '../core/bitboard.js';
import { createStateFromMoveSequence } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';

const INFINITY = 10 ** 9;

export const SPECIAL_ENDING_MCTS_ALGORITHMS = Object.freeze([
  'mcts-lite',
  'mcts-guided',
  'mcts-hybrid',
]);

export const SPECIAL_ENDING_REGRESSION_SEQUENCES = Object.freeze({
  scoutCase1: 'd3c5f6f5e6e3f3f4c3c4g6d6c6g5h5d7d8c7c8e7e8',
  scoutCase2: 'd3c5f6f5e6e3f3f4c3c4g6d6c6g5h5d7d8c7c8e7e8f7g3f8g8h6h7d2d1',
  immediateWipeoutLeafCase1: 'd3c5f6f5e6e3f3f4c3c4g6d6c6g5h5d7d8c7c8e7e8f7f8d2',
  immediateWipeoutLeafCase2: 'd3c5f6f5e6e3f3f4c3c4g6d6c6g5h5d7d8c7c8e7e8f7g3f8g8h6h7d2d1e2e1f2',
  immediateWipeoutParentTrap: 'd3c5f6f5e6e3f3f4c3c4g6d6c6g5h5d7d8c7c8e7e8f7f8',
});

export function createRegressionState(key) {
  const sequence = SPECIAL_ENDING_REGRESSION_SEQUENCES[key] ?? key;
  return createStateFromMoveSequence(sequence);
}

export function findAnalyzedMove(result, coord) {
  return result?.analyzedMoves?.find((entry) => entry.coord === coord) ?? null;
}

export function withMockedRandom(value, callback) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

export function disableRootScout(engine) {
  engine.applySpecialEndingScoutToRootResult = (_state, _legalMoves, rootResult) => rootResult;
}

export function createClassicImpossibleEngine(overrides = {}) {
  return new SearchEngine({
    presetKey: 'impossible',
    searchAlgorithm: 'classic',
    ...overrides,
  });
}

export function createDirectClassicImpossibleEngine(overrides = {}) {
  const engine = createClassicImpossibleEngine(overrides);
  engine.deadlineMs = Number.POSITIVE_INFINITY;
  engine.searchGeneration += 1;
  return engine;
}

export function createCustomMctsEngine(algorithm, overrides = {}) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: algorithm,
    maxDepth: 4,
    timeLimitMs: 1000,
    mctsMaxIterations: 96,
    mctsMaxNodes: 6000,
    exactEndgameEmpties: 8,
    aspirationWindow: 0,
    randomness: 0,
    maxTableEntries: 40000,
    ...overrides,
  });
}

function verifyImmediateWipeoutLeaf(sequenceKey, expectedCoord, expectedStatKey = 'immediateWipeoutHits') {
  const state = createRegressionState(sequenceKey);
  const engine = createDirectClassicImpossibleEngine();
  const expectedIndex = coordToIndex(expectedCoord);

  const orderedMoves = engine.orderMoves(state, state.getSearchMoves(), 1, 1, null, null, 'general');
  assert.equal(
    orderedMoves[0]?.index,
    expectedIndex,
    `Immediate wipeout ordering should prioritize ${expectedCoord}.`,
  );

  const result = engine.negamax(state, 0, -INFINITY, INFINITY, 1, false);
  assert.equal(
    result.principalVariation[0],
    expectedIndex,
    `Depth-0 negamax should still discover the immediate wipeout ${expectedCoord}.`,
  );
  assert.ok(
    result.score > 0,
    `Depth-0 negamax should score the immediate wipeout ${expectedCoord} as winning for the side to move.`,
  );
  assert.ok(
    engine.stats[expectedStatKey] >= 1,
    `Immediate wipeout detection should increment ${expectedStatKey}.`,
  );
  assert.ok(
    engine.stats.immediateWipeoutScans >= 1,
    'Immediate wipeout detection should record at least one scan.',
  );

  return { state, engine, result };
}

function assertTrapMoveDemoted(result, trapCoord, algorithm, label) {
  assert.notEqual(
    result.bestMoveCoord,
    trapCoord,
    `${algorithm} should keep the ${label} trap off the final root choice even when the external root scout is disabled.`,
  );
  assert.ok(
    result.stats.mctsRootThreatHits > 0,
    `${algorithm} should detect at least one severe root threat while analyzing the ${label} trap case.`,
  );

  const trapMove = findAnalyzedMove(result, trapCoord);
  if (trapMove) {
    assert.ok(
      (trapMove.mctsRootThreatPenaltyScore ?? 0) > 0,
      `${algorithm} should attach a dedicated root threat penalty to ${trapCoord} in the ${label} trap case.`,
    );
  }
}

export function runSpecialEndingScoutSmoke() {
  const case1State = createRegressionState('scoutCase1');
  const case1Engine = createClassicImpossibleEngine();
  const case1Result = case1Engine.findBestMove(case1State, {
    presetKey: 'impossible',
    searchAlgorithm: 'classic',
  });
  const case1TrapMove = findAnalyzedMove(case1Result, 'F7');
  const case1SafeReply = findAnalyzedMove(case1Result, 'F8');

  assert.equal(case1Result.searchMode, 'depth-limited', 'The special-ending scout smoke should exercise the depth-limited classic path.');
  assert.equal(case1Result.stats.specialEndingScoutRuns, 1, 'The root special-ending scout should run exactly once on the first regression case.');
  assert.ok(case1TrapMove, 'The first regression case should still analyze F7 so the scout can demote it if necessary.');
  assert.ok(case1SafeReply, 'The first regression case should keep F8 available as a comparison move.');
  assert.notEqual(case1Result.bestMoveCoord, 'F7', 'The first regression case must no longer select F7.');
  assert.ok((case1TrapMove.specialEndingScoutPenalty ?? 0) > 0, 'The first regression case should apply a tactical penalty to F7.');
  assert.ok(case1TrapMove.rawScore > case1TrapMove.score, 'The first regression case should preserve the raw search score separately from the penalized score.');
  assert.equal(case1TrapMove.specialEndingScout?.worstReply?.replyCoord, 'F8', 'The first regression case should identify Black F8 as the tactical refutation to F7.');
  assert.equal(case1TrapMove.specialEndingScout?.worstReply?.ourDiscCount, 1, 'The first regression case should detect the one-disc collapse after the tactical refutation.');
  assert.equal(case1TrapMove.specialEndingScout?.worstReply?.safeResponses, 2, 'The first regression case should detect that only two immediate escapes remain after the refutation.');
  assert.ok(case1SafeReply.score > case1TrapMove.score, 'The first regression case should keep the safe reply ahead of the tactical trap after scout penalties are applied.');

  const case2State = createRegressionState('scoutCase2');
  const case2Engine = createClassicImpossibleEngine();
  const case2Result = case2Engine.findBestMove(case2State, {
    presetKey: 'impossible',
    searchAlgorithm: 'classic',
  });
  const case2TrapMove = findAnalyzedMove(case2Result, 'E2');

  assert.equal(case2Result.stats.specialEndingScoutRuns, 1, 'The root special-ending scout should run exactly once on the second regression case.');
  assert.ok(case2TrapMove, 'The second regression case should still analyze E2 so the scout can demote it if necessary.');
  assert.notEqual(case2Result.bestMoveCoord, 'E2', 'The second regression case must no longer select E2.');
  assert.ok((case2TrapMove.specialEndingScoutPenalty ?? 0) > 0, 'The second regression case should apply a tactical penalty to E2.');
  assert.equal(case2TrapMove.specialEndingScout?.worstReply?.replyCoord, 'E1', 'The second regression case should identify Black E1 as the tactical refutation to E2.');
  assert.equal(case2TrapMove.specialEndingScout?.worstReply?.ourDiscCount, 1, 'The second regression case should detect the one-disc collapse after the tactical refutation.');
  assert.equal(case2TrapMove.specialEndingScout?.worstReply?.safeResponses, 2, 'The second regression case should detect that only two immediate escapes remain after the refutation.');
  assert.ok(case2Result.analyzedMoves[0].coord !== 'E2', 'The second regression case should keep a non-trap move at the top of the analyzed list.');

  return {
    case1Result,
    case2Result,
  };
}

export function runImmediateWipeoutGuardSmoke() {
  const leafCase1 = verifyImmediateWipeoutLeaf('immediateWipeoutLeafCase1', 'D1');
  const leafCase2 = verifyImmediateWipeoutLeaf('immediateWipeoutLeafCase2', 'F1');

  const wldState = createRegressionState('immediateWipeoutLeafCase1');
  const wldEngine = createDirectClassicImpossibleEngine();
  const wldResult = wldEngine.wldNegamax(wldState, -INFINITY, INFINITY, 1);
  assert.equal(
    wldResult.principalVariation[0],
    coordToIndex('D1'),
    'WLD search should also surface the immediate wipeout move in the leaf guard state.',
  );
  assert.ok(
    wldResult.score > 0,
    'WLD search should score the immediate wipeout leaf state as a win.',
  );
  assert.ok(
    wldEngine.stats.wldImmediateWipeoutHits >= 1,
    'WLD search should record an immediate wipeout hit.',
  );

  const parentState = createRegressionState('immediateWipeoutParentTrap');
  const parentEngine = createDirectClassicImpossibleEngine();
  const parentResult = parentEngine.searchRoot(parentState, parentState.getLegalMoves(), 1, -INFINITY, INFINITY, null, false);
  const safeMove = findAnalyzedMove(parentResult, 'H6');
  const trapMove = findAnalyzedMove(parentResult, 'D2');

  assert.equal(
    parentResult.bestMoveIndex,
    coordToIndex('H6'),
    'Depth-1 root search without the special-ending scout should already avoid the D2 trap thanks to the internal immediate wipeout guard.',
  );
  assert.ok(safeMove && trapMove, 'The parent tactical guard smoke should analyze both a safe move and a trap move.');
  assert.ok(
    safeMove.score > trapMove.score,
    'The internal immediate wipeout guard should demote D2 below the safe H6 reply.',
  );
  assert.deepEqual(
    trapMove.principalVariation.map((index) => index),
    [coordToIndex('D2'), coordToIndex('D1')],
    'The trap line should explicitly surface the immediate wipeout reply in its principal variation.',
  );

  return {
    leafCase1,
    leafCase2,
    wldResult,
    parentResult,
  };
}

export function runMctsImmediateWipeoutBiasSmoke() {
  const immediateWipeoutState = createRegressionState('immediateWipeoutLeafCase1');
  const case2State = createRegressionState('scoutCase2');
  const results = {};

  for (const algorithm of SPECIAL_ENDING_MCTS_ALGORITHMS) {
    const rootShortcutEngine = createCustomMctsEngine(algorithm, {
      mctsMaxIterations: 8,
      mctsMaxNodes: 5000,
    });
    disableRootScout(rootShortcutEngine);
    const rootShortcutResult = withMockedRandom(0, () => rootShortcutEngine.findBestMove(immediateWipeoutState));
    assert.equal(rootShortcutResult.bestMoveCoord, 'D1', `${algorithm} should immediately convert a direct wipeout root without needing the root scout.`);
    assert.equal(rootShortcutResult.stats.mctsImmediateWipeoutRootShortcuts, 1, `${algorithm} should record the dedicated immediate wipeout root shortcut.`);
    assert.equal(rootShortcutResult.stats.mctsImmediateWipeoutSelections, 1, `${algorithm} should count the direct wipeout shortcut as an applied MCTS wipeout selection.`);
    assert.equal(rootShortcutResult.stats.mctsIterations, 0, `${algorithm} should not burn regular MCTS iterations once a direct wipeout root is detected.`);
    assert.equal(rootShortcutResult.analyzedMoves.length, 1, `${algorithm} should collapse the root result to the direct wipeout continuation.`);
    assert.equal(rootShortcutResult.analyzedMoves[0]?.coord, 'D1', `${algorithm} should expose D1 as the analyzed direct wipeout move.`);

    const guidedCoreEngine = createCustomMctsEngine(algorithm);
    const guidedCoreResult = withMockedRandom(0, () => guidedCoreEngine.findBestMove(case2State));
    assert.notEqual(guidedCoreResult.bestMoveCoord, 'E2', `${algorithm} should keep the case2 trap off the final root choice once the scout and the MCTS wipeout bias work together.`);
    assert.ok(guidedCoreResult.stats.mctsImmediateWipeoutSelections > 0, `${algorithm} should actually encounter and apply the internal immediate wipeout bias during the case2 MCTS search.`);

    results[algorithm] = {
      rootShortcutResult,
      guidedCoreResult,
    };
  }

  return results;
}

export function runMctsRootThreatPenaltySmoke() {
  const case1State = createRegressionState('scoutCase1');
  const case2State = createRegressionState('scoutCase2');
  const results = {};

  for (const algorithm of SPECIAL_ENDING_MCTS_ALGORITHMS) {
    const engine = createCustomMctsEngine(algorithm);
    disableRootScout(engine);

    const case1Result = withMockedRandom(0, () => engine.findBestMove(case1State));
    assertTrapMoveDemoted(case1Result, 'F7', algorithm, 'case1');

    const case2Result = withMockedRandom(0, () => engine.findBestMove(case2State));
    assertTrapMoveDemoted(case2Result, 'E2', algorithm, 'case2');

    if (algorithm === 'mcts-lite') {
      assert.ok(
        case2Result.stats.mctsRootThreatRootSafeExpansionSkips > 0,
        'mcts-lite should use the root threat map to skip over trapped root expansions when safe alternatives exist.',
      );
    } else {
      assert.ok(
        case2Result.stats.mctsRootThreatPriorUses > 0,
        `${algorithm} should feed the root threat map back into its guided prior scoring.`,
      );
    }

    results[algorithm] = {
      case1Result,
      case2Result,
    };
  }

  return results;
}
