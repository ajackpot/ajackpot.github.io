import { ChessGame } from '../domain/ChessGame.js';
import { EngineConfigFactory } from '../engine/EnginePresets.js';
import { COLOR_NAMES, getPieceText } from '../shared/pieces.js';

export class GameController {
  constructor({ bus, controlsView, boardView, moveHistoryView, engineInfoView, gameStatusView, promotionDialog, liveAnnouncer, engineClient }) {
    this.bus = bus;
    this.controlsView = controlsView;
    this.boardView = boardView;
    this.moveHistoryView = moveHistoryView;
    this.engineInfoView = engineInfoView;
    this.gameStatusView = gameStatusView;
    this.promotionDialog = promotionDialog;
    this.liveAnnouncer = liveAnnouncer;
    this.engineClient = engineClient;

    this.game = new ChessGame();
    this.selectedSquare = null;
    this.legalDestinations = [];
    this.engineThinking = false;
    this.settings = this.controlsView.getSettings();

    this.#bindObservers();
  }

  start() {
    this.render();
    void this.maybeTriggerEngineMove();
  }

  updateSettings(settings) {
    this.engineClient.stop();
    this.engineThinking = false;
    this.controlsView.setThinking(false);
    this.settings = settings;
    this.clearSelection(false);
    this.render();
    void this.maybeTriggerEngineMove();
  }

  newGame() {
    this.engineClient.stop();
    this.engineThinking = false;
    this.game.reset();
    this.clearSelection(false);
    this.engineInfoView.setIdle();
    this.controlsView.setThinking(false);
    this.liveAnnouncer.announce('새 게임을 시작했습니다.');
    this.render('e2');
    void this.maybeTriggerEngineMove();
  }

  undo() {
    this.engineClient.stop();
    this.engineThinking = false;
    const engineSide = this.settings.toggles.engineSide;
    const plies = engineSide === 'white' || engineSide === 'black' ? 2 : 1;
    const undone = this.game.undo(plies);
    this.clearSelection(false);
    this.controlsView.setThinking(false);
    this.engineInfoView.setIdle();

    if (!undone.length) {
      this.liveAnnouncer.announce('되돌릴 수가 없습니다.');
      this.render();
      return;
    }

    this.liveAnnouncer.announce(`${undone.length}개의 수를 되돌렸습니다.`);
    this.render(undone.at(-1)?.from ?? 'e2');
  }

  clearSelection(announce = true) {
    const hadSelection = Boolean(this.selectedSquare);
    this.selectedSquare = null;
    this.legalDestinations = [];
    if (announce && hadSelection) {
      this.liveAnnouncer.announce('기물 선택을 해제했습니다.');
    }
    this.render();
  }

  async handleSquareActivate(square) {
    if (this.engineThinking || this.isEngineTurn()) {
      this.liveAnnouncer.announce('지금은 AI 차례입니다. 현재 수 계산이 끝난 뒤 조작할 수 있습니다.');
      return;
    }

    const piece = this.game.getPiece(square);
    const currentTurn = this.game.turn();

    if (!this.selectedSquare) {
      if (!piece || piece.color !== currentTurn) {
        this.liveAnnouncer.announce('이동할 자신의 기물을 먼저 선택하십시오.');
        return;
      }
      this.selectSquare(square);
      return;
    }

    if (square === this.selectedSquare) {
      this.clearSelection();
      return;
    }

    const destinations = new Set(this.legalDestinations);
    if (destinations.has(square)) {
      await this.commitMove(this.selectedSquare, square);
      return;
    }

    if (piece && piece.color === currentTurn) {
      this.selectSquare(square);
      return;
    }

    this.liveAnnouncer.announce('허용되지 않는 이동입니다. 이동 가능 칸을 확인하십시오.');
  }

  selectSquare(square) {
    const piece = this.game.getPiece(square);
    if (!piece) {
      this.liveAnnouncer.announce('빈 칸입니다.');
      return;
    }

    const legalMoves = this.game.getLegalMoves(square);
    this.selectedSquare = square;
    this.legalDestinations = legalMoves.map((move) => move.to);
    const destinationsText = this.legalDestinations.length ? this.legalDestinations.join(', ') : '없음';
    this.liveAnnouncer.announce(`${getPieceText(piece)} ${square} 선택됨. 이동 가능 칸: ${destinationsText}.`);
    this.render(square);
  }

  async commitMove(from, to, promotion) {
    let promotionPiece = promotion;
    if (!promotionPiece && this.game.hasPendingPromotion(from, to)) {
      promotionPiece = await this.promotionDialog.open({
        from,
        to,
        colorName: COLOR_NAMES[this.game.turn()],
      });
      if (!promotionPiece) {
        this.liveAnnouncer.announce('승격 선택을 취소했습니다.');
        this.render(from);
        return;
      }
    }

    const result = this.game.makeMove({ from, to, promotion: promotionPiece });
    if (!result) {
      this.liveAnnouncer.announce('해당 이동은 규칙상 허용되지 않습니다.');
      this.render(from);
      return;
    }

    this.selectedSquare = null;
    this.legalDestinations = [];
    const message = `${result.narration} ${result.status}`;
    this.liveAnnouncer.announce(message);
    this.render(to);
    await this.maybeTriggerEngineMove();
  }

  async maybeTriggerEngineMove() {
    if (this.engineThinking || this.game.isGameOver() || !this.isEngineTurn()) {
      return;
    }

    const config = EngineConfigFactory.create(this.settings);
    this.engineThinking = true;
    this.controlsView.setThinking(true);
    this.engineInfoView.setThinking();
    this.render();

    try {
      const result = await this.engineClient.search(
        {
          fen: this.game.fen(),
          historyLan: this.game.historyLan(),
          config,
        },
        (info) => {
          this.bus.emit('engine:info', {
            ...info,
            statusText: '생각 중',
          });
        },
      );

      this.engineThinking = false;
      this.controlsView.setThinking(false);

      if (!result.move) {
        this.engineInfoView.setIdle();
        this.render();
        return;
      }

      const applied = this.game.makeMove(result.move);
      if (!applied) {
        throw new Error('AI가 잘못된 수를 제안했습니다.');
      }

      this.bus.emit('engine:info', {
        ...result,
        scoreText: result.scoreText ?? undefined,
        statusText: result.status === 'opening-book' ? `시작책 사용${result.bookName ? `: ${result.bookName}` : ''}` : '분석 완료',
      });
      this.liveAnnouncer.announce(`${applied.narration} ${applied.status}`);
      this.render(result.move.to);

      if (this.isEngineTurn() && !this.game.isGameOver()) {
        window.setTimeout(() => {
          void this.maybeTriggerEngineMove();
        }, 40);
      }
    } catch (error) {
      this.engineThinking = false;
      this.controlsView.setThinking(false);
      this.engineInfoView.setIdle();
      if (error instanceof Error && error.message === 'SEARCH_CANCELLED') {
        return;
      }
      this.liveAnnouncer.announce('AI 계산 중 오류가 발생했습니다.');
      console.error(error);
      this.render();
    }
  }

  isEngineTurn() {
    const engineSide = this.settings.toggles.engineSide;
    const turn = this.game.turn();
    const normalizedSide = engineSide === 'white'
      ? 'w'
      : engineSide === 'black'
        ? 'b'
        : engineSide;
    return normalizedSide === 'both' || normalizedSide === turn;
  }

  render(focusSquare = this.selectedSquare ?? this.boardView.lastFocusedSquare ?? 'e2') {
    const turnText = `현재 차례: ${COLOR_NAMES[this.game.turn()]}`;
    const statusText = this.game.statusText();
    const selectedPiece = this.selectedSquare ? this.game.getPiece(this.selectedSquare) : null;
    const selectionText = selectedPiece
      ? `${getPieceText(selectedPiece)} ${this.selectedSquare} 선택됨. 이동 가능 칸: ${this.legalDestinations.join(', ') || '없음'}.`
      : '선택된 기물이 없습니다.';

    this.bus.emit('state:updated', {
      game: this.game,
      selectedSquare: this.selectedSquare,
      legalDestinations: this.legalDestinations,
      orientation: this.settings.toggles.orientation,
      engineThinking: this.engineThinking,
      focusSquare,
      turnText,
      statusText,
      selectionText,
      turns: this.game.historyForDisplay(),
    });
  }

  #bindObservers() {
    this.bus.on('state:updated', (state) => {
      this.boardView.update(state);
      this.boardView.updateSelectionSummary(state.selectionText);
      this.moveHistoryView.render(state.turns);
      this.gameStatusView.update({ turnText: state.turnText, statusText: state.statusText });
    });

    this.bus.on('engine:info', (info) => {
      this.engineInfoView.update(info);
    });
  }
}
