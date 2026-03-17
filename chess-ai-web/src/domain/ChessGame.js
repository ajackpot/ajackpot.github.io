import { Chess } from '../vendor/chess.js';
import { COLOR_NAMES, getPieceText } from '../shared/pieces.js';
import { createPositionKey, describeGameState, describeMove } from '../shared/chess-utils.js';

export class ChessGame {
  #chess;

  constructor(initialFen) {
    this.#chess = initialFen ? new Chess(initialFen) : new Chess();
  }

  static fromFen(fen) {
    return new ChessGame(fen);
  }

  get chess() {
    return this.#chess;
  }

  cloneChess() {
    return new Chess(this.#chess.fen());
  }

  reset() {
    this.#chess.reset();
  }

  load(fen) {
    this.#chess.load(fen);
  }

  board() {
    return this.#chess.board();
  }

  fen() {
    return this.#chess.fen();
  }

  hash() {
    return this.#chess.hash();
  }

  turn() {
    return this.#chess.turn();
  }

  historyVerbose() {
    return this.#chess.history({ verbose: true });
  }

  historyLan() {
    return this.historyVerbose().map((move) => move.lan);
  }

  historyForDisplay() {
    const verbose = this.historyVerbose();
    const turns = [];
    for (let index = 0; index < verbose.length; index += 2) {
      turns.push({
        moveNumber: Math.floor(index / 2) + 1,
        white: verbose[index]?.san ?? '',
        black: verbose[index + 1]?.san ?? '',
      });
    }
    return turns;
  }

  getPiece(square) {
    return this.#chess.get(square);
  }

  getKingSquare(color) {
    const board = this.board();
    for (const row of board) {
      for (const piece of row) {
        if (piece?.color === color && piece.type === 'k') {
          return piece.square;
        }
      }
    }
    return null;
  }

  getLegalMoves(square = undefined) {
    return square
      ? this.#chess.moves({ square, verbose: true })
      : this.#chess.moves({ verbose: true });
  }

  getLegalDestinations(square) {
    return this.getLegalMoves(square).map((move) => move.to);
  }

  isOwnPiece(square, color = this.turn()) {
    const piece = this.getPiece(square);
    return piece?.color === color;
  }

  isSelectable(square) {
    return this.isOwnPiece(square, this.turn());
  }

  isGameOver() {
    return this.#chess.isGameOver();
  }

  isCheck() {
    return this.#chess.isCheck();
  }

  isDraw() {
    return this.#chess.isDraw();
  }

  statusText() {
    return describeGameState(this.#chess);
  }

  makeMove({ from, to, promotion } = {}) {
    const movingPiece = this.getPiece(from);
    const movingColor = movingPiece?.color;
    const targetPiece = this.getPiece(to);
    const enPassantCapturedSquare = movingPiece?.type === 'p' && from?.[0] !== to?.[0] && !targetPiece
      ? `${to[0]}${movingColor === 'w' ? Number(to[1]) - 1 : Number(to[1]) + 1}`
      : null;
    const capturedPiece = targetPiece ?? (enPassantCapturedSquare ? this.getPiece(enPassantCapturedSquare) : null);
    const move = this.#chess.move({ from, to, promotion });

    if (!move) {
      return null;
    }

    return {
      move,
      movingPiece,
      capturedPiece,
      narration: describeMove(move, movingPiece, capturedPiece),
      status: this.statusText(),
    };
  }

  undo(plies = 1) {
    const undone = [];
    for (let count = 0; count < plies; count += 1) {
      const move = this.#chess.undo();
      if (!move) {
        break;
      }
      undone.push(move);
    }
    return undone;
  }

  hasPendingPromotion(from, to) {
    const matchingMoves = this.getLegalMoves(from).filter((move) => move.to === to);
    return matchingMoves.length > 1 && matchingMoves.some((move) => move.promotion);
  }

  getPromotionChoices(from, to) {
    return this.getLegalMoves(from).filter((move) => move.to === to && move.promotion);
  }

  getRepetitionKey() {
    return createPositionKey(this.fen());
  }

  summary() {
    const pieces = [];
    for (const row of this.board()) {
      for (const piece of row) {
        if (piece) {
          pieces.push(`${getPieceText(piece)} ${piece.square}`);
        }
      }
    }
    return `${COLOR_NAMES[this.turn()]} 차례. 기물 ${pieces.join(', ')}`;
  }
}
