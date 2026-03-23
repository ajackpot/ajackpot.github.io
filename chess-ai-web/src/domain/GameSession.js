export class GameSession {
  constructor({ adapter, narrator, bus }) {
    this.adapter = adapter;
    this.narrator = narrator;
    this.bus = bus;
    this.playerColor = 'w';
    this.chess = this.adapter.createGame();
    this.selectedSquare = null;
    this.legalMovesFromSelected = [];
    this.pendingPromotion = null;
    this.lastMoveSquares = [];
  }

  reset({ playerColor = 'w' } = {}) {
    this.playerColor = playerColor;
    this.chess = this.adapter.createGame();
    this.selectedSquare = null;
    this.legalMovesFromSelected = [];
    this.pendingPromotion = null;
    this.lastMoveSquares = [];
    this.emitChange();
    this.emitAnnouncement(this.narrator.describeGameReset(playerColor));
  }

  getFen() {
    return this.adapter.fen(this.chess);
  }

  getHistory() {
    return this.adapter.history(this.chess);
  }

  turn() {
    return this.adapter.turn(this.chess);
  }

  isPlayerTurn() {
    return this.turn() === this.playerColor;
  }

  aiColor() {
    return this.playerColor === 'w' ? 'b' : 'w';
  }

  isGameOver() {
    return this.adapter.isGameOver(this.chess);
  }

  getPieceAt(square) {
    return this.adapter.get(this.chess, square);
  }

  getLegalMovesFrom(square) {
    return this.adapter.moves(this.chess, { square });
  }

  clearSelection({ announce = false } = {}) {
    const square = this.selectedSquare;
    const piece = square ? this.getPieceAt(square) : null;
    this.selectedSquare = null;
    this.legalMovesFromSelected = [];
    this.pendingPromotion = null;
    if (announce && square) {
      this.emitAnnouncement(this.narrator.describeDeselection(piece, square));
    }
    this.emitChange();
  }

  selectSquare(square) {
    const piece = this.getPieceAt(square);
    if (!piece) {
      this.emitAnnouncement(this.narrator.describeEmptySquare(square));
      return;
    }

    this.selectedSquare = square;
    this.legalMovesFromSelected = this.getLegalMovesFrom(square);
    this.pendingPromotion = null;
    this.emitChange();
    this.emitAnnouncement(this.narrator.describeSelection(piece, square, this.legalMovesFromSelected));
  }

  handleBoardSquare(square) {
    if (this.pendingPromotion) {
      this.emitAnnouncement(this.narrator.describePromotionPrompt(this.pendingPromotion.from, this.pendingPromotion.to));
      return { kind: 'awaiting-promotion' };
    }

    if (this.isGameOver()) {
      this.emitAnnouncement(this.narrator.describeGameOver(this.getGameState()));
      return { kind: 'game-over' };
    }

    if (!this.isPlayerTurn()) {
      this.emitAnnouncement(this.narrator.describeTurnBlocked());
      return { kind: 'blocked' };
    }

    const piece = this.getPieceAt(square);

    if (!this.selectedSquare) {
      if (!piece) {
        this.emitAnnouncement(this.narrator.describeEmptySquare(square));
        return { kind: 'noop' };
      }

      if (piece.color !== this.playerColor) {
        this.emitAnnouncement(this.narrator.describeOpponentPiece(square));
        return { kind: 'noop' };
      }

      this.selectSquare(square);
      return { kind: 'selected', square };
    }

    if (square === this.selectedSquare) {
      this.clearSelection({ announce: true });
      return { kind: 'deselected', square };
    }

    const matchingMoves = this.legalMovesFromSelected.filter((move) => move.to === square);

    if (matchingMoves.length > 0) {
      const promotionMoves = matchingMoves.filter((move) => move.promotion);
      if (promotionMoves.length > 0) {
        this.pendingPromotion = {
          from: this.selectedSquare,
          to: square,
          options: [...new Set(promotionMoves.map((move) => move.promotion))],
        };
        this.emitChange();
        this.emitAnnouncement(this.narrator.describePromotionPrompt(this.pendingPromotion.from, this.pendingPromotion.to));
        return { kind: 'awaiting-promotion' };
      }

      return this.commitMove(matchingMoves[0], '사용자');
    }

    if (piece && piece.color === this.playerColor) {
      this.selectSquare(square);
      return { kind: 'selected', square };
    }

    this.emitAnnouncement(this.narrator.describeInvalidMove(square));
    return { kind: 'invalid-target' };
  }

  choosePromotion(promotionPiece) {
    if (!this.pendingPromotion) {
      return { kind: 'noop' };
    }

    const move = this.legalMovesFromSelected.find(
      (candidate) => candidate.to === this.pendingPromotion.to && candidate.promotion === promotionPiece,
    );

    if (!move) {
      this.emitAnnouncement('선택한 프로모션 기물로는 이동할 수 없습니다.');
      return { kind: 'invalid-promotion' };
    }

    return this.commitMove(move, '사용자');
  }

  applyEngineMove(moveInput) {
    return this.commitMove(moveInput, 'AI');
  }

  commitMove(moveInput, actorLabel) {
    const move = this.adapter.move(this.chess, moveInput);

    if (!move) {
      this.emitAnnouncement(`${actorLabel} 착수에 실패했습니다.`);
      return { kind: 'invalid-move' };
    }

    this.selectedSquare = null;
    this.legalMovesFromSelected = [];
    this.pendingPromotion = null;
    this.lastMoveSquares = [move.from, move.to];

    const gameState = this.getGameState();
    this.emitChange();
    this.emitAnnouncement(this.narrator.describeMove(move, actorLabel, gameState));

    return {
      kind: 'move',
      move,
      gameState,
    };
  }

  undoLastTurn() {
    const history = this.getHistory();

    if (history.length === 0) {
      this.emitAnnouncement('되돌릴 수가 없습니다.');
      return { kind: 'noop' };
    }

    let pliesToUndo = 1;
    const lastMove = history[history.length - 1];

    if (lastMove.color !== this.playerColor && history.length >= 2) {
      const previousMove = history[history.length - 2];
      if (previousMove.color === this.playerColor) {
        pliesToUndo = 2;
      }
    }

    for (let index = 0; index < pliesToUndo; index += 1) {
      this.adapter.undo(this.chess);
    }

    const updatedHistory = this.getHistory();
    const latestMove = updatedHistory[updatedHistory.length - 1] ?? null;
    this.lastMoveSquares = latestMove ? [latestMove.from, latestMove.to] : [];
    this.selectedSquare = null;
    this.legalMovesFromSelected = [];
    this.pendingPromotion = null;

    this.emitChange();
    this.emitAnnouncement(this.narrator.describeUndo());
    return { kind: 'undo' };
  }

  getGameState() {
    const turn = this.turn();
    const isCheck = this.adapter.isCheck(this.chess);
    const isCheckmate = this.adapter.isCheckmate(this.chess);
    const isStalemate = this.adapter.isStalemate(this.chess);
    const isInsufficientMaterial = this.adapter.isInsufficientMaterial(this.chess);
    const isThreefoldRepetition = this.adapter.isThreefoldRepetition(this.chess);
    const isDraw = this.adapter.isDraw(this.chess);

    let drawReason = '';
    if (isStalemate) {
      drawReason = '스테일메이트';
    } else if (isInsufficientMaterial) {
      drawReason = '기물 부족';
    } else if (isThreefoldRepetition) {
      drawReason = '삼회 반복';
    } else if (isDraw) {
      drawReason = '규칙상 무승부';
    }

    return {
      turn,
      isCheck,
      isCheckmate,
      isStalemate,
      isInsufficientMaterial,
      isThreefoldRepetition,
      isDraw,
      drawReason,
      winnerColor: isCheckmate ? (turn === 'w' ? 'b' : 'w') : null,
    };
  }

  createSnapshot() {
    return {
      fen: this.getFen(),
      board: this.adapter.board(this.chess),
      turn: this.turn(),
      playerColor: this.playerColor,
      aiColor: this.aiColor(),
      selectedSquare: this.selectedSquare,
      legalTargets: this.legalMovesFromSelected.map((move) => move.to),
      pendingPromotion: this.pendingPromotion,
      lastMoveSquares: this.lastMoveSquares,
      history: this.getHistory(),
      gameState: this.getGameState(),
      canUserMove: this.isPlayerTurn() && !this.isGameOver(),
    };
  }

  emitAnnouncement(message) {
    this.bus.emit('announcement', { message });
  }

  emitChange() {
    this.bus.emit('session:changed', this.createSnapshot());
  }
}
