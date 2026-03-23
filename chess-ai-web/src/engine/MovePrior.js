const MATERIAL_VALUES = {
  p: 100,
  n: 320,
  b: 335,
  r: 510,
  q: 920,
  k: 10000,
};

function centerAttraction(square) {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const rankIndex = 8 - rank;
  const fileDistance = Math.abs(3.5 - fileIndex);
  const rankDistance = Math.abs(3.5 - rankIndex);
  return 4 - (fileDistance + rankDistance) / 2;
}

function isHomeDevelopmentSquare(move) {
  const homeSquares = {
    w: {
      n: new Set(['b1', 'g1']),
      b: new Set(['c1', 'f1']),
    },
    b: {
      n: new Set(['b8', 'g8']),
      b: new Set(['c8', 'f8']),
    },
  };

  return homeSquares[move.color]?.[move.piece]?.has(move.from) ?? false;
}

function advancement(move) {
  const fromRank = Number(move.from[1]);
  const toRank = Number(move.to[1]);
  return move.color === 'w' ? toRank - fromRank : fromRank - toRank;
}

export class MovePrior {
  constructor({ adapter, evaluator }) {
    this.adapter = adapter;
    this.evaluator = evaluator;
  }

  rankMoves(chess, moves) {
    if (moves.length === 0) {
      return [];
    }

    const scoredMoves = moves.map((move) => {
      const rawScore = this.scoreMove(chess, move);
      return {
        move,
        rawScore,
      };
    });

    const maxScore = Math.max(...scoredMoves.map((item) => item.rawScore));
    const exponents = scoredMoves.map((item) => Math.exp((item.rawScore - maxScore) / 24));
    const denominator = exponents.reduce((sum, value) => sum + value, 0);

    return scoredMoves
      .map((item, index) => ({
        move: item.move,
        prior: exponents[index] / denominator,
        rawScore: item.rawScore,
      }))
      .sort((left, right) => right.prior - left.prior);
  }

  scoreMove(chess, move) {
    let score = 8;

    if (move.captured) {
      score += 28 + MATERIAL_VALUES[move.captured] * 0.11 - MATERIAL_VALUES[move.piece] * 0.03;
    }

    if (move.promotion) {
      score += 70 + MATERIAL_VALUES[move.promotion] * 0.1;
    }

    if (move.flags.includes('k') || move.flags.includes('q')) {
      score += 34;
    }

    score += centerAttraction(move.to) * 8;

    if ((move.piece === 'n' || move.piece === 'b') && isHomeDevelopmentSquare(move)) {
      score += 16;
    }

    if (move.piece === 'p') {
      score += advancement(move) * 7;
    }

    this.adapter.move(chess, move);

    if (this.adapter.isCheckmate(chess)) {
      score += 400;
    } else if (this.adapter.isCheck(chess)) {
      score += 42;
    }

    const followUpValue = -this.evaluator.evaluateCentipawns(chess) * 0.08;
    score += Math.max(-16, Math.min(20, followUpValue));

    this.adapter.undo(chess);

    return score;
  }
}
