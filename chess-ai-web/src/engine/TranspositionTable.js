export class TranspositionTable {
  constructor(maxEntries = 60000) {
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    entry.lastAccess = performance.now();
    return entry;
  }

  set(key, value) {
    if (this.entries.size >= this.maxEntries) {
      this.evictOldest();
    }
    this.entries.set(key, {
      ...value,
      lastAccess: performance.now(),
    });
  }

  evictOldest() {
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.entries.delete(oldestKey);
    }
  }

  clear() {
    this.entries.clear();
  }
}
