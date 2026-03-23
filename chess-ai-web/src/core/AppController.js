import { BoardViewModel } from '../domain/BoardViewModel.js';
import { SearchConfigFactory } from '../engine/SearchConfigFactory.js';
import { StatusView } from '../ui/StatusView.js';

export class AppController {
  constructor({
    bus,
    session,
    engineFacade,
    boardRenderer,
    controlsView,
    statusView,
    liveRegion,
    narrator,
  }) {
    this.bus = bus;
    this.session = session;
    this.engineFacade = engineFacade;
    this.boardRenderer = boardRenderer;
    this.controlsView = controlsView;
    this.statusView = statusView;
    this.liveRegion = liveRegion;
    this.narrator = narrator;

    this.currentEngineSnapshot = StatusView.createEngineSnapshot({
      difficultyLabel: SearchConfigFactory.getPreset('normal').label,
      configSummary: SearchConfigFactory.summarize(SearchConfigFactory.getPreset('normal')),
    });

    this.activeRequestId = null;
    this.aiThinking = false;
    this.latestSnapshot = this.session.createSnapshot();
  }

  init() {
    this.bus.on('announcement', ({ message }) => {
      this.liveRegion.announce(message);
    });

    this.bus.on('session:changed', (snapshot) => {
      this.latestSnapshot = snapshot;
      this.render(snapshot);

      if (!snapshot.gameState.isCheckmate && !snapshot.gameState.isDraw && snapshot.turn === snapshot.aiColor) {
        this.maybeTriggerAiMove();
      }
    });

    this.controlsView.bind({
      onDifficultyChange: (difficulty) => this.handleDifficultyChange(difficulty),
      onPlayerColorChange: () => this.render(this.session.createSnapshot()),
      onNewGame: () => this.startNewGame(),
      onUndo: () => this.undo(),
      onForceAi: () => this.forceAiMove(),
      onPromotionSelect: (promotion) => this.choosePromotion(promotion),
    });

    const initialConfig = SearchConfigFactory.getPreset(this.controlsView.getDifficulty());
    this.controlsView.applyConfigToInputs(initialConfig);
    this.controlsView.setCustomEnabled(false);
    this.startNewGame();
  }

  getCurrentConfig() {
    return SearchConfigFactory.createFromControls({
      difficulty: this.controlsView.getDifficulty(),
      customValues: this.controlsView.getCustomValues(),
    });
  }

  handleDifficultyChange(difficulty) {
    const config = difficulty === 'custom' ? this.getCurrentConfig() : SearchConfigFactory.getPreset(difficulty);
    this.controlsView.applyConfigToInputs(config);
    this.controlsView.setCustomEnabled(difficulty === 'custom');
    this.currentEngineSnapshot = StatusView.createEngineSnapshot({
      statusText: this.aiThinking ? '탐색 중' : '대기 중',
      difficultyLabel: config.label,
      configSummary: SearchConfigFactory.summarize(config),
    });
    this.render(this.session.createSnapshot());
  }

  startNewGame() {
    this.engineFacade.cancelAll();
    this.activeRequestId = null;
    this.aiThinking = false;
    this.controlsView.setThinking(false);

    const playerColor = this.controlsView.getPlayerColor();
    const config = this.getCurrentConfig();
    this.currentEngineSnapshot = StatusView.createEngineSnapshot({
      statusText: '대기 중',
      difficultyLabel: config.label,
      configSummary: SearchConfigFactory.summarize(config),
    });

    this.session.reset({ playerColor });
    this.render(this.session.createSnapshot());
  }

  render(snapshot) {
    const boardViewModel = BoardViewModel.build(snapshot);
    this.boardRenderer.render(boardViewModel);
    this.controlsView.setPromotionOptions(snapshot.pendingPromotion);
    this.statusView.update(snapshot, this.currentEngineSnapshot);
  }

  async handleBoardSquare(square) {
    const result = this.session.handleBoardSquare(square);
    if (result?.kind === 'move') {
      await this.maybeTriggerAiMove();
    }
  }

  async choosePromotion(promotion) {
    const result = this.session.choosePromotion(promotion);
    if (result?.kind === 'move') {
      await this.maybeTriggerAiMove();
    }
  }

  async undo() {
    this.engineFacade.cancelAll();
    this.activeRequestId = null;
    this.aiThinking = false;
    this.controlsView.setThinking(false);
    this.session.undoLastTurn();
  }

  async forceAiMove() {
    const snapshot = this.session.createSnapshot();
    if (snapshot.turn !== snapshot.aiColor || snapshot.gameState.isCheckmate || snapshot.gameState.isDraw) {
      this.liveRegion.announce(this.narrator.describeForceAiBlocked());
      return;
    }
    await this.maybeTriggerAiMove();
  }

  async maybeTriggerAiMove() {
    const snapshot = this.session.createSnapshot();

    if (this.aiThinking) {
      return;
    }

    if (snapshot.turn !== snapshot.aiColor) {
      return;
    }

    if (snapshot.gameState.isCheckmate || snapshot.gameState.isDraw) {
      return;
    }

    const config = this.getCurrentConfig();
    this.aiThinking = true;
    this.controlsView.setThinking(true);
    this.currentEngineSnapshot = StatusView.createEngineSnapshot({
      statusText: '탐색 중',
      difficultyLabel: config.label,
      configSummary: SearchConfigFactory.summarize(config),
    });
    this.render(snapshot);
    this.liveRegion.announce(this.narrator.describeAiThinking());

    const { requestId, promise } = this.engineFacade.search({
      fen: snapshot.fen,
      config,
      onProgress: (progress) => {
        if (requestId !== this.activeRequestId) {
          return;
        }
        this.currentEngineSnapshot = StatusView.createEngineSnapshot({
          statusText: `탐색 중 (${progress.elapsedMs}ms)`,
          difficultyLabel: config.label,
          simulations: progress.simulations,
          candidates: progress.candidates,
          configSummary: SearchConfigFactory.summarize(config),
        });
        this.render(this.session.createSnapshot());
      },
    });

    this.activeRequestId = requestId;

    try {
      const result = await promise;
      if (this.activeRequestId !== requestId) {
        return;
      }

      this.aiThinking = false;
      this.controlsView.setThinking(false);

      this.currentEngineSnapshot = StatusView.createEngineSnapshot({
        statusText: `탐색 완료 (${result.stats.elapsedMs}ms)`,
        difficultyLabel: config.label,
        simulations: result.stats.simulations,
        evaluation: result.stats.evaluation,
        candidates: result.stats.candidates,
        configSummary: SearchConfigFactory.summarize(config),
      });

      if (result.move) {
        this.session.applyEngineMove(result.move);
      } else {
        this.render(this.session.createSnapshot());
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'search-cancelled') {
        return;
      }

      this.aiThinking = false;
      this.controlsView.setThinking(false);
      this.currentEngineSnapshot = StatusView.createEngineSnapshot({
        statusText: `엔진 오류: ${error instanceof Error ? error.message : String(error)}`,
        difficultyLabel: config.label,
        configSummary: SearchConfigFactory.summarize(config),
      });
      this.render(this.session.createSnapshot());
      this.liveRegion.announce('엔진 탐색 중 오류가 발생했습니다.');
    } finally {
      if (this.activeRequestId === requestId) {
        this.activeRequestId = null;
      }
    }
  }
}
