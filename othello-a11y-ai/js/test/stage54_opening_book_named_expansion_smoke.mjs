import assert from 'node:assert/strict';
import { coordToIndex } from '../core/bitboard.js';
import { GameState, createStateFromMoveSequence } from '../core/game-state.js';
import { lookupOpeningBook, getOpeningBookSummary } from '../ai/opening-book.js';
import {
  BASE_OPENING_BOOK_SEED_LINES,
  SUPPLEMENTAL_NAMED_OPENING_BOOK_SEED_LINES,
  OPENING_BOOK_SEED_LINES,
} from '../ai/opening-book-data.js';

function playSequence(sequence) {
  let state = GameState.initial();
  for (let cursor = 0; cursor < sequence.length; cursor += 2) {
    const coord = sequence.slice(cursor, cursor + 2).toUpperCase();
    const outcome = state.applyMove(coordToIndex(coord));
    assert.ok(outcome, `Opening sequence should remain legal at ${coord} (ply ${cursor / 2 + 1}).`);
    state = outcome.state;
  }
  return state;
}

const summary = getOpeningBookSummary();
assert.equal(summary.baseSeedLineCount, BASE_OPENING_BOOK_SEED_LINES.length);
assert.equal(summary.supplementalSeedLineCount, SUPPLEMENTAL_NAMED_OPENING_BOOK_SEED_LINES.length);
assert.equal(summary.seedLineCount, OPENING_BOOK_SEED_LINES.length);
assert.equal(summary.seedLineCount, 111, 'Named expansion should keep the compact book at 111 seed lines.');
assert.ok(summary.positionCount > 600, 'Named expansion should materially deepen the reachable opening positions.');
assert.ok(summary.maxDepthPly >= 20, 'Named expansion should expose at least one 20+ ply continuation.');

const baseSequences = new Set();
for (const seed of BASE_OPENING_BOOK_SEED_LINES) {
  assert.ok(!baseSequences.has(seed.sequence), `Base opening book should not contain duplicate sequences: ${seed.sequence}`);
  baseSequences.add(seed.sequence);
}

const endpointHashes = new Set();
for (const seed of OPENING_BOOK_SEED_LINES) {
  const state = playSequence(seed.sequence);
  const hash = state.hashKey().toString();
  assert.ok(!endpointHashes.has(hash), `Seed endpoints should remain unique after the named expansion: ${seed.name}`);
  endpointHashes.add(hash);
}

for (const seed of SUPPLEMENTAL_NAMED_OPENING_BOOK_SEED_LINES) {
  assert.ok(!baseSequences.has(seed.sequence), `Supplemental sequence should not duplicate a base seed line: ${seed.sequence}`);
  assert.equal(seed.count, 1, `Supplemental named line should keep a low weight: ${seed.name}`);
  assert.equal(seed.percent, 0.0, `Supplemental named line should advertise an explicit zero placeholder frequency: ${seed.name}`);
}

const toriPrefixState = createStateFromMoveSequence('F5 D6 C3 D3 C4 F4 C5 B3 C2 E3 D2 C6 B4');
const toriHit = lookupOpeningBook(toriPrefixState);
assert.ok(toriHit, 'Expanded opening book should expose the supplemental tori branch.');
assert.deepEqual(
  toriHit.candidates.map((candidate) => candidate.coord).slice(0, 2),
  ['A3', 'A4'],
  'Expanded tori branch should offer the hook and straight continuations first.',
);
assert.deepEqual(
  toriHit.candidates.map((candidate) => candidate.topNames[0]?.name).slice(0, 2),
  ['Tori Hook (酉フック)', 'Tori Straight (酉ストレート)'],
  'Expanded tori branch should preserve the named continuations separately.',
);

console.log('stage54 opening-book named expansion smoke: ok');
