import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const state = playSeededRandomUntilEmptyCount(24, 17);

const classicResult = new SearchEngine({
  presetKey: 'custom',
  searchAlgorithm: 'classic',
  maxDepth: 5,
  timeLimitMs: 80,
  exactEndgameEmpties: 8,
  aspirationWindow: 50,
  randomness: 0,
}).findBestMove(state);

const mtdfResult = new SearchEngine({
  presetKey: 'custom',
  searchAlgorithm: 'classic-mtdf',
  maxDepth: 5,
  timeLimitMs: 80,
  exactEndgameEmpties: 8,
  aspirationWindow: 50,
  randomness: 0,
}).findBestMove(state);

const mtdf2Result = new SearchEngine({
  presetKey: 'custom',
  searchAlgorithm: 'classic-mtdf-2ply',
  maxDepth: 5,
  timeLimitMs: 80,
  exactEndgameEmpties: 8,
  aspirationWindow: 50,
  randomness: 0,
}).findBestMove(state);

assert.equal(classicResult.options.searchAlgorithm, 'classic');
assert.equal(classicResult.options.classicSearchDriver, 'pvs');
assert.equal(classicResult.stats.mtdfPasses, 0);

assert.equal(mtdfResult.options.searchAlgorithm, 'classic-mtdf');
assert.equal(mtdfResult.options.classicSearchDriver, 'mtdf');
assert.equal(mtdfResult.options.classicMtdfGuessPlyOffset, 1);
assert.ok(mtdfResult.stats.mtdfPasses > 0);
assert.equal(mtdfResult.searchDriver, 'mtdf');

assert.equal(mtdf2Result.options.searchAlgorithm, 'classic-mtdf-2ply');
assert.equal(mtdf2Result.options.classicSearchDriver, 'mtdf');
assert.equal(mtdf2Result.options.classicMtdfGuessPlyOffset, 2);
assert.ok(mtdf2Result.stats.mtdfPasses > 0);
assert.equal(mtdf2Result.searchDriver, 'mtdf');

console.log('stage132 classic mtdf search driver smoke passed');
