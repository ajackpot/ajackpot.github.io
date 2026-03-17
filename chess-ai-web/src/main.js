import { EventBus } from './app/EventBus.js';
import { EngineWorkerClient } from './app/EngineWorkerClient.js';
import { GameController } from './app/GameController.js';
import { BoardView } from './ui/BoardView.js';
import { ControlsView } from './ui/ControlsView.js';
import { EngineInfoView } from './ui/EngineInfoView.js';
import { GameStatusView } from './ui/GameStatusView.js';
import { LiveAnnouncer } from './ui/LiveAnnouncer.js';
import { MoveHistoryView } from './ui/MoveHistoryView.js';
import { PromotionDialog } from './ui/PromotionDialog.js';

const bus = new EventBus();
const engineClient = new EngineWorkerClient();
const liveAnnouncer = new LiveAnnouncer(document.querySelector('#live-region'));

let controller;

const boardView = new BoardView({
  container: document.querySelector('#board-container'),
  onSquareActivate: (square) => {
    void controller.handleSquareActivate(square);
  },
});

const controlsView = new ControlsView({
  root: document.querySelector('#engine-form'),
  onSettingsChange: (settings) => controller.updateSettings(settings),
  onNewGame: () => controller.newGame(),
  onUndo: () => controller.undo(),
  onClearSelection: () => controller.clearSelection(),
});

const moveHistoryView = new MoveHistoryView(document.querySelector('#move-history-root'));
const engineInfoView = new EngineInfoView(document.querySelector('#engine-info-root'));
const gameStatusView = new GameStatusView(document.querySelector('.status-panel'));
const promotionDialog = new PromotionDialog(document.querySelector('#promotion-dialog'));

controller = new GameController({
  bus,
  controlsView,
  boardView,
  moveHistoryView,
  engineInfoView,
  gameStatusView,
  promotionDialog,
  liveAnnouncer,
  engineClient,
});

window.addEventListener('beforeunload', () => {
  engineClient.destroy();
});

controller.start();
