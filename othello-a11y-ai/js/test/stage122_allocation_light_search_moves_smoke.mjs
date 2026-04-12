import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { GameState } from '../core/game-state.js';
import { listPreparedSearchMoves } from '../core/rules.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function normalizeSearchMoves(moves) {
  return moves.map((move) => ({
    index: move.index,
    bit: move.bit.toString(),
    flips: move.flips.toString(),
    flipCount: move.flipCount,
  }));
}

function assertPreparedShape(move) {
  assert.equal(move.orderingOutcome, null);
  assert.equal(move.childTableEntry, null);
  assert.equal(move.opponentMoveCount, null);
  assert.equal(move.opponentCornerReplies, null);
  assert.equal(move.orderingScore, 0);
  assert.equal(move.etcPreparedChildTableEntryReady, false);
  assert.equal(move.etcPreparedChildTableEntry, null);
  assert.equal(move.etcPreparedChildTableEntryOwnerId, 0);
  assert.equal(move.etcPreparedChildTableEntryGeneration, 0);
  assert.equal(move.etcPreparedChildTableEntryTtStores, 0);
}

const defaultEngine = new SearchEngine();
assert.equal(defaultEngine.options.allocationLightSearchMoves, true);

for (const empties of [30, 24, 18, 12]) {
  for (const seed of [1, 3, 5]) {
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    const baselineMoves = state.getSearchMoves();
    const { player, opponent } = state.getPlayerBoards();
    const preparedMoves = listPreparedSearchMoves(player, opponent);

    assert.deepEqual(
      normalizeSearchMoves(preparedMoves),
      normalizeSearchMoves(baselineMoves),
      `Prepared search moves should match baseline at empties=${empties}, seed=${seed}.`,
    );

    for (const move of preparedMoves) {
      assertPreparedShape(move);
    }
  }
}

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 4000,
  randomness: 0,
  maxTableEntries: 300000,
});

for (const [empties, seed] of [[20, 11], [14, 23], [10, 7]]) {
  const state = playSeededRandomUntilEmptyCount(empties, seed);
  const baselineResult = new SearchEngine({
    ...sharedOptions,
    allocationLightSearchMoves: false,
  }).findBestMove(state);
  const candidateResult = new SearchEngine({
    ...sharedOptions,
    allocationLightSearchMoves: true,
  }).findBestMove(state);

  assert.equal(
    candidateResult.bestMoveCoord,
    baselineResult.bestMoveCoord,
    `Best move should match baseline at empties=${empties}, seed=${seed}.`,
  );
  assert.equal(
    candidateResult.score,
    baselineResult.score,
    `Score should match baseline at empties=${empties}, seed=${seed}.`,
  );
  assert.equal(
    candidateResult.searchMode,
    baselineResult.searchMode,
    `Search mode should match baseline at empties=${empties}, seed=${seed}.`,
  );
  assert.equal(
    candidateResult.searchCompletion,
    baselineResult.searchCompletion,
    `Search completion should match baseline at empties=${empties}, seed=${seed}.`,
  );
  assert.equal(
    Number(candidateResult.stats?.nodes ?? -1),
    Number(baselineResult.stats?.nodes ?? -1),
    `Node count should match baseline at empties=${empties}, seed=${seed}.`,
  );
}

const baselineInitialMoves = GameState.initial().getSearchMoves();
const preparedInitialMoves = listPreparedSearchMoves(
  GameState.initial().getPlayerBoards().player,
  GameState.initial().getPlayerBoards().opponent,
);
assert.deepEqual(normalizeSearchMoves(preparedInitialMoves), normalizeSearchMoves(baselineInitialMoves));

console.log('stage122_allocation_light_search_moves_smoke: all assertions passed');
