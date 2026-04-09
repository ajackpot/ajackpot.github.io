import fs from 'fs';
import { createStateFromPerspectiveBoardString } from './tools/evaluator-training/lib.mjs';
import { SearchEngine } from './js/ai/search-engine.js';
import { indexFromBit, bitFromIndex } from './js/core/bitboard.js';
import { listLegalSearchMoves, getInitialBoards } from './js/core/rules.js';

const lines = fs.readFileSync('./tools/evaluator-training/out/sample-smoke.jsonl', 'utf8').trim().split(/\n+/).slice(0, 10).map((line) => JSON.parse(line));
const positions = lines.map((record) => createStateFromPerspectiveBoardString(record.board));

function time(label, fn) {
  const startedAt = performance.now();
  const result = fn();
  const elapsedMs = performance.now() - startedAt;
  console.log(label, elapsedMs.toFixed(2), JSON.stringify(result));
}

const sampleBits = Array.from({ length: 64 }, (_, index) => bitFromIndex(index));

time('indexFromBit 1e6', () => {
  let sum = 0;
  for (let repeat = 0; repeat < 15625; repeat += 1) {
    for (const bit of sampleBits) {
      sum += indexFromBit(bit);
    }
  }
  return { sum };
});

const initialBoards = getInitialBoards();
time('listLegalSearchMoves 1e5 initial', () => {
  let total = 0;
  for (let repeat = 0; repeat < 100000; repeat += 1) {
    total += listLegalSearchMoves(initialBoards.black, initialBoards.white).length;
  }
  return { total };
});

const searchOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  timeLimitMs: 60000,
  exactEndgameEmpties: 10,
  aspirationWindow: 50,
  randomness: 0,
  maxTableEntries: 200000,
};

time('search 10 positions depth6 custom', () => {
  const engine = new SearchEngine(searchOptions);
  let sum = 0;
  for (const position of positions) {
    const result = engine.findBestMove(position);
    sum += result.score + (result.stats.nodes ?? 0);
  }
  return { sum };
});
