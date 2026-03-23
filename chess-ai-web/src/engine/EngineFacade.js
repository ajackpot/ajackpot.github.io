export class EngineFacade {
  constructor() {
    this.pendingRequests = new Map();
    this.requestSequence = 0;
    this.worker = null;
    this.boundMessageHandler = (event) => this.handleWorkerMessage(event.data);
    this.boundErrorHandler = (event) => this.handleWorkerError(event);
    this.createWorker();
  }

  createWorker() {
    this.disposeWorker();
    this.worker = new Worker(new URL('./engine.worker.js', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', this.boundMessageHandler);
    this.worker.addEventListener('error', this.boundErrorHandler);
  }

  disposeWorker() {
    if (!this.worker) {
      return;
    }

    this.worker.removeEventListener('message', this.boundMessageHandler);
    this.worker.removeEventListener('error', this.boundErrorHandler);
    this.worker.terminate();
    this.worker = null;
  }

  search({ fen, config, onProgress }) {
    if (!this.worker) {
      this.createWorker();
    }

    const requestId = `search-${this.requestSequence += 1}`;

    const promise = new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        onProgress,
      });

      this.worker.postMessage({
        type: 'search',
        requestId,
        fen,
        config,
      });
    });

    return {
      requestId,
      promise,
    };
  }

  cancelAll() {
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error('search-cancelled'));
      this.pendingRequests.delete(requestId);
    }

    this.createWorker();
  }

  handleWorkerMessage(data) {
    const pending = this.pendingRequests.get(data.requestId);
    if (!pending) {
      return;
    }

    if (data.type === 'progress') {
      pending.onProgress?.(data.progress);
      return;
    }

    if (data.type === 'result') {
      this.pendingRequests.delete(data.requestId);
      pending.resolve(data.result);
      return;
    }

    if (data.type === 'error') {
      this.pendingRequests.delete(data.requestId);
      pending.reject(new Error(data.message));
      this.createWorker();
    }
  }

  handleWorkerError(event) {
    const message = event instanceof ErrorEvent && event.message ? event.message : 'engine-worker-error';

    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error(message));
      this.pendingRequests.delete(requestId);
    }

    this.createWorker();
  }
}
