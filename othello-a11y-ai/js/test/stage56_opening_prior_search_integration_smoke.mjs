import assert from 'node:assert/strict';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import { lookupOpeningPrior } from '../ai/opening-prior.js';
import { resolveEngineOptions } from '../ai/presets.js';

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
    openingRandomness: 0,
    searchRandomness: 0,
  });

  for (let plies = 13; plies <= 32; plies += 1) {
    const state = playDeterministicPly(GameState.initial(), plies);
    const result = probeEngine.findBestMove(state, {
      presetKey: 'custom',
      maxDepth: 4,
      timeLimitMs: 600,
      exactEndgameEmpties: 8,
      aspirationWindow: 40,
      openingRandomness: 0,
      searchRandomness: 0,
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

function findSearchModePriorState() {
  const probeEngine = new SearchEngine({
    presetKey: 'custom',
    maxDepth: 3,
    timeLimitMs: 400,
    exactEndgameEmpties: 8,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
  });

  for (let plies = 3; plies <= 18; plies += 1) {
    const state = playDeterministicPly(GameState.initial(), plies);
    if (!lookupOpeningPrior(state)) {
      continue;
    }

    const result = probeEngine.findBestMove(state, {
      presetKey: 'custom',
      maxDepth: 3,
      timeLimitMs: 400,
      exactEndgameEmpties: 8,
      aspirationWindow: 0,
      openingRandomness: 0,
      searchRandomness: 0,
      styleKey: 'balanced',
    });

    if (result.source === 'search' && result.openingPriorHit) {
      return { state, result };
    }
  }

  return null;
}

const customResolved = resolveEngineOptions('custom', {
  openingRandomness: 7,
  searchRandomness: 33,
}, 'balanced');
assert.equal(customResolved.openingRandomness, 7);
assert.equal(customResolved.searchRandomness, 33);
assert.equal(customResolved.randomness, 33, 'legacy randomness alias should follow searchRandomness');

const legacyResolved = resolveEngineOptions('custom', {
  randomness: 11,
}, 'balanced');
assert.equal(legacyResolved.openingRandomness, 11, 'legacy custom randomness should map into openingRandomness');
assert.equal(legacyResolved.searchRandomness, 11, 'legacy custom randomness should map into searchRandomness');
assert.equal(legacyResolved.randomness, 11);

const initialState = GameState.initial();
const initialPrior = lookupOpeningPrior(initialState);
assert.ok(initialPrior, 'installed opening prior should resolve the initial board');
assert.equal(initialPrior.moves.length, 4, 'symmetry-expanded initial prior should expose all four opening moves');
const initialPriorCoords = new Set(initialPrior.moves.map((move) => move.coord));
for (const coord of ['C4', 'D3', 'E6', 'F5']) {
  assert.ok(initialPriorCoords.has(coord), `initial prior should contain ${coord}`);
}
const initialLegalMoves = new Set(initialState.getLegalMoves().map((move) => move.coord));
for (const coord of initialPriorCoords) {
  assert.ok(initialLegalMoves.has(coord), `initial prior move ${coord} should be legal on the initial board`);
}

const openingEngine = new SearchEngine({
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 400,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  openingRandomness: 0,
  searchRandomness: 0,
});

const deterministicOpening = openingEngine.findBestMove(initialState, {
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 400,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  openingRandomness: 0,
  searchRandomness: 0,
  styleKey: 'balanced',
});
assert.equal(deterministicOpening.source, 'opening-book');
assert.ok(deterministicOpening.openingPriorHit, 'opening-book direct result should still surface opening prior metadata');

const randomizedOpening = withMockedRandom(0.999999, () => openingEngine.findBestMove(initialState, {
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 400,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  openingRandomness: 60,
  searchRandomness: 0,
  styleKey: 'balanced',
}));
assert.equal(randomizedOpening.source, 'opening-book');
assert.notEqual(
  randomizedOpening.bestMoveCoord,
  deterministicOpening.bestMoveCoord,
  'openingRandomness should be able to vary direct opening-book choices on the initial board',
);

const searchOnlyRandomOpening = withMockedRandom(0.999999, () => openingEngine.findBestMove(initialState, {
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 400,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  openingRandomness: 0,
  searchRandomness: 400,
  styleKey: 'balanced',
}));
assert.equal(searchOnlyRandomOpening.source, 'opening-book');
assert.equal(
  searchOnlyRandomOpening.bestMoveCoord,
  deterministicOpening.bestMoveCoord,
  'searchRandomness should not affect direct opening-book selection when openingRandomness is zero',
);

const searchRegressionState = findSearchRandomnessRegressionState();
assert.ok(searchRegressionState, 'should find a search state with at least two near-best root moves');
const searchEngine = new SearchEngine({
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 600,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  openingRandomness: 0,
  searchRandomness: 0,
});

const deterministicSearch = searchEngine.findBestMove(searchRegressionState, {
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 600,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  openingRandomness: 0,
  searchRandomness: 0,
  styleKey: 'balanced',
});
assert.equal(deterministicSearch.source, 'search');

const openingOnlyRandomSearch = withMockedRandom(0.999999, () => searchEngine.findBestMove(searchRegressionState, {
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 600,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  openingRandomness: 120,
  searchRandomness: 0,
  styleKey: 'balanced',
}));
assert.equal(
  openingOnlyRandomSearch.bestMoveIndex,
  deterministicSearch.bestMoveIndex,
  'openingRandomness should not affect midgame root selection when the engine is already in search mode',
);

const randomizedSearch = withMockedRandom(0.999999, () => searchEngine.findBestMove(searchRegressionState, {
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 600,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  openingRandomness: 0,
  searchRandomness: 60,
  styleKey: 'balanced',
}));
assert.notEqual(
  randomizedSearch.bestMoveIndex,
  deterministicSearch.bestMoveIndex,
  'searchRandomness should still vary near-best root moves in search mode',
);

const searchModePriorProbe = findSearchModePriorState();
assert.ok(searchModePriorProbe, 'should find a search-mode state that still carries opening prior metadata');
assert.ok(searchModePriorProbe.result.openingPriorHit);
assert.ok(searchModePriorProbe.result.openingPriorHit.candidateCount > 0);
assert.equal(searchModePriorProbe.result.openingPriorHit.usedDirectly, false);

console.log('stage56 opening prior search integration smoke passed');
