import { Chess } from '../vendor/chess.js';
import { EvaluationService } from './EvaluationService.js';
import { MoveOrderingService } from './MoveOrderingService.js';
import { OpeningBook } from './OpeningBook.js';
import { TranspositionTable, TT_FLAG } from './TranspositionTable.js';
import {
  MATE_SCORE,
  isCapture,
  isPromotion,
  isQuietMove,
  moveKey,
  pieceValue,
  scoreToHuman,
} from '../shared/chess-utils.js';

class SearchAbortError extends Error {
  constructor() {
    super('Search aborted');
    this.name = 'SearchAbortError';
  }
}

function lanToMove(lan) {
  return {
    from: lan.slice(0, 2),
    to: lan.slice(2, 4),
    promotion: lan[4] || undefined,
  };
}

export class AstraEngine {
  constructor() {
    this.evaluator = new EvaluationService();
    this.ordering = new MoveOrderingService(128);
    this.openingBook = new OpeningBook();
    this.tt = new TranspositionTable(100000);
    this.resetSearchState();
  }

  resetSearchState() {
    this.nodes = 0;
    this.qNodes = 0;
    this.ttHits = 0;
    this.startTime = 0;
    this.hardDeadline = Infinity;
    this.maxQuiescenceDepth = 8;
    this.infoCallback = null;
  }

  search({ fen, historyLan = [], config, infoCallback }) {
    this.resetSearchState();
    this.infoCallback = infoCallback;
    this.maxQuiescenceDepth = config.maxQuiescenceDepth ?? 8;
    const chess = new Chess(fen);
    const rootMoves = chess.moves({ verbose: true });

    if (!rootMoves.length) {
      return {
        move: null,
        score: chess.isCheckmate() ? -MATE_SCORE : 0,
        pvLan: [],
        pvSan: '',
        depth: 0,
        elapsedMs: 0,
        nodes: 0,
        nps: 0,
        status: chess.isGameOver() ? 'game-over' : 'no-legal-moves',
      };
    }

    if (config.useOpeningBook && historyLan.length <= 16) {
      const bookMove = this.openingBook.getMove(historyLan);
      if (bookMove) {
        const legalBookMove = rootMoves.find((move) => move.lan === bookMove.move);
        if (legalBookMove) {
          const pvSan = this.#lanListToSan(chess, [legalBookMove.lan]);
          return {
            move: this.#serializeMove(legalBookMove),
            score: 20,
            pvLan: [legalBookMove.lan],
            pvSan,
            scoreText: scoreToHuman(20),
            depth: 0,
            elapsedMs: 0,
            nodes: 0,
            nps: 0,
            status: 'opening-book',
            bookName: bookMove.name,
          };
        }
      }
    }

    this.startTime = performance.now();
    const moveTimeMs = config.moveTimeMs ?? 1000;
    this.hardDeadline = this.startTime + moveTimeMs + Math.min(350, moveTimeMs * 0.35);

    let lastCompleted = {
      move: rootMoves[0],
      score: -Infinity,
      pvLan: [rootMoves[0].lan],
      pvSan: this.#lanListToSan(chess, [rootMoves[0].lan]),
      depth: 0,
      rootScores: [{ move: rootMoves[0], score: -Infinity }],
    };

    let previousScore = 0;

    try {
      for (let depth = 1; depth <= (config.maxDepth ?? 4); depth += 1) {
        if (performance.now() > this.startTime + moveTimeMs && depth > 1) {
          break;
        }

        const aspiration = depth >= 3 ? 40 : 1000;
        let alpha = depth >= 3 ? previousScore - aspiration : -MATE_SCORE;
        let beta = depth >= 3 ? previousScore + aspiration : MATE_SCORE;
        let result = null;

        while (true) {
          result = this.#searchRoot(chess, depth, alpha, beta);
          if (result.score <= alpha) {
            alpha -= aspiration * 2;
            beta = Math.min(MATE_SCORE, result.score + aspiration * 2);
            continue;
          }
          if (result.score >= beta) {
            beta += aspiration * 2;
            alpha = Math.max(-MATE_SCORE, result.score - aspiration * 2);
            continue;
          }
          break;
        }

        const chosen = this.#chooseMove(result.rootScores, config);
        const chosenPvLan = this.#extractLineFromChosenMove(chess, chosen.move.lan);
        const chosenPvSan = this.#lanListToSan(chess, chosenPvLan);
        previousScore = result.score;
        lastCompleted = {
          move: chosen.move,
          score: chosen.score,
          pvLan: chosenPvLan,
          pvSan: chosenPvSan,
          depth,
          rootScores: result.rootScores,
        };

        this.#emitInfo({
          type: 'info',
          depth,
          score: chosen.score,
          scoreText: scoreToHuman(chosen.score),
          pvLan: chosenPvLan,
          pvSan: chosenPvSan,
          elapsedMs: performance.now() - this.startTime,
          nodes: this.nodes,
          qNodes: this.qNodes,
          nps: this.#nps(),
          ttFill: this.tt.fillRatio,
        });
      }
    } catch (error) {
      if (!(error instanceof SearchAbortError)) {
        throw error;
      }
    }

    return {
      move: this.#serializeMove(lastCompleted.move),
      score: lastCompleted.score,
      scoreText: scoreToHuman(lastCompleted.score),
      pvLan: lastCompleted.pvLan,
      pvSan: lastCompleted.pvSan,
      depth: lastCompleted.depth,
      elapsedMs: performance.now() - this.startTime,
      nodes: this.nodes,
      qNodes: this.qNodes,
      nps: this.#nps(),
      status: 'searched',
    };
  }

  #searchRoot(chess, depth, alpha, beta) {
    const alphaOriginal = alpha;
    const betaOriginal = beta;
    const hash = chess.hash();
    const ttMove = this.tt.get(hash)?.bestMove ?? '';
    const orderedMoves = this.ordering.orderMoves(chess.moves({ verbose: true }), { ttMove, ply: 0 });
    const rootScores = [];
    let bestMove = orderedMoves[0];
    let bestScore = -MATE_SCORE;

    for (let index = 0; index < orderedMoves.length; index += 1) {
      const move = orderedMoves[index];
      chess.move(move);
      const extension = chess.isCheck() ? 1 : 0;
      const score = -this.#negamax(chess, depth - 1 + extension, -beta, -alpha, 1);
      chess.undo();

      rootScores.push({ move, score });

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) {
        alpha = score;
      }
      if (alpha >= beta) {
        this.ordering.recordCutoff(move, depth, 0);
        break;
      }
    }

    rootScores.sort((left, right) => right.score - left.score);
    const flag = bestScore <= alphaOriginal
      ? TT_FLAG.UPPER
      : bestScore >= betaOriginal
        ? TT_FLAG.LOWER
        : TT_FLAG.EXACT;

    this.tt.set(hash, {
      depth,
      score: bestScore,
      flag,
      bestMove: bestMove.lan,
      staticEval: null,
    });

    return { bestMove, score: bestScore, rootScores };
  }

  #negamax(chess, depth, alpha, beta, ply) {
    this.#tick();
    const alphaOriginal = alpha;
    const betaOriginal = beta;
    const hash = chess.hash();
    const inCheck = chess.isCheck();

    alpha = Math.max(alpha, -MATE_SCORE + ply);
    beta = Math.min(beta, MATE_SCORE - ply - 1);
    if (alpha >= beta) {
      return alpha;
    }

    if (chess.isDraw()) {
      return 0;
    }
    if (chess.isCheckmate()) {
      return -MATE_SCORE + ply;
    }

    const ttEntry = this.tt.get(hash);
    if (ttEntry && ttEntry.depth >= depth) {
      this.ttHits += 1;
      if (ttEntry.flag === TT_FLAG.EXACT) {
        return ttEntry.score;
      }
      if (ttEntry.flag === TT_FLAG.LOWER) {
        alpha = Math.max(alpha, ttEntry.score);
      } else if (ttEntry.flag === TT_FLAG.UPPER) {
        beta = Math.min(beta, ttEntry.score);
      }
      if (alpha >= beta) {
        return ttEntry.score;
      }
    }

    if (depth <= 0) {
      return this.#quiescence(chess, alpha, beta, ply, 0);
    }

    const staticEval = ttEntry?.staticEval ?? this.evaluator.evaluate(chess);

    if (!inCheck && depth <= 2) {
      const margin = depth === 1 ? 110 : 190;
      if (staticEval - margin >= beta) {
        return staticEval;
      }
    }

    const moves = chess.moves({ verbose: true });
    if (!moves.length) {
      return inCheck ? -MATE_SCORE + ply : 0;
    }

    const orderedMoves = this.ordering.orderMoves(moves, { ttMove: ttEntry?.bestMove ?? '', ply });
    let bestScore = -MATE_SCORE;
    let bestMoveKey = orderedMoves[0].lan;
    let searchedMoves = 0;

    for (const move of orderedMoves) {
      chess.move(move);
      const extension = chess.isCheck() ? 1 : 0;
      const quiet = isQuietMove(move) && !move.san?.includes('+');
      let reduction = 0;

      if (
        searchedMoves >= 3
        && depth >= 3
        && quiet
        && !inCheck
        && extension === 0
      ) {
        reduction = depth >= 5 && searchedMoves >= 6 ? 2 : 1;
      }

      let score;
      const fullDepth = depth - 1 + extension;
      const reducedDepth = Math.max(0, fullDepth - reduction);

      if (searchedMoves === 0) {
        score = -this.#negamax(chess, fullDepth, -beta, -alpha, ply + 1);
      } else {
        score = -this.#negamax(chess, reducedDepth, -alpha - 1, -alpha, ply + 1);
        if (reduction > 0 && score > alpha) {
          score = -this.#negamax(chess, fullDepth, -alpha - 1, -alpha, ply + 1);
        }
        if (score > alpha && score < beta) {
          score = -this.#negamax(chess, fullDepth, -beta, -alpha, ply + 1);
        }
      }

      chess.undo();
      searchedMoves += 1;

      if (score > bestScore) {
        bestScore = score;
        bestMoveKey = move.lan;
      }
      if (score > alpha) {
        alpha = score;
      }
      if (alpha >= beta) {
        this.ordering.recordCutoff(move, depth, ply);
        break;
      }
    }

    const flag = bestScore <= alphaOriginal
      ? TT_FLAG.UPPER
      : bestScore >= betaOriginal
        ? TT_FLAG.LOWER
        : TT_FLAG.EXACT;

    this.tt.set(hash, {
      depth,
      score: bestScore,
      flag,
      bestMove: bestMoveKey,
      staticEval,
    });

    return bestScore;
  }

  #quiescence(chess, alpha, beta, ply, qDepth) {
    this.#tick(true);

    if (chess.isDraw()) {
      return 0;
    }
    if (chess.isCheckmate()) {
      return -MATE_SCORE + ply;
    }

    const inCheck = chess.isCheck();
    const standPat = this.evaluator.evaluate(chess);

    if (!inCheck) {
      if (standPat >= beta) {
        return standPat;
      }
      if (standPat > alpha) {
        alpha = standPat;
      }
      if (qDepth >= this.maxQuiescenceDepth) {
        return alpha;
      }
    }

    const moves = chess.moves({ verbose: true });
    const tacticalMoves = inCheck
      ? moves
      : moves.filter((move) => isCapture(move) || isPromotion(move));

    if (!tacticalMoves.length) {
      return inCheck ? -MATE_SCORE + ply : alpha;
    }

    const orderedMoves = this.ordering.orderMoves(tacticalMoves, { ply });
    for (const move of orderedMoves) {
      if (!inCheck && move.captured) {
        const deltaMargin = pieceValue(move.captured) + (move.promotion ? pieceValue(move.promotion) : 0) + 120;
        if (standPat + deltaMargin < alpha) {
          continue;
        }
      }

      chess.move(move);
      const score = -this.#quiescence(chess, -beta, -alpha, ply + 1, qDepth + 1);
      chess.undo();

      if (score >= beta) {
        return score;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  #extractLineFromChosenMove(chess, firstLan) {
    const line = [firstLan];
    const clone = new Chess(chess.fen());
    clone.move(lanToMove(firstLan));

    const seenHashes = new Set([clone.hash()]);
    for (let depth = 0; depth < 11; depth += 1) {
      const entry = this.tt.get(clone.hash());
      if (!entry?.bestMove) {
        break;
      }
      const legalMoves = clone.moves({ verbose: true });
      const nextMove = legalMoves.find((move) => move.lan === entry.bestMove);
      if (!nextMove) {
        break;
      }
      clone.move(nextMove);
      if (seenHashes.has(clone.hash())) {
        clone.undo();
        break;
      }
      seenHashes.add(clone.hash());
      line.push(nextMove.lan);
    }

    return line;
  }

  #chooseMove(rootScores, config) {
    const poolSize = Math.max(1, Math.min(config.candidatePool ?? 1, rootScores.length));
    const pool = rootScores.slice(0, poolSize);
    if (pool.length === 1) {
      return pool[0];
    }

    const noise = config.skillNoiseCp ?? 0;
    const noisyPool = pool.map((entry) => ({
      ...entry,
      noisyScore: entry.score - Math.random() * noise,
    }));
    noisyPool.sort((left, right) => right.noisyScore - left.noisyScore);
    return noisyPool[0];
  }

  #lanListToSan(chess, lanMoves) {
    const clone = new Chess(chess.fen());
    const sanMoves = [];
    for (const lan of lanMoves) {
      const move = clone.move(lanToMove(lan));
      if (!move) {
        break;
      }
      sanMoves.push(move.san);
    }
    return sanMoves.join(' ');
  }

  #serializeMove(move) {
    if (!move) {
      return null;
    }
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      lan: move.lan,
      piece: move.piece,
      color: move.color,
      captured: move.captured,
      flags: move.flags,
    };
  }

  #tick(isQuiescence = false) {
    this.nodes += 1;
    if (isQuiescence) {
      this.qNodes += 1;
    }
    if ((this.nodes & 2047) !== 0) {
      return;
    }
    if (performance.now() > this.hardDeadline) {
      throw new SearchAbortError();
    }
  }

  #emitInfo(payload) {
    if (!this.infoCallback) {
      return;
    }
    this.infoCallback(payload);
  }

  #nps() {
    const elapsedSeconds = Math.max(0.001, (performance.now() - this.startTime) / 1000);
    return Math.round(this.nodes / elapsedSeconds);
  }
}
