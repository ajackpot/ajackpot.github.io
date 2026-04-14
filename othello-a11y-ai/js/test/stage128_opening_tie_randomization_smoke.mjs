import assert from 'node:assert/strict';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import {
  createDefaultCustomDifficultyInputs,
  listCustomDifficultyFieldsForSearchAlgorithm,
  resolveEngineOptionsWithCustomizations,
} from '../ai/presets.js';
import { describeSearchAlgorithm } from '../ai/search-algorithms.js';
import { withMockedRandom } from './special-ending-regression-helpers.mjs';

const defaultDifficultyInputs = createDefaultCustomDifficultyInputs();
assert.equal(
  defaultDifficultyInputs.openingTieBreakRandomization,
  false,
  'custom difficulty should default the opening tie-break randomization toggle to off.',
);

for (const algorithm of ['classic', 'mcts-lite', 'mcts-guided', 'mcts-hybrid']) {
  const fieldKeys = listCustomDifficultyFieldsForSearchAlgorithm(algorithm).map((field) => field.key);
  assert.ok(
    fieldKeys.includes('openingTieBreakRandomization'),
    `${algorithm} custom difficulty should expose the opening tie-break randomization toggle.`,
  );
}

const hardResolved = resolveEngineOptionsWithCustomizations({
  presetKey: 'hard',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
});
assert.equal(
  hardResolved.openingTieBreakRandomization,
  true,
  'hard preset should keep the zero-randomness opening tie-break randomization behavior explicitly enabled.',
);

const customResolved = resolveEngineOptionsWithCustomizations({
  presetKey: 'custom',
  styleKey: 'balanced',
  searchAlgorithm: 'classic',
  customDifficultyInputs: {
    openingTieBreakRandomization: true,
  },
});
assert.equal(
  customResolved.openingTieBreakRandomization,
  true,
  'custom difficulty should preserve the explicit opening tie-break randomization toggle.',
);

assert.equal(
  describeSearchAlgorithm('mcts-guided')?.label,
  'MCTS Guided',
  'guided search should no longer advertise an experimental flag in the UI label.',
);
assert.equal(
  describeSearchAlgorithm('mcts-hybrid')?.label,
  'MCTS Hybrid',
  'hybrid search should no longer advertise an experimental flag in the UI label.',
);
assert.ok(
  !describeSearchAlgorithm('mcts-guided')?.description?.includes('실험'),
  'guided search should no longer mention an experimental flag in the UI description.',
);
assert.ok(
  !describeSearchAlgorithm('mcts-hybrid')?.description?.includes('실험'),
  'hybrid search should no longer mention an experimental flag in the UI description.',
);

const initialState = GameState.initial();

const hardBookResult = withMockedRandom(0.999999, () => (
  new SearchEngine({
    presetKey: 'hard',
    styleKey: 'balanced',
    searchAlgorithm: 'classic',
  }).findBestMove(initialState)
));
assert.equal(hardBookResult.source, 'opening-book', 'The opening tie-break smoke should exercise the direct opening-book path.');
assert.equal(hardBookResult.bestMoveCoord, 'F5', 'A zero-randomness hard preset should still randomize among tied opening-book best moves.');

const customBaseDifficultyInputs = {
  maxDepth: 6,
  timeLimitMs: 1500,
  exactEndgameEmpties: 10,
  wldPreExactEmpties: 0,
  aspirationWindow: 50,
  openingRandomness: 0,
  searchRandomness: 0,
  maxTableEntries: 200000,
};

const customDeterministicResult = withMockedRandom(0.999999, () => (
  new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: 'classic',
    customDifficultyInputs: {
      ...customBaseDifficultyInputs,
      openingTieBreakRandomization: false,
    },
  }).findBestMove(initialState)
));
assert.equal(
  customDeterministicResult.bestMoveCoord,
  'C4',
  'A custom zero-randomness preset should stay deterministic while the tie-break randomization toggle is off.',
);

const customRandomizedResult = withMockedRandom(0.999999, () => (
  new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: 'classic',
    customDifficultyInputs: {
      ...customBaseDifficultyInputs,
      openingTieBreakRandomization: true,
    },
  }).findBestMove(initialState)
));
assert.equal(
  customRandomizedResult.bestMoveCoord,
  'F5',
  'A custom zero-randomness preset should recover the tied opening-book randomization when the toggle is on.',
);

console.log('stage128 opening tie randomization smoke passed');
