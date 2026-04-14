import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const state = playSeededRandomUntilEmptyCount(40, 221);
const sharedOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  timeLimitMs: 1600,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  openingRandomness: 0,
  searchRandomness: 0,
};

const pvsResult = new SearchEngine({
  ...sharedOptions,
  searchAlgorithm: 'classic',
}).findBestMove(state);

const mtdfResult = new SearchEngine({
  ...sharedOptions,
  searchAlgorithm: 'classic-mtdf-2ply',
}).findBestMove(state);

assert.equal(pvsResult.bestMoveCoord, 'G3');
assert.equal(mtdfResult.bestMoveCoord, pvsResult.bestMoveCoord);
assert.equal(mtdfResult.score, pvsResult.score);
assert.ok(mtdfResult.stats.mtdfPasses > 0, 'MTD(f) should still execute iterative zero-window passes.');
assert.ok(mtdfResult.stats.mtdfVerificationPasses > 0, 'MTD(f) verification should still run.');
assert.equal(mtdfResult.options.enhancedTranspositionCutoff, true, 'ETC should remain enabled globally and only be suppressed contextually.');

console.log('stage139 mtdf etc suppression smoke passed');
