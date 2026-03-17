import { OPENING_LINES } from '../data/openingLines.js';

class OpeningBookNode {
  constructor() {
    this.children = new Map();
    this.weight = 0;
    this.name = '';
  }
}

export class OpeningBook {
  constructor(lines = OPENING_LINES) {
    this.root = new OpeningBookNode();
    this.#build(lines);
  }

  #build(lines) {
    for (const entry of lines) {
      const repetitions = Math.max(1, entry.weight ?? 1);
      for (let repeat = 0; repeat < repetitions; repeat += 1) {
        let node = this.root;
        for (const move of entry.line) {
          if (!node.children.has(move)) {
            node.children.set(move, new OpeningBookNode());
          }
          node = node.children.get(move);
          node.weight += 1;
          node.name = entry.name;
        }
      }
    }
  }

  getMove(historyLan = [], rng = Math.random) {
    let node = this.root;
    for (const move of historyLan) {
      node = node.children.get(move);
      if (!node) {
        return null;
      }
    }

    if (!node.children.size) {
      return null;
    }

    const candidates = [...node.children.entries()].map(([move, child]) => ({
      move,
      weight: child.weight,
      name: child.name,
    }));

    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let pick = rng() * total;
    for (const candidate of candidates) {
      pick -= candidate.weight;
      if (pick <= 0) {
        return candidate;
      }
    }

    return candidates.at(-1);
  }
}
