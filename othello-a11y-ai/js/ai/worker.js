import { GameState } from '../core/game-state.js';
import { SearchEngine } from './search-engine.js';

const engine = new SearchEngine();

self.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || message.type !== 'search') {
    return;
  }

  try {
    const state = GameState.fromSerializable(message.state);
    const result = engine.findBestMove(state, message.options ?? {});
    self.postMessage({
      type: 'result',
      token: message.token,
      result,
    });
  } catch (error) {
    self.postMessage({
      type: 'result',
      token: message.token,
      result: {
        bestMoveIndex: null,
        bestMoveCoord: null,
        score: 0,
        principalVariation: [],
        analyzedMoves: [],
        didPass: false,
        stats: {
          nodes: 0,
          cutoffs: 0,
          ttHits: 0,
          ttStores: 0,
          completedDepth: 0,
          elapsedMs: 0,
        },
        options: message.options ?? {},
        error: error instanceof Error ? error.message : 'Worker search failed.',
      },
    });
  }
});
