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
          ttEvictions: 0,
          completedDepth: 0,
          elapsedMs: 0,
          bookHits: 0,
          bookMoves: 0,
          smallSolverCalls: 0,
          smallSolverNodes: 0,
          ttFirstSearches: 0,
          ttFirstCutoffs: 0,
          lmrReductions: 0,
          lmrReSearches: 0,
          lmrFullReSearches: 0,
        },
        options: message.options ?? {},
        source: 'search',
        error: error instanceof Error ? error.message : 'Worker search failed.',
      },
    });
  }
});
