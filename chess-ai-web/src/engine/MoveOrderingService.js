import { isCapture, isPromotion, isQuietMove, moveKey, mvvLvaScore } from '../shared/chess-utils.js';

export class MoveOrderingService {
  constructor(maxDepth = 64) {
    this.maxDepth = maxDepth;
    this.killers = Array.from({ length: maxDepth }, () => ['', '']);
    this.history = new Map();
  }

  clear() {
    this.killers = Array.from({ length: this.maxDepth }, () => ['', '']);
    this.history.clear();
  }

  orderMoves(moves, { ttMove = '', ply = 0 } = {}) {
    return [...moves].sort((left, right) => {
      return this.#scoreMove(right, ttMove, ply) - this.#scoreMove(left, ttMove, ply);
    });
  }

  recordCutoff(move, depth, ply) {
    const key = moveKey(move);
    if (isQuietMove(move)) {
      const slot = this.killers[ply] ?? ['', ''];
      if (slot[0] !== key) {
        this.killers[ply] = [key, slot[0]];
      }

      const historyKey = `${move.color}:${key}`;
      const bonus = depth * depth;
      this.history.set(historyKey, (this.history.get(historyKey) ?? 0) + bonus);
    }
  }

  #scoreMove(move, ttMove, ply) {
    const key = moveKey(move);
    if (key === ttMove) {
      return 1_000_000;
    }

    if (isPromotion(move)) {
      return 900_000 + mvvLvaScore(move);
    }

    if (isCapture(move)) {
      return 800_000 + mvvLvaScore(move);
    }

    const killers = this.killers[ply] ?? ['', ''];
    if (key === killers[0]) {
      return 700_000;
    }
    if (key === killers[1]) {
      return 690_000;
    }

    if (move.san?.includes('+')) {
      return 600_000;
    }

    const historyKey = `${move.color}:${key}`;
    return this.history.get(historyKey) ?? 0;
  }
}
