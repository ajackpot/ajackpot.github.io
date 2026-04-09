import fs from 'node:fs';
import { playSeededRandomUntilEmptyCount } from '../../../js/test/benchmark-helpers.mjs';

const targets = [11,12,13,14,15,16,17,18,19];
const lines = [];
let seed = 1;
for (const empties of targets) {
  let accepted = 0;
  while (accepted < 3 && seed < 10000) {
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    const legal = state.getLegalMoves();
    if (!state.isTerminal() && legal.length > 1 && state.getEmptyCount() === empties) {
      lines.push(JSON.stringify({
        black: state.black.toString(),
        white: state.white.toString(),
        currentPlayer: state.currentPlayer,
        consecutivePasses: state.consecutivePasses,
        ply: state.ply,
        target: 0,
      }));
      accepted += 1;
    }
    seed += 1;
  }
}
fs.writeFileSync('tools/evaluator-training/out/stage32_random_late_audit_positions.jsonl', lines.join('\n') + '\n', 'utf8');
console.log(`wrote ${lines.length} positions`);
