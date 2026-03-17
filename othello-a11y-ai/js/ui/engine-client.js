import { SearchEngine } from '../ai/search-engine.js';
import { GameState } from '../core/game-state.js';

export class SearchCanceledError extends Error {
  constructor(message = 'Search canceled.') {
    super(message);
    this.name = 'SearchCanceledError';
  }
}

export class EngineClient {
  constructor() {
    this.localEngine = new SearchEngine();
    this.pending = null;
    this.nextToken = 1;
    this.workerAvailable = typeof Worker !== 'undefined';

    if (this.workerAvailable) {
      try {
        this.createWorker();
      } catch (error) {
        this.workerAvailable = false;
      }
    }
  }

  createWorker() {
    this.worker = new Worker(new URL('../ai/worker.js', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', (event) => this.handleWorkerMessage(event));
    this.worker.addEventListener('error', (event) => this.handleWorkerError(event));
  }

  handleWorkerMessage(event) {
    const message = event.data;
    if (!this.pending || !message || message.token !== this.pending.token) {
      return;
    }

    const { resolve } = this.pending;
    this.pending = null;
    resolve(message.result);
  }

  handleWorkerError(event) {
    if (this.pending) {
      const { reject } = this.pending;
      this.pending = null;
      reject(event.error ?? new Error(event.message ?? 'Worker error.'));
    }

    this.disposeWorker();
    this.workerAvailable = false;
  }

  disposeWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  cancel() {
    if (this.pending) {
      const { reject } = this.pending;
      this.pending = null;
      reject(new SearchCanceledError());
    }

    if (this.workerAvailable) {
      this.disposeWorker();
      this.createWorker();
    }
  }

  async search(state, options) {
    if (!(state instanceof GameState)) {
      throw new TypeError('EngineClient.search expects a GameState instance.');
    }

    if (this.pending) {
      this.cancel();
    }

    if (!this.workerAvailable) {
      return this.localEngine.findBestMove(state, options);
    }

    const token = this.nextToken;
    this.nextToken += 1;

    return new Promise((resolve, reject) => {
      this.pending = { token, resolve, reject };
      this.worker.postMessage({
        type: 'search',
        token,
        state: state.toSerializable(),
        options,
      });
    });
  }
}
