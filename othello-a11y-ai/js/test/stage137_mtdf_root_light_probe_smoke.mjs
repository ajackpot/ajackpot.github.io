import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const state = playSeededRandomUntilEmptyCount(26, 17);
const sharedOptions = {
  presetKey: 'custom',
  searchAlgorithm: 'classic-mtdf-2ply',
  maxDepth: 4,
  timeLimitMs: 600,
  exactEndgameEmpties: 8,
  aspirationWindow: 0,
  randomness: 0,
  openingRandomness: 0,
  searchRandomness: 0,
};

const baselineEngine = new SearchEngine(sharedOptions);
baselineEngine.resolveReusableRootMoveOrdering = () => null;
baselineEngine.storeReusableRootMoveOrdering = () => {};
const originalWithActiveRootSearchContext = baselineEngine.withActiveRootSearchContext.bind(baselineEngine);
baselineEngine.withActiveRootSearchContext = (rootSearchContext, callback) => originalWithActiveRootSearchContext(
  rootSearchContext ? { ...rootSearchContext, collectDetailedRootData: true } : rootSearchContext,
  callback,
);
const baselineResult = baselineEngine.findBestMove(state);

const candidateResult = new SearchEngine(sharedOptions).findBestMove(state);

assert.equal(candidateResult.bestMoveCoord, baselineResult.bestMoveCoord);
assert.equal(candidateResult.score, baselineResult.score);
assert.equal(candidateResult.stats.completedDepth, baselineResult.stats.completedDepth);
assert.ok(candidateResult.stats.mtdfPasses > 0, 'MTD(f) should still execute multiple passes.');
assert.ok(candidateResult.stats.mtdfVerificationPasses > 0, 'The verification pass should still run by default.');
assert.ok(candidateResult.stats.mtdfRootLightPasses > 0, 'Intermediate MTD(f) probes should use the root-light path.');
assert.ok(candidateResult.stats.mtdfRootOrderingCacheHits > 0, 'Root ordering should be reused across MTD(f) passes.');
assert.ok(candidateResult.stats.mtdfRootOrderingCacheMisses > 0, 'The first pass should still prime the root ordering cache.');
assert.ok(candidateResult.analyzedMoves.length > 0, 'The final result should still expose analyzed root moves.');
assert.equal(candidateResult.rootAnalyzedMoveCount, candidateResult.analyzedMoves.length);
assert.equal(candidateResult.searchCompletion, 'complete');

console.log('stage137 mtdf root light probe smoke passed');
