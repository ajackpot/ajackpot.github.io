import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';

const easy = new SearchEngine({ presetKey: 'easy' });
const normal = new SearchEngine({ presetKey: 'normal' });
const hard = new SearchEngine({ presetKey: 'hard' });

assert.equal(easy.options.searchAlgorithm, 'classic-mtdf-2ply');
assert.equal(normal.options.searchAlgorithm, 'classic-mtdf-2ply');
assert.equal(hard.options.searchAlgorithm, 'classic-mtdf-2ply');
assert.equal(easy.options.classicSearchDriver, 'mtdf');
assert.equal(normal.options.classicSearchDriver, 'mtdf');
assert.equal(hard.options.classicSearchDriver, 'mtdf');
assert.equal(easy.options.classicMtdfGuessPlyOffset, 2);
assert.equal(normal.options.classicMtdfGuessPlyOffset, 2);
assert.equal(hard.options.classicMtdfGuessPlyOffset, 2);
assert.equal(easy.options.aspirationWindow, 0);
assert.equal(normal.options.aspirationWindow, 0);
assert.equal(hard.options.aspirationWindow, 0);

const pvsEasy = new SearchEngine({ presetKey: 'easy', searchAlgorithm: 'classic' });
const pvsNormal = new SearchEngine({ presetKey: 'normal', searchAlgorithm: 'classic' });
const pvsHard = new SearchEngine({ presetKey: 'hard', searchAlgorithm: 'classic' });

assert.equal(pvsEasy.options.searchAlgorithm, 'classic');
assert.equal(pvsNormal.options.searchAlgorithm, 'classic');
assert.equal(pvsHard.options.searchAlgorithm, 'classic');
assert.equal(pvsEasy.options.classicSearchDriver, 'pvs');
assert.equal(pvsNormal.options.classicSearchDriver, 'pvs');
assert.equal(pvsHard.options.classicSearchDriver, 'pvs');
assert.equal(pvsEasy.options.aspirationWindow, 0);
assert.equal(pvsNormal.options.aspirationWindow, 0);
assert.equal(pvsHard.options.aspirationWindow, 0);

console.log('stage138 release search defaults smoke passed');
