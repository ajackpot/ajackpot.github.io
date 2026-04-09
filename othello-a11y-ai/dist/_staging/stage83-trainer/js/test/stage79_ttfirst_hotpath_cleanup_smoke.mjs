import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const baseOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 1200,
  randomness: 0,
};

const baselineEngine = new SearchEngine({
  ...baseOptions,
  ttFirstInPlaceMoveExtraction: false,
});
const candidateEngine = new SearchEngine({
  ...baseOptions,
  ttFirstInPlaceMoveExtraction: true,
});

assert.equal(baselineEngine.options.ttFirstInPlaceMoveExtraction, false, 'Baseline toggle should remain disabled when requested.');
assert.equal(candidateEngine.options.ttFirstInPlaceMoveExtraction, true, 'Candidate toggle should remain enabled by default.');

const sampleMoves = [
  { index: 11 },
  { index: 23 },
  { index: 31 },
  { index: 44 },
];
const baselineExtraction = baselineEngine.pullPreferredMove(sampleMoves.map((move) => ({ ...move })), 31);
const candidateExtraction = candidateEngine.pullPreferredMove(sampleMoves.map((move) => ({ ...move })), 31);
assert.equal(baselineExtraction.preferredMove?.index, 31, 'Baseline helper should still find the preferred move.');
assert.equal(candidateExtraction.preferredMove?.index, 31, 'Candidate helper should still find the preferred move.');
assert.deepEqual(
  baselineExtraction.remainingMoves.map((move) => move.index),
  [11, 23, 44],
  'Baseline helper should preserve the remaining move order.',
);
assert.deepEqual(
  candidateExtraction.remainingMoves.map((move) => move.index),
  [11, 23, 44],
  'In-place TT-first extraction should preserve remaining move order as well.',
);

const state = playSeededRandomUntilEmptyCount(20, 23);
const expectedLegalMoveCount = state.getSearchMoves().length;
assert.ok(expectedLegalMoveCount >= 2, 'The TT-first smoke position should expose at least two legal moves.');

const baselineFirst = baselineEngine.findBestMove(state);
const baselineSecond = baselineEngine.findBestMove(state);
const candidateFirst = candidateEngine.findBestMove(state);
const candidateSecond = candidateEngine.findBestMove(state);

assert.equal(baselineFirst.rootLegalMoveCount, expectedLegalMoveCount, 'Baseline first search should preserve the root legal-move count.');
assert.equal(baselineSecond.rootLegalMoveCount, expectedLegalMoveCount, 'Baseline repeated search should preserve the root legal-move count.');
assert.equal(candidateFirst.rootLegalMoveCount, expectedLegalMoveCount, 'Candidate first search should preserve the root legal-move count.');
assert.equal(candidateSecond.rootLegalMoveCount, expectedLegalMoveCount, 'Candidate repeated search should preserve the root legal-move count.');

assert.ok(baselineSecond.stats.ttFirstSearches > 0, 'Baseline repeated search should still exercise TT-first ordering.');
assert.ok(candidateSecond.stats.ttFirstSearches > 0, 'Candidate repeated search should still exercise TT-first ordering.');
assert.equal(candidateSecond.bestMoveIndex, baselineSecond.bestMoveIndex, 'TT-first extraction cleanup should preserve the chosen move.');
assert.equal(candidateSecond.score, baselineSecond.score, 'TT-first extraction cleanup should preserve the root score.');
assert.deepEqual(candidateSecond.principalVariation, baselineSecond.principalVariation, 'TT-first extraction cleanup should preserve the PV on the smoke position.');

console.log('stage79 TT-first hotpath cleanup smoke passed');
