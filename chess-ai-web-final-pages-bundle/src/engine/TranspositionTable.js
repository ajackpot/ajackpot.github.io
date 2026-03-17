export const TT_FLAG = Object.freeze({
  EXACT: 'exact',
  LOWER: 'lower',
  UPPER: 'upper',
});

export class TranspositionTable {
  constructor(maxEntries = 80000) {
    this.maxEntries = maxEntries;
    this.table = new Map();
  }

  clear() {
    this.table.clear();
  }

  get size() {
    return this.table.size;
  }

  get fillRatio() {
    return this.table.size / this.maxEntries;
  }

  get(key) {
    return this.table.get(key);
  }

  set(key, entry) {
    const existing = this.table.get(key);
    if (existing && existing.depth > entry.depth) {
      return;
    }

    this.table.set(key, { ...entry, age: performance.now() });

    if (this.table.size <= this.maxEntries) {
      return;
    }

    const pruneCount = Math.floor(this.maxEntries * 0.15);
    const keys = this.table.keys();
    for (let index = 0; index < pruneCount; index += 1) {
      const oldestKey = keys.next().value;
      if (!oldestKey) {
        break;
      }
      this.table.delete(oldestKey);
    }
  }
}
