import { ChessJsAdapter } from '../domain/ChessJsAdapter.js';
import { HybridPuctEngine } from './HybridPuctEngine.js';
import { MovePrior } from './MovePrior.js';
import { OpeningBook } from './OpeningBook.js';
import { StaticEvaluator } from './StaticEvaluator.js';
import { TranspositionTable } from './TranspositionTable.js';
import { Zobrist } from './Zobrist.js';

const adapter = new ChessJsAdapter();
const evaluator = new StaticEvaluator({ adapter });
const movePrior = new MovePrior({ adapter, evaluator });
const transpositionTable = new TranspositionTable();
const zobrist = new Zobrist();
const openingBook = new OpeningBook({ adapter });

self.addEventListener('message', (event) => {
  const { type, requestId, fen, config } = event.data ?? {};

  if (type !== 'search') {
    return;
  }

  try {
    const engine = new HybridPuctEngine({
      adapter,
      evaluator,
      movePrior,
      transpositionTable,
      zobrist,
      openingBook,
      config,
      onProgress: (progress) => {
        self.postMessage({
          type: 'progress',
          requestId,
          progress,
        });
      },
    });

    const result = engine.search(fen);

    self.postMessage({
      type: 'result',
      requestId,
      result,
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
