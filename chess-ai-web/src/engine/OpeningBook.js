import { Chess } from '../../vendor/chess.js';

const REPERTOIRE = [
  {
    line: [],
    replies: [
      { uci: 'e2e4', weight: 40 },
      { uci: 'd2d4', weight: 34 },
      { uci: 'c2c4', weight: 26 },
      { uci: 'g1f3', weight: 18 },
      { uci: 'b1c3', weight: 14 },
    ],
  },
  {
    line: ['e2e4'],
    replies: [
      { uci: 'e7e5', weight: 32 },
      { uci: 'c7c5', weight: 30 },
      { uci: 'e7e6', weight: 18 },
      { uci: 'c7c6', weight: 16 },
      { uci: 'd7d6', weight: 10 },
    ],
  },
  {
    line: ['d2d4'],
    replies: [
      { uci: 'd7d5', weight: 30 },
      { uci: 'g8f6', weight: 28 },
      { uci: 'e7e6', weight: 16 },
      { uci: 'f7f5', weight: 8 },
    ],
  },
  {
    line: ['c2c4'],
    replies: [
      { uci: 'e7e5', weight: 20 },
      { uci: 'g8f6', weight: 18 },
      { uci: 'c7c5', weight: 16 },
      { uci: 'e7e6', weight: 12 },
    ],
  },
  {
    line: ['g1f3'],
    replies: [
      { uci: 'd7d5', weight: 20 },
      { uci: 'g8f6', weight: 18 },
      { uci: 'c7c5', weight: 14 },
    ],
  },
  {
    line: ['e2e4', 'e7e5'],
    replies: [
      { uci: 'g1f3', weight: 40 },
      { uci: 'f1c4', weight: 18 },
      { uci: 'b1c3', weight: 16 },
      { uci: 'd2d4', weight: 16 },
    ],
  },
  {
    line: ['e2e4', 'c7c5'],
    replies: [
      { uci: 'g1f3', weight: 32 },
      { uci: 'd2d4', weight: 22 },
      { uci: 'c2c3', weight: 16 },
      { uci: 'b1c3', weight: 16 },
    ],
  },
  {
    line: ['e2e4', 'e7e6'],
    replies: [
      { uci: 'd2d4', weight: 30 },
      { uci: 'b1c3', weight: 20 },
      { uci: 'g1f3', weight: 14 },
    ],
  },
  {
    line: ['e2e4', 'c7c6'],
    replies: [
      { uci: 'd2d4', weight: 34 },
      { uci: 'b1c3', weight: 14 },
      { uci: 'g1f3', weight: 12 },
    ],
  },
  {
    line: ['d2d4', 'd7d5'],
    replies: [
      { uci: 'c2c4', weight: 34 },
      { uci: 'g1f3', weight: 18 },
      { uci: 'e2e3', weight: 10 },
      { uci: 'g2g3', weight: 10 },
    ],
  },
  {
    line: ['d2d4', 'g8f6'],
    replies: [
      { uci: 'c2c4', weight: 28 },
      { uci: 'g1f3', weight: 20 },
      { uci: 'g2g3', weight: 12 },
      { uci: 'b1c3', weight: 10 },
    ],
  },
  {
    line: ['c2c4', 'e7e5'],
    replies: [
      { uci: 'b1c3', weight: 22 },
      { uci: 'g2g3', weight: 16 },
      { uci: 'g1f3', weight: 14 },
    ],
  },
  {
    line: ['g1f3', 'd7d5'],
    replies: [
      { uci: 'd2d4', weight: 18 },
      { uci: 'g2g3', weight: 16 },
      { uci: 'c2c4', weight: 14 },
    ],
  },
  {
    line: ['e2e4', 'e7e5', 'g1f3'],
    replies: [
      { uci: 'b8c6', weight: 24 },
      { uci: 'g8f6', weight: 20 },
      { uci: 'd7d6', weight: 12 },
      { uci: 'f8c5', weight: 10 },
    ],
  },
  {
    line: ['e2e4', 'c7c5', 'g1f3'],
    replies: [
      { uci: 'd7d6', weight: 22 },
      { uci: 'b8c6', weight: 18 },
      { uci: 'e7e6', weight: 16 },
      { uci: 'g7g6', weight: 10 },
    ],
  },
  {
    line: ['d2d4', 'd7d5', 'c2c4'],
    replies: [
      { uci: 'e7e6', weight: 22 },
      { uci: 'c7c6', weight: 16 },
      { uci: 'd5c4', weight: 12 },
      { uci: 'g8f6', weight: 12 },
    ],
  },
];

function uciToMove(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci.length > 4 ? { promotion: uci.slice(4) } : {}),
  };
}

function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function weightedPick(items, temperature) {
  if (items.length === 0) {
    return null;
  }

  if (temperature <= 0.12) {
    return items.reduce((best, item) => (item.weight > best.weight ? item : best), items[0]);
  }

  const adjusted = items.map((item) => Math.pow(item.weight, 1 / Math.max(0.05, temperature)));
  const total = adjusted.reduce((sum, value) => sum + value, 0);
  let threshold = Math.random() * total;

  for (let index = 0; index < items.length; index += 1) {
    threshold -= adjusted[index];
    if (threshold <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

export class OpeningBook {
  constructor({ adapter }) {
    this.adapter = adapter;
    this.entries = new Map();
    this.build();
  }

  build() {
    for (const entry of REPERTOIRE) {
      const chess = new Chess();
      for (const uci of entry.line) {
        chess.move(uciToMove(uci));
      }
      const fen = this.adapter.normalizeFen(chess.fen());
      this.entries.set(fen, entry.replies.map((reply) => ({ ...reply })));
    }
  }

  getBookMove(fen, temperature = 0.1) {
    const normalizedFen = this.adapter.normalizeFen(fen);
    const bookReplies = this.entries.get(normalizedFen);
    if (!bookReplies) {
      return null;
    }

    const chess = this.adapter.cloneFromFen(fen);
    const legalMoves = this.adapter.moves(chess);
    const compatible = bookReplies
      .map((reply) => {
        const move = legalMoves.find((candidate) => moveToUci(candidate) === reply.uci);
        return move ? { move, weight: reply.weight } : null;
      })
      .filter(Boolean);

    if (compatible.length === 0) {
      return null;
    }

    return weightedPick(compatible, temperature);
  }
}
