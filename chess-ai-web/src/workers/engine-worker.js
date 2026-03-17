import { AstraEngine } from '../engine/AstraEngine.js';

const engine = new AstraEngine();

self.addEventListener('message', (event) => {
  const { type, payload } = event.data ?? {};

  if (type !== 'search') {
    return;
  }

  try {
    const result = engine.search({
      ...payload,
      infoCallback: (info) => {
        self.postMessage({ type: 'info', payload: info });
      },
    });

    self.postMessage({ type: 'bestmove', payload: result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : '',
      },
    });
  }
});
