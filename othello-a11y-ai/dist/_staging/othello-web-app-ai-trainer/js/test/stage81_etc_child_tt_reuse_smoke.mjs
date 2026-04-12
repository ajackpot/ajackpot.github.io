import assert from 'node:assert/strict';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const baseOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 7,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 1600,
  randomness: 0,
  etcInPlaceMovePreparation: true,
};

function countLookupCalls(engine, callback) {
  const originalLookup = engine.lookupTransposition.bind(engine);
  let lookupCalls = 0;
  engine.lookupTransposition = (state) => {
    lookupCalls += 1;
    return originalLookup(state);
  };

  try {
    return {
      value: callback(),
      lookupCalls,
    };
  } finally {
    engine.lookupTransposition = originalLookup;
  }
}

function populateExactChildEntries(engine, state, moves, depth = 2) {
  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index];
    const child = state.applyMoveFast(move.index, move.flips ?? null);
    assert.ok(child, 'Prepared child entry population should only use legal moves.');
    engine.storeTransposition(child, {
      depth,
      value: 12000 - (index * 1500),
      flag: 'exact',
      bestMoveIndex: null,
    });
  }
}

const baselineEngine = new SearchEngine({
  ...baseOptions,
  etcReusePreparedChildTableEntryForOrdering: false,
});
const candidateEngine = new SearchEngine({
  ...baseOptions,
  etcReusePreparedChildTableEntryForOrdering: true,
});

assert.equal(
  baselineEngine.options.etcReusePreparedChildTableEntryForOrdering,
  false,
  'Baseline ETC child-TT reuse toggle should remain disabled when requested.',
);
assert.equal(
  candidateEngine.options.etcReusePreparedChildTableEntryForOrdering,
  true,
  'Candidate ETC child-TT reuse toggle should remain enabled by default.',
);

const sharedState = GameState.initial();
const sharedMoves = sharedState.getSearchMoves();
assert.ok(sharedMoves.length >= 2, 'The ETC child-TT reuse smoke position should expose at least two legal moves.');
populateExactChildEntries(baselineEngine, sharedState, sharedMoves);
populateExactChildEntries(candidateEngine, sharedState, sharedMoves);

const baselineTrace = countLookupCalls(baselineEngine, () => {
  const baselineMoves = sharedMoves.map((move) => ({ ...move }));
  const baselineEtc = baselineEngine.applyEnhancedTranspositionCutoff(
    sharedState,
    baselineMoves,
    3,
    -1_000_000_000,
    1_000_000_000,
    1,
    false,
  );
  assert.ok(baselineEtc, 'The baseline ETC helper should return prepared move metadata on the smoke position.');
  return baselineEngine.orderMoves(sharedState, baselineEtc.moves, 1, 3, null, null, 'general');
});

const candidateTrace = countLookupCalls(candidateEngine, () => {
  const candidateEtc = candidateEngine.applyEnhancedTranspositionCutoff(
    sharedState,
    sharedMoves,
    3,
    -1_000_000_000,
    1_000_000_000,
    1,
    false,
  );
  assert.ok(candidateEtc, 'The candidate ETC helper should return prepared move metadata on the smoke position as well.');
  return candidateEngine.orderMoves(sharedState, candidateEtc.moves, 1, 3, null, null, 'general');
});

assert.ok(
  candidateTrace.lookupCalls < baselineTrace.lookupCalls,
  `ETC child-TT reuse should reduce transposition lookups (${candidateTrace.lookupCalls} < ${baselineTrace.lookupCalls}).`,
);
assert.deepEqual(
  candidateTrace.value.map((move) => move.index),
  baselineTrace.value.map((move) => move.index),
  'ETC child-TT reuse should preserve the final ordering on the smoke position.',
);

const secondCandidateEngine = new SearchEngine({
  ...baseOptions,
  etcReusePreparedChildTableEntryForOrdering: true,
});
populateExactChildEntries(secondCandidateEngine, sharedState, sharedMoves, 2);
const secondTrace = countLookupCalls(secondCandidateEngine, () => {
  const secondEtc = secondCandidateEngine.applyEnhancedTranspositionCutoff(
    sharedState,
    sharedMoves,
    3,
    -1_000_000_000,
    1_000_000_000,
    1,
    false,
  );
  assert.ok(secondEtc, 'A second candidate engine should still be able to reuse the shared move array safely.');
  return secondCandidateEngine.orderMoves(sharedState, secondEtc.moves, 1, 3, null, null, 'general');
});
assert.ok(
  secondTrace.lookupCalls > 0,
  'A different engine instance must ignore stale cached child TT metadata from earlier engines and perform its own TT lookups.',
);

const searchState = playSeededRandomUntilEmptyCount(20, 23);
const baselineResult = baselineEngine.findBestMove(searchState);
const candidateResult = candidateEngine.findBestMove(searchState);

assert.ok(baselineResult.stats.etcNodes > 0, 'Baseline ETC child-TT reuse benchmark search should still exercise ETC.');
assert.ok(candidateResult.stats.etcNodes > 0, 'Candidate ETC child-TT reuse benchmark search should still exercise ETC as well.');
assert.equal(candidateResult.bestMoveIndex, baselineResult.bestMoveIndex, 'ETC child-TT reuse should preserve the chosen move.');
assert.equal(candidateResult.score, baselineResult.score, 'ETC child-TT reuse should preserve the root score.');
assert.deepEqual(candidateResult.principalVariation, baselineResult.principalVariation, 'ETC child-TT reuse should preserve the principal variation on the smoke position.');

console.log('stage81 ETC child-TT reuse smoke passed');
