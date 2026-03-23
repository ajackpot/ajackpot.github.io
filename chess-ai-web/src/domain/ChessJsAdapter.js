import { Chess } from '../../vendor/chess.js';

export class ChessJsAdapter {
  createGame(fen) {
    return fen ? new Chess(fen) : new Chess();
  }

  cloneFromFen(fen) {
    return new Chess(fen);
  }

  normalizeFen(fen) {
    return fen.split(' ').slice(0, 4).join(' ');
  }

  board(chess) {
    return chess.board();
  }

  get(chess, square) {
    return chess.get(square);
  }

  fen(chess) {
    return chess.fen();
  }

  turn(chess) {
    return chess.turn();
  }

  history(chess) {
    return chess.history({ verbose: true }).map((move) => this.sanitizeMove(move));
  }

  moves(chess, options = {}) {
    return chess.moves({ verbose: true, ...options }).map((move) => this.sanitizeMove(move));
  }

  move(chess, moveInput) {
    const result = chess.move(moveInput);
    return result ? this.sanitizeMove(result) : null;
  }

  undo(chess) {
    const result = chess.undo();
    return result ? this.sanitizeMove(result) : null;
  }

  isCheck(chess) {
    return chess.isCheck();
  }

  isCheckmate(chess) {
    return chess.isCheckmate();
  }

  isStalemate(chess) {
    return chess.isStalemate();
  }

  isInsufficientMaterial(chess) {
    return chess.isInsufficientMaterial();
  }

  isThreefoldRepetition(chess) {
    return chess.isThreefoldRepetition();
  }

  isDraw(chess) {
    return chess.isDraw();
  }

  isGameOver(chess) {
    return chess.isGameOver();
  }

  moveToInput(move) {
    if (!move) {
      return null;
    }
    return {
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    };
  }

  sanitizeMove(move) {
    if (!move) {
      return null;
    }
    return {
      color: move.color,
      from: move.from,
      to: move.to,
      piece: move.piece,
      captured: move.captured ?? null,
      promotion: move.promotion ?? null,
      flags: move.flags ?? '',
      san: move.san ?? '',
      lan: move.lan ?? '',
    };
  }
}
