const MATERIAL_VALUES = {
  p: 100,
  n: 320,
  b: 335,
  r: 510,
  q: 920,
  k: 0,
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function centerBonus(fileIndex, rankIndex) {
  const fileDistance = Math.abs(3.5 - fileIndex);
  const rankDistance = Math.abs(3.5 - rankIndex);
  return (3.5 - (fileDistance + rankDistance) / 2) * 8;
}

function kingShieldSquares(color, fileIndex, rankIndex) {
  const forward = color === 'w' ? -1 : 1;
  return [
    [fileIndex - 1, rankIndex + forward],
    [fileIndex, rankIndex + forward],
    [fileIndex + 1, rankIndex + forward],
  ].filter(([file, rank]) => file >= 0 && file < 8 && rank >= 0 && rank < 8);
}

function rankFromPerspective(color, rowIndex) {
  return color === 'w' ? 8 - rowIndex : rowIndex + 1;
}

export class StaticEvaluator {
  constructor({ adapter }) {
    this.adapter = adapter;
  }

  evaluate(chess, options = {}) {
    if (this.adapter.isCheckmate(chess)) {
      return -1;
    }

    if (this.adapter.isDraw(chess)) {
      return 0;
    }

    const baseScore = this.evaluateCentipawns(chess);
    const tacticalDepth = options.tacticalDepth ?? 0;

    if (tacticalDepth <= 0) {
      return this.normalize(baseScore);
    }

    const tacticalScore = this.tacticalProbe(chess, tacticalDepth, options.tacticalBeamWidth ?? 6);
    const blendedScore = baseScore * 0.72 + tacticalScore * 0.28;
    return this.normalize(blendedScore);
  }

  tacticalProbe(chess, depth, beamWidth) {
    return this.negamax(chess, depth, -50000, 50000, beamWidth);
  }

  negamax(chess, depth, alpha, beta, beamWidth) {
    if (this.adapter.isCheckmate(chess)) {
      return -30000 - depth * 20;
    }

    if (this.adapter.isDraw(chess)) {
      return 0;
    }

    const standPat = this.evaluateCentipawns(chess);

    if (depth === 0) {
      return this.quiescence(chess, alpha, beta, 2);
    }

    const legalMoves = this.adapter.moves(chess);
    const candidateMoves = (
      this.adapter.isCheck(chess) ? legalMoves : this.orderTacticalMoves(legalMoves)
    ).slice(0, beamWidth);
    if (candidateMoves.length === 0) {
      return standPat;
    }

    let bestScore = -50000;

    for (const move of candidateMoves) {
      this.adapter.move(chess, move);
      const score = -this.negamax(chess, depth - 1, -beta, -alpha, beamWidth);
      this.adapter.undo(chess);

      if (score > bestScore) {
        bestScore = score;
      }

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        break;
      }
    }

    return Math.max(bestScore, standPat);
  }

  quiescence(chess, alpha, beta, depth) {
    if (this.adapter.isCheckmate(chess)) {
      return -30000 - depth * 10;
    }

    if (this.adapter.isDraw(chess)) {
      return 0;
    }

    const standPat = this.evaluateCentipawns(chess);

    if (standPat >= beta) {
      return beta;
    }

    if (alpha < standPat) {
      alpha = standPat;
    }

    if (depth <= 0) {
      return standPat;
    }

    const legalMoves = this.adapter.moves(chess);
    const candidateMoves = (
      this.adapter.isCheck(chess) ? legalMoves : this.orderTacticalMoves(legalMoves)
    ).slice(0, 8);
    for (const move of candidateMoves) {
      this.adapter.move(chess, move);
      const score = -this.quiescence(chess, -beta, -alpha, depth - 1);
      this.adapter.undo(chess);

      if (score >= beta) {
        return beta;
      }

      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  orderTacticalMoves(moves) {
    return moves
      .filter((move) => move.captured || move.promotion || move.flags.includes('k') || move.flags.includes('q'))
      .sort((left, right) => this.moveTacticalScore(right) - this.moveTacticalScore(left));
  }

  moveTacticalScore(move) {
    let score = 0;
    score += move.captured ? MATERIAL_VALUES[move.captured] * 10 - MATERIAL_VALUES[move.piece] : 0;
    score += move.promotion ? MATERIAL_VALUES[move.promotion] * 8 : 0;
    score += move.flags.includes('k') || move.flags.includes('q') ? 180 : 0;
    return score;
  }

  normalize(centipawns) {
    return Math.max(-0.999, Math.min(0.999, Math.tanh(centipawns / 650)));
  }

  evaluateCentipawns(chess) {
    const board = this.adapter.board(chess);
    const accum = {
      w: {
        score: 0,
        pawnsByFile: Array.from({ length: 8 }, () => []),
        bishops: 0,
        rooks: [],
        kingSquare: null,
      },
      b: {
        score: 0,
        pawnsByFile: Array.from({ length: 8 }, () => []),
        bishops: 0,
        rooks: [],
        kingSquare: null,
      },
    };

    let phase = 0;

    for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      for (let colIndex = 0; colIndex < 8; colIndex += 1) {
        const piece = board[rowIndex][colIndex];
        if (!piece) {
          continue;
        }

        const side = accum[piece.color];
        const material = MATERIAL_VALUES[piece.type];
        const perspectiveRank = rankFromPerspective(piece.color, rowIndex);
        const centrality = centerBonus(colIndex, rowIndex);
        let positional = 0;

        switch (piece.type) {
          case 'p':
            positional += perspectiveRank * 6;
            positional += Math.max(0, 16 - Math.abs(3.5 - colIndex) * 6);
            side.pawnsByFile[colIndex].push(rowIndex);
            break;
          case 'n':
            positional += centrality * 1.35;
            positional += perspectiveRank > 2 && perspectiveRank < 7 ? 8 : 0;
            phase += 1;
            break;
          case 'b':
            positional += centrality * 1.05;
            side.bishops += 1;
            phase += 1;
            break;
          case 'r':
            positional += perspectiveRank === 7 ? 18 : 0;
            side.rooks.push([colIndex, rowIndex]);
            phase += 2;
            break;
          case 'q':
            positional += centrality * 0.65;
            phase += 4;
            break;
          case 'k':
            side.kingSquare = [colIndex, rowIndex];
            break;
          default:
            break;
        }

        side.score += material + positional;
      }
    }

    const openingWeight = Math.min(1, phase / 24);
    const endgameWeight = 1 - openingWeight;

    for (const color of ['w', 'b']) {
      const side = accum[color];
      const enemy = accum[color === 'w' ? 'b' : 'w'];

      side.score += this.evaluatePawnStructure(color, side.pawnsByFile, enemy.pawnsByFile);
      side.score += side.bishops >= 2 ? 35 : 0;
      side.score += this.evaluateRooks(color, side.rooks, side.pawnsByFile, enemy.pawnsByFile);
      side.score += this.evaluateKing(color, side.kingSquare, side.pawnsByFile, openingWeight, endgameWeight);
    }

    const rawScore = accum.w.score - accum.b.score;
    return this.adapter.turn(chess) === 'w' ? rawScore : -rawScore;
  }

  evaluatePawnStructure(color, ownPawnsByFile, enemyPawnsByFile) {
    let score = 0;

    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const pawns = ownPawnsByFile[fileIndex];

      if (pawns.length > 1) {
        score -= 12 * (pawns.length - 1);
      }

      for (const rowIndex of pawns) {
        const left = ownPawnsByFile[fileIndex - 1] ?? [];
        const right = ownPawnsByFile[fileIndex + 1] ?? [];
        if (left.length === 0 && right.length === 0) {
          score -= 10;
        }

        if (this.isPassedPawn(color, fileIndex, rowIndex, enemyPawnsByFile)) {
          const rank = rankFromPerspective(color, rowIndex);
          score += 14 + rank * 7;
        }
      }
    }

    return score;
  }

  isPassedPawn(color, fileIndex, rowIndex, enemyPawnsByFile) {
    for (let neighborFile = fileIndex - 1; neighborFile <= fileIndex + 1; neighborFile += 1) {
      if (neighborFile < 0 || neighborFile >= 8) {
        continue;
      }

      for (const enemyRow of enemyPawnsByFile[neighborFile]) {
        if (color === 'w' && enemyRow < rowIndex) {
          return false;
        }
        if (color === 'b' && enemyRow > rowIndex) {
          return false;
        }
      }
    }

    return true;
  }

  evaluateRooks(color, rooks, ownPawnsByFile, enemyPawnsByFile) {
    let score = 0;

    for (const [fileIndex, rowIndex] of rooks) {
      if (ownPawnsByFile[fileIndex].length === 0 && enemyPawnsByFile[fileIndex].length === 0) {
        score += 22;
      } else if (ownPawnsByFile[fileIndex].length === 0) {
        score += 12;
      }

      const rank = rankFromPerspective(color, rowIndex);
      if (rank === 7) {
        score += 20;
      }
    }

    return score;
  }

  evaluateKing(color, kingSquare, ownPawnsByFile, openingWeight, endgameWeight) {
    if (!kingSquare) {
      return 0;
    }

    const [fileIndex, rowIndex] = kingSquare;
    let score = 0;

    const castledBonus =
      (color === 'w' && (fileIndex === 6 || fileIndex === 2) && rowIndex === 7) ||
      (color === 'b' && (fileIndex === 6 || fileIndex === 2) && rowIndex === 0)
        ? 28
        : 0;

    const centerPenalty = Math.max(0, 12 - centerBonus(fileIndex, rowIndex));
    score += openingWeight * (castledBonus - centerPenalty);

    const shield = kingShieldSquares(color, fileIndex, rowIndex).reduce((sum, [file, rank]) => {
      const rankArray = ownPawnsByFile[file];
      const matchingPawn = rankArray.some((pawnRank) => pawnRank === rank);
      return sum + (matchingPawn ? 8 : -4);
    }, 0);

    score += openingWeight * shield;
    score += endgameWeight * centerBonus(fileIndex, rowIndex) * 0.8;

    return score;
  }
}
