export class EngineWorkerClient {
  constructor() {
    this.worker = null;
    this.pending = null;
    this.#createWorker();
  }

  #createWorker() {
    this.worker = new Worker(new URL('../workers/engine-worker.js', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', (event) => this.#handleMessage(event));
    this.worker.addEventListener('error', (event) => {
      if (this.pending) {
        this.pending.reject(new Error(event.message || '엔진 워커 오류가 발생했습니다.'));
        this.pending = null;
      }
      this.#recreateWorker();
    });
  }

  #recreateWorker() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    this.#createWorker();
  }

  #handleMessage(event) {
    const { type, payload } = event.data ?? {};
    if (!this.pending) {
      return;
    }

    if (type === 'info') {
      this.pending.onInfo?.(payload);
      return;
    }

    if (type === 'bestmove') {
      this.pending.resolve(payload);
      this.pending = null;
      return;
    }

    if (type === 'error') {
      this.pending.reject(new Error(payload?.message ?? '엔진 분석 중 오류가 발생했습니다.'));
      this.pending = null;
      this.#recreateWorker();
    }
  }

  search(payload, onInfo) {
    this.stop();

    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, onInfo };
      this.worker.postMessage({ type: 'search', payload });
    });
  }

  stop() {
    if (!this.pending) {
      return;
    }

    this.pending.reject(new Error('SEARCH_CANCELLED'));
    this.pending = null;
    this.#recreateWorker();
  }

  destroy() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
