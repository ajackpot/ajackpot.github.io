import { GameState } from '../core/game-state.js';
import { SearchEngine, createEmptySearchStats } from './search-engine.js';
import { ACTIVE_MPC_PROFILE } from './evaluation-profiles.js';

const engine = new SearchEngine();

self.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || message.type !== 'search') {
    return;
  }

  try {
    const state = GameState.fromSerializable(message.state);
    const effectiveOptions = message.options && Object.hasOwn(message.options, 'mpcProfile')
      ? message.options
      : {
        ...(message.options ?? {}),
        mpcProfile: ACTIVE_MPC_PROFILE ?? null,
      };
    const result = engine.findBestMove(state, effectiveOptions);
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
        stats: createEmptySearchStats(),
        options: message.options && Object.hasOwn(message.options, 'mpcProfile')
          ? message.options
          : {
            ...(message.options ?? {}),
            mpcProfile: ACTIVE_MPC_PROFILE ?? null,
          },
        source: 'search',
        error: error instanceof Error ? error.message : 'Worker search failed.',
      },
    });
  }
});
