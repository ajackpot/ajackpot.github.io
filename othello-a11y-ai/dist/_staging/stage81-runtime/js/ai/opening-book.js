import {
  coordToIndex,
  indexToCoord,
  indexToRowCol,
  rowColToIndex,
} from '../core/bitboard.js';
import { GameState } from '../core/game-state.js';
import { OPENING_BOOK_METADATA, OPENING_BOOK_SEED_LINES } from './opening-book-data.js';

export const OPENING_BOOK_DIRECT_USE_MAX_PLY = 12;
export const OPENING_BOOK_ADVISORY_MAX_PLY = 18;

const TRANSFORMS = Object.freeze([
  ({ row, col }) => ({ row, col }),
  ({ row, col }) => ({ row: 7 - row, col: 7 - col }),
  ({ row, col }) => ({ row: col, col: row }),
  ({ row, col }) => ({ row: 7 - col, col: 7 - row }),
]);

function parseSequence(sequenceText) {
  if (typeof sequenceText !== 'string' || sequenceText.length % 2 !== 0) {
    throw new Error(`Invalid opening book sequence: ${sequenceText}`);
  }

  const indices = [];
  for (let cursor = 0; cursor < sequenceText.length; cursor += 2) {
    const coord = sequenceText.slice(cursor, cursor + 2);
    const index = coordToIndex(coord);
    if (index < 0) {
      throw new Error(`Invalid opening book coordinate: ${coord}`);
    }
    indices.push(index);
  }
  return indices;
}

function transformIndex(index, transform) {
  const { row, col } = indexToRowCol(index);
  const next = transform({ row, col });
  return rowColToIndex(next.row, next.col);
}

function uniqueTransformedSequences(indices) {
  const unique = new Map();
  for (const transform of TRANSFORMS) {
    const transformed = indices.map((index) => transformIndex(index, transform));
    const key = transformed.join(',');
    if (!unique.has(key)) {
      unique.set(key, transformed);
    }
  }
  return [...unique.values()];
}

function addWeight(weightMap, key, amount) {
  weightMap.set(key, (weightMap.get(key) ?? 0) + amount);
}

function sortWeightedNames(weightMap) {
  return [...weightMap.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([name, weight]) => ({ name, weight }));
}

function buildOpeningBook() {
  const tempBook = new Map();
  let maxDepthPly = 0;

  for (const seed of OPENING_BOOK_SEED_LINES) {
    const moveIndices = parseSequence(seed.sequence);
    const variants = uniqueTransformedSequences(moveIndices);

    for (const variant of variants) {
      let state = GameState.initial();
      for (let ply = 0; ply < variant.length; ply += 1) {
        const moveIndex = variant[ply];
        const key = state.hashKey();
        let entry = tempBook.get(key);
        if (!entry) {
          entry = {
            candidates: new Map(),
            openingNames: new Map(),
            depthPly: state.moveHistory.length,
          };
          tempBook.set(key, entry);
        }

        entry.depthPly = Math.max(entry.depthPly, state.moveHistory.length);
        addWeight(entry.openingNames, seed.name, seed.count);

        let candidate = entry.candidates.get(moveIndex);
        if (!candidate) {
          candidate = {
            moveIndex,
            weight: 0,
            lineCount: 0,
            nameWeights: new Map(),
          };
          entry.candidates.set(moveIndex, candidate);
        }

        candidate.weight += seed.count;
        candidate.lineCount += 1;
        addWeight(candidate.nameWeights, seed.name, seed.count);

        const outcome = state.applyMove(moveIndex);
        if (!outcome) {
          throw new Error(`Illegal move in opening book seed ${seed.sequence} at ply ${ply + 1}.`);
        }
        state = outcome.state;
        maxDepthPly = Math.max(maxDepthPly, state.moveHistory.length);
      }
    }
  }

  const finalizedBook = new Map();
  for (const [key, entry] of tempBook.entries()) {
    const candidates = [...entry.candidates.values()]
      .map((candidate) => ({
        moveIndex: candidate.moveIndex,
        coord: indexToCoord(candidate.moveIndex),
        weight: candidate.weight,
        lineCount: candidate.lineCount,
        topNames: sortWeightedNames(candidate.nameWeights).slice(0, 3),
      }))
      .sort((left, right) => {
        if (right.weight !== left.weight) {
          return right.weight - left.weight;
        }
        return left.coord.localeCompare(right.coord);
      });

    finalizedBook.set(key, Object.freeze({
      depthPly: entry.depthPly,
      candidateCount: candidates.length,
      totalWeight: candidates.reduce((sum, candidate) => sum + candidate.weight, 0),
      topNames: sortWeightedNames(entry.openingNames).slice(0, 5),
      candidates: Object.freeze(candidates.map((candidate) => Object.freeze(candidate))),
    }));
  }

  return Object.freeze({
    map: finalizedBook,
    summary: Object.freeze({
      ...OPENING_BOOK_METADATA,
      positionCount: finalizedBook.size,
      maxDepthPly,
    }),
  });
}

let cachedBook = null;

function ensureBook() {
  if (!cachedBook) {
    cachedBook = buildOpeningBook();
  }
  return cachedBook;
}

export function lookupOpeningBook(state) {
  if (!(state instanceof GameState)) {
    throw new TypeError('lookupOpeningBook expects a GameState instance.');
  }
  return ensureBook().map.get(state.hashKey()) ?? null;
}

export function getOpeningBookSummary() {
  return ensureBook().summary;
}
