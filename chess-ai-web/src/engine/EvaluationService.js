import { PHASE_WEIGHTS, squareToCoords } from '../shared/pieces.js';
import { clamp, distanceToCenter, forwardRank } from '../shared/chess-utils.js';

const MG_VALUES = {
  p: 95,
  n: 325,
  b: 335,
  r: 505,
  q: 940,
  k: 0,
};

const EG_VALUES = {
  p: 115,
  n: 300,
  b: 320,
  r: 525,
  q: 930,
  k: 0,
};

const TOTAL_PHASE = 24;

function nearestCastledFileDistance(file) {
  return Math.min(Math.abs(file - 2), Math.abs(file - 6));
}

function diagonalReach(file, rankFromTop) {
  return Math.min(file, rankFromTop, 7 - file, 7 - rankFromTop);
}

function fileCenterBonus(file) {
  return 3.5 - Math.abs(file - 3.5);
}

function rankCenterBonus(rankFromTop) {
  return 3.5 - Math.abs(rankFromTop - 3.5);
}

function kingHomeRank(color) {
  return color === 'w' ? 7 : 0;
}

function homeDistance(rankFromTop, color) {
  return Math.abs(rankFromTop - kingHomeRank(color));
}

function buildSide(color) {
  return {
    color,
    mg: 0,
    eg: 0,
    pawns: [],
    knights: [],
    bishops: [],
    rooks: [],
    queens: [],
    king: null,
    pawnFiles: Array(8).fill(0),
  };
}

function pawnSupportExists(pawns, file, rankFromTop, color) {
  const supportRank = color === 'w' ? rankFromTop + 1 : rankFromTop - 1;
  return pawns.some((pawn) => Math.abs(pawn.file - file) === 1 && pawn.rankFromTop === supportRank);
}

function enemyPawnCanChallenge(enemyPawns, file, rankFromTop, color) {
  return enemyPawns.some((pawn) => {
    if (Math.abs(pawn.file - file) !== 1) {
      return false;
    }
    return color === 'w' ? pawn.rankFromTop < rankFromTop : pawn.rankFromTop > rankFromTop;
  });
}

export class EvaluationService {
  evaluate(chess) {
    const board = chess.board();
    const buckets = {
      w: buildSide('w'),
      b: buildSide('b'),
      phase: 0,
    };

    for (const row of board) {
      for (const piece of row) {
        if (!piece) {
          continue;
        }

        const { file, rankIndexFromTop: rankFromTop } = squareToCoords(piece.square);
        const side = buckets[piece.color];
        buckets.phase += PHASE_WEIGHTS[piece.type] ?? 0;

        side.mg += MG_VALUES[piece.type] ?? 0;
        side.eg += EG_VALUES[piece.type] ?? 0;

        const positional = this.#positional(piece, file, rankFromTop);
        side.mg += positional.mg;
        side.eg += positional.eg;

        const descriptor = {
          file,
          rankFromTop,
          square: piece.square,
          forward: forwardRank(piece.square, piece.color),
        };

        switch (piece.type) {
          case 'p':
            side.pawns.push(descriptor);
            side.pawnFiles[file] += 1;
            break;
          case 'n':
            side.knights.push(descriptor);
            break;
          case 'b':
            side.bishops.push(descriptor);
            break;
          case 'r':
            side.rooks.push(descriptor);
            break;
          case 'q':
            side.queens.push(descriptor);
            break;
          case 'k':
            side.king = descriptor;
            break;
          default:
            break;
        }
      }
    }

    this.#pawnStructure(buckets.w, buckets.b);
    this.#pawnStructure(buckets.b, buckets.w);
    this.#minorPieceBonuses(buckets.w, buckets.b);
    this.#minorPieceBonuses(buckets.b, buckets.w);
    this.#rookBonuses(buckets.w, buckets.b);
    this.#rookBonuses(buckets.b, buckets.w);
    this.#queenBonuses(buckets.w, buckets.b, buckets.phase);
    this.#queenBonuses(buckets.b, buckets.w, buckets.phase);
    this.#kingSafety(chess, buckets.w, buckets.b);
    this.#kingSafety(chess, buckets.b, buckets.w);

    const phase = clamp(buckets.phase, 0, TOTAL_PHASE);
    const mgScore = buckets.w.mg - buckets.b.mg;
    const egScore = buckets.w.eg - buckets.b.eg;
    let score = ((mgScore * phase) + (egScore * (TOTAL_PHASE - phase))) / TOTAL_PHASE;

    score += chess.turn() === 'w' ? 10 : -10;
    return Math.round(chess.turn() === 'w' ? score : -score);
  }

  #positional(piece, file, rankFromTop) {
    const forward = forwardRank(piece.square, piece.color);
    const center = 3.5 - distanceToCenter(file, rankFromTop);
    const fileCenter = fileCenterBonus(file);
    const rankCenter = rankCenterBonus(rankFromTop);

    switch (piece.type) {
      case 'p':
        return {
          mg: forward * 10 + fileCenter * 6 + (file >= 3 && file <= 4 ? 8 : 0),
          eg: forward * 18 + fileCenter * 3,
        };
      case 'n':
        return {
          mg: center * 24 + forward * 5 - (forward === 0 ? 18 : 0),
          eg: center * 18 + rankCenter * 6,
        };
      case 'b':
        return {
          mg: center * 16 + diagonalReach(file, rankFromTop) * 8,
          eg: center * 14 + diagonalReach(file, rankFromTop) * 10,
        };
      case 'r':
        return {
          mg: fileCenter * 5 + (forward >= 5 ? 16 : forward * 3),
          eg: fileCenter * 6 + forward * 5,
        };
      case 'q':
        return {
          mg: center * 10 + fileCenter * 4,
          eg: center * 12 + rankCenter * 6,
        };
      case 'k':
        return {
          mg: -nearestCastledFileDistance(file) * 18 - homeDistance(rankFromTop, piece.color) * 22,
          eg: (3.5 - distanceToCenter(file, rankFromTop)) * 22,
        };
      default:
        return { mg: 0, eg: 0 };
    }
  }

  #pawnStructure(side, enemy) {
    for (const pawn of side.pawns) {
      const file = pawn.file;
      const hasLeftSupport = file > 0 && side.pawnFiles[file - 1] > 0;
      const hasRightSupport = file < 7 && side.pawnFiles[file + 1] > 0;
      const isIsolated = !hasLeftSupport && !hasRightSupport;
      const isDoubled = side.pawnFiles[file] > 1;
      const connected = side.pawns.some(
        (other) => other !== pawn && Math.abs(other.file - file) === 1 && Math.abs(other.rankFromTop - pawn.rankFromTop) <= 1,
      );
      const passed = this.#isPassedPawn(pawn, enemy.pawns, side.color);

      if (isIsolated) {
        side.mg -= 14;
        side.eg -= 8;
      }

      if (isDoubled) {
        side.mg -= 12;
        side.eg -= 12;
      }

      if (connected) {
        side.mg += 8;
        side.eg += 12;
      }

      if (passed) {
        side.mg += 12 + pawn.forward * 10;
        side.eg += 22 + pawn.forward * 18;
      }
    }
  }

  #isPassedPawn(pawn, enemyPawns, color) {
    return !enemyPawns.some((enemyPawn) => {
      if (Math.abs(enemyPawn.file - pawn.file) > 1) {
        return false;
      }

      if (color === 'w') {
        return enemyPawn.rankFromTop < pawn.rankFromTop;
      }
      return enemyPawn.rankFromTop > pawn.rankFromTop;
    });
  }

  #minorPieceBonuses(side, enemy) {
    if (side.bishops.length >= 2) {
      side.mg += 30;
      side.eg += 36;
    }

    for (const knight of side.knights) {
      const supported = pawnSupportExists(side.pawns, knight.file, knight.rankFromTop, side.color);
      const challenged = enemyPawnCanChallenge(enemy.pawns, knight.file, knight.rankFromTop, side.color);
      const advanced = side.color === 'w' ? knight.rankFromTop <= 4 : knight.rankFromTop >= 3;
      if (advanced && supported && !challenged) {
        side.mg += 24;
        side.eg += 16;
      }
    }
  }

  #rookBonuses(side, enemy) {
    for (const rook of side.rooks) {
      const friendlyPawns = side.pawnFiles[rook.file];
      const enemyPawns = enemy.pawnFiles[rook.file];
      const onOpenFile = friendlyPawns === 0 && enemyPawns === 0;
      const onSemiOpenFile = friendlyPawns === 0 && enemyPawns > 0;
      if (onOpenFile) {
        side.mg += 24;
        side.eg += 18;
      } else if (onSemiOpenFile) {
        side.mg += 14;
        side.eg += 10;
      }

      const seventhRank = side.color === 'w' ? rook.rankFromTop === 1 : rook.rankFromTop === 6;
      if (seventhRank) {
        side.mg += 18;
        side.eg += 26;
      }
    }

    if (side.rooks.length >= 2) {
      const [first, second] = side.rooks;
      if (first.rankFromTop === second.rankFromTop || first.file === second.file) {
        side.mg += 12;
        side.eg += 10;
      }
    }
  }

  #queenBonuses(side, enemy, phase) {
    for (const queen of side.queens) {
      if (phase > 18 && queen.forward > 1) {
        side.mg -= queen.forward * 6;
      }

      if (enemy.king) {
        const kingDistance = Math.abs(enemy.king.file - queen.file) + Math.abs(enemy.king.rankFromTop - queen.rankFromTop);
        side.eg += Math.max(0, 10 - kingDistance) * 2;
      }
    }
  }

  #kingSafety(chess, side, enemy) {
    if (!side.king) {
      return;
    }

    const rights = chess.getCastlingRights(side.color);
    if (rights.k || rights.q) {
      side.mg += 8;
    }

    const castled = nearestCastledFileDistance(side.king.file) <= 1 && side.king.rankFromTop === kingHomeRank(side.color);
    if (castled) {
      side.mg += 24;
    }

    const shieldRanks = side.color === 'w'
      ? [side.king.rankFromTop - 1, side.king.rankFromTop - 2]
      : [side.king.rankFromTop + 1, side.king.rankFromTop + 2];

    for (const file of [side.king.file - 1, side.king.file, side.king.file + 1]) {
      if (file < 0 || file > 7) {
        continue;
      }
      const hasShieldPawn = side.pawns.some((pawn) => pawn.file === file && shieldRanks.includes(pawn.rankFromTop));
      if (hasShieldPawn) {
        side.mg += 9;
      } else {
        side.mg -= 9;
      }
    }

    const enemyPressure = enemy.knights.length * 3 + enemy.bishops.length * 3 + enemy.rooks.length * 5 + enemy.queens.length * 7;
    const distanceToEnemyQueen = enemy.queens[0]
      ? Math.abs(enemy.queens[0].file - side.king.file) + Math.abs(enemy.queens[0].rankFromTop - side.king.rankFromTop)
      : 8;

    side.mg -= Math.max(0, 7 - distanceToEnemyQueen) * enemyPressure * 0.4;

    if (enemy.king) {
      const kingDistance = Math.abs(enemy.king.file - side.king.file) + Math.abs(enemy.king.rankFromTop - side.king.rankFromTop);
      side.eg += Math.max(0, 14 - kingDistance) * 2;
    }
  }
}
