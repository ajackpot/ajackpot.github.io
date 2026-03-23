import { AppController } from './core/AppController.js';
import { EventBus } from './core/EventBus.js';
import { ChessJsAdapter } from './domain/ChessJsAdapter.js';
import { GameSession } from './domain/GameSession.js';
import { MoveNarrator } from './domain/MoveNarrator.js';
import { EngineFacade } from './engine/EngineFacade.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { ControlsView } from './ui/ControlsView.js';
import { LiveRegion } from './ui/LiveRegion.js';
import { StatusView } from './ui/StatusView.js';

const bus = new EventBus();
const adapter = new ChessJsAdapter();
const narrator = new MoveNarrator();
const session = new GameSession({ adapter, narrator, bus });
const engineFacade = new EngineFacade();

const boardRenderer = new BoardRenderer({
  container: document.getElementById('board-container'),
  onSquareActivate: (square) => controller.handleBoardSquare(square),
});

const controlsView = new ControlsView({
  form: document.getElementById('control-form'),
  difficultySelect: document.getElementById('difficulty'),
  playerColorSelect: document.getElementById('player-color'),
  customFieldset: document.getElementById('custom-fieldset'),
  newGameButton: document.getElementById('new-game-button'),
  undoButton: document.getElementById('undo-button'),
  forceAiButton: document.getElementById('force-ai-button'),
  promotionSection: document.getElementById('promotion-section'),
  promotionButtons: [...document.querySelectorAll('[data-promotion]')],
});

const statusView = new StatusView({
  turnStatus: document.getElementById('turn-status'),
  gameStatus: document.getElementById('game-status'),
  engineStatus: document.getElementById('engine-status'),
  difficultyStatus: document.getElementById('difficulty-status'),
  engineSimulations: document.getElementById('engine-simulations'),
  engineEvaluation: document.getElementById('engine-evaluation'),
  engineCandidates: document.getElementById('engine-candidates'),
  engineConfig: document.getElementById('engine-config'),
  moveLog: document.getElementById('move-log'),
});

const liveRegion = new LiveRegion(document.getElementById('live-region'));

const controller = new AppController({
  bus,
  session,
  engineFacade,
  boardRenderer,
  controlsView,
  statusView,
  liveRegion,
  narrator,
});

controller.init();
