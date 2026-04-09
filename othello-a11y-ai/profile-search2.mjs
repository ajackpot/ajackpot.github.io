import { SearchEngine } from './js/ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './js/test/benchmark-helpers.mjs';

let totalNodes = 0;
let totalMs = 0;
for (const empties of [24,22,20,18]) {
  for (let seed = 1; seed <= 10; seed += 1) {
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    const engine = new SearchEngine({
      presetKey: 'custom',
      styleKey: 'balanced',
      maxDepth: empties >= 22 ? 8 : 10,
      timeLimitMs: 100000,
      exactEndgameEmpties: 12,
      aspirationWindow: 40,
      randomness: 0,
      mpcProfile: null,
    });
    const result = engine.findBestMove(state);
    totalNodes += result.stats.nodes;
    totalMs += result.stats.elapsedMs;
  }
}
console.log(JSON.stringify({totalNodes,totalMs}));
