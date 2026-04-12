import { ENGINE_PRESETS, ENGINE_STYLE_PRESETS, resolveEngineOptions } from '../ai/presets.js';
import {
  describeSearchAlgorithm,
  DEFAULT_SEARCH_ALGORITHM,
  normalizeSearchAlgorithmForPreset,
} from '../ai/search-algorithms.js';
import { GameState, createStateHistoryFromMoveSequence, serializeMoveHistoryCompact } from '../core/game-state.js';
import { coordToIndex, indexToCoord } from '../core/bitboard.js';
import { BoardView } from './board-view.js';
import { XOT_OPENING_COUNT, selectRandomXotOpening } from '../data/xot-openings-small.js';
import { EngineClient, SearchCanceledError } from './engine-client.js';
import {
  escapeHtml,
  formatActionAnnouncement,
  formatCellName,
  formatDiscSummary,
  formatEngineSummaryLine,
  formatLastActionSummary,
  formatLegalMovesList,
  formatMctsProofSummary,
  formatMoveLogEntry,
  formatResolvedOptionsList,
  formatSearchSummary,
  formatStateAnnouncement,
  PLAYER_NAMES,
} from './formatters.js';
import { LiveRegionAnnouncer } from './live-region-announcer.js';
import { SettingsPanelView } from './settings-panel-view.js';

function createDefaultSettings() {
  const customInputs = {};
  for (const [key, value] of Object.entries(ENGINE_PRESETS.custom)) {
    if (typeof value === 'number') {
      customInputs[key] = value;
    }
  }

  return {
    humanColor: 'black',
    presetKey: 'normal',
    styleKey: 'balanced',
    searchAlgorithm: DEFAULT_SEARCH_ALGORITHM,
    showLegalHints: true,
    enableBoardShortcuts: true,
    themeMode: 'system',
    customInputs,
  };
}

function normalizeThemeMode(themeMode) {
  return themeMode === 'dark' || themeMode === 'high-contrast'
    ? themeMode
    : 'system';
}

function customInputsChanged(leftInputs = {}, rightInputs = {}) {
  const keys = new Set([
    ...Object.keys(leftInputs ?? {}),
    ...Object.keys(rightInputs ?? {}),
  ]);

  for (const key of keys) {
    if (String(leftInputs?.[key] ?? '') !== String(rightInputs?.[key] ?? '')) {
      return true;
    }
  }

  return false;
}

function formatThemeModeAnnouncement(themeMode) {
  if (themeMode === 'dark') {
    return '다크 모드';
  }
  if (themeMode === 'high-contrast') {
    return '고대비 모드';
  }
  return '시스템 설정 따르기';
}

function nextAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isDialogOpen(dialog) {
  return Boolean(dialog?.open);
}

function openDialog(dialog) {
  if (!dialog || isDialogOpen(dialog)) {
    return;
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    return;
  }

  dialog.setAttribute('open', 'open');
}

function closeDialog(dialog) {
  if (!dialog || !isDialogOpen(dialog)) {
    return;
  }

  if (typeof dialog.close === 'function') {
    dialog.close();
    return;
  }

  dialog.removeAttribute('open');
}

function formatCompactSequenceWithSpaces(sequenceText) {
  const compact = String(sequenceText ?? '').trim().replace(/\s+/g, '');
  if (!compact) {
    return '';
  }

  const tokens = [];
  for (let index = 0; index < compact.length; index += 2) {
    tokens.push(compact.slice(index, index + 2).toUpperCase());
  }
  return tokens.join(' ');
}

async function copyTextToClipboard(text) {
  const normalizedText = String(text ?? '');
  if (!normalizedText) {
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalizedText);
      return;
    }
  } catch (error) {
    // Fall through to the legacy copy path.
  }

  const previousActiveElement = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = normalizedText;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, normalizedText.length);

  const copied = typeof document.execCommand === 'function'
    ? document.execCommand('copy')
    : false;

  document.body.removeChild(textarea);
  if (previousActiveElement instanceof HTMLElement) {
    previousActiveElement.focus();
  }

  if (!copied) {
    throw new Error('Clipboard copy is not available in this browser context.');
  }
}

export class AppController {
  constructor(root) {
    this.root = root;
    this.settings = createDefaultSettings();
    this.stateHistory = [GameState.initial()];
    this.currentState = this.stateHistory[0];
    this.searchResult = null;
    this.aiBusy = false;
    this.errorText = '';
    this.engineMetricsExpanded = false;
    this.positionSource = {
      type: 'standard',
      label: '기본 시작',
      sequenceText: '',
    };
    this.aiTurnToken = 0;
    this.engineClient = new EngineClient();

    this.buildShell();
    this.manualMoveDialogReturnFocus = false;

    this.announcer = new LiveRegionAnnouncer(this.liveRegion);
    this.boardView = new BoardView({
      container: this.boardContainer,
      onCellActivate: (index) => this.handleCellActivate(index),
      onShortcutReadDiscSummary: () => this.handleReadDiscSummary(),
      onShortcutReadLastMove: () => this.handleReadLastMove(),
      onShortcutRequestManualMoveInput: () => this.handleOpenManualMoveDialog(),
      onShortcutNoPlayableMove: () => this.handleNoPlayableMoveShortcut(),
    });
    this.settingsView = new SettingsPanelView({
      container: this.settingsContainer,
      initialSettings: this.settings,
      onSettingsChange: (settings) => this.handleSettingsChange(settings),
      onNewGame: () => this.handleNewGame(),
      onNewXotGame: () => this.handleNewXotGame(),
      onUndo: () => this.handleUndo(),
      onReadStatus: () => this.handleReadStatus(),
      onReadSettings: () => this.handleReadSettings(),
      onStartFromSequence: (sequenceText) => this.handleStartFromSequence(sequenceText),
      onCopyMoveSequence: () => this.handleCopyMoveSequence(),
    });
    this.setupManualMoveDialog();
    this.applyThemeMode(this.settings.themeMode);

    this.render();
  }

  buildShell() {
    this.root.innerHTML = `
      <main class="app-shell">
        <header class="panel hero-panel" aria-labelledby="app-title">
          <h1 id="app-title">접근 가능한 오델로 AI</h1>
          <p>
            정적 호스팅이 가능한 순수 HTML, CSS, JavaScript 앱입니다. 보드는 표로 제공되며, 모든 칸은 버튼으로 탐색할 수 있습니다.
          </p>
          <p id="board-help-text">
            Tab으로 판 전체를 순차 탐색할 수 있고, Enter 또는 Space로 현재 칸을 실행합니다. 방향키와 Home, End로 같은 행 안팎을 빠르게 이동할 수도 있습니다. 설정에서 켜 두면 보드 안에서 S는 돌 개수, L은 최근 수, M과 Shift+M은 다음/이전 합법 수 이동, I는 좌표 직접 입력입니다.
          </p>
        </header>

        <div class="app-grid">
          <section class="panel board-panel" aria-labelledby="board-section-title">
            <div class="panel-heading-row">
              <h2 id="board-section-title">오델로 판</h2>
              <p class="panel-inline-note">각 칸의 접근 가능한 이름은 좌표를 포함하고, 돌이 있으면 돌 색상을 먼저 읽습니다.</p>
            </div>
            <div id="board-container"></div>
          </section>

          <div class="sidebar-stack">
            <section class="panel" aria-labelledby="game-status-title">
              <h2 id="game-status-title">대국 상태</h2>
              <div id="status-container"></div>
            </section>

            <section class="panel" aria-labelledby="settings-section-title">
              <h2 id="settings-section-title">설정과 명령</h2>
              <div id="settings-container"></div>
            </section>

            <section class="panel" aria-labelledby="move-log-title">
              <h2 id="move-log-title">착수 기록</h2>
              <div id="move-log-container"></div>
            </section>
          </div>
        </div>

        <div id="live-region" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>

        <dialog id="manual-move-dialog" class="manual-move-dialog" aria-labelledby="manual-move-dialog-title">
          <form id="manual-move-form" class="manual-move-dialog-form" method="dialog" novalidate>
            <h2 id="manual-move-dialog-title">착수 좌표 직접 입력</h2>
            <p id="manual-move-dialog-help" class="subtle-text">
              예: C3, F7. 현재 둘 수 있는 좌표를 입력한 뒤 확인을 누르세요.
            </p>
            <label for="manual-move-input">좌표 입력</label>
            <input
              id="manual-move-input"
              class="manual-move-input"
              type="text"
              inputmode="latin"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              maxlength="4"
              aria-describedby="manual-move-dialog-help manual-move-dialog-error"
            >
            <p id="manual-move-dialog-error" class="dialog-error" role="alert"></p>
            <div class="dialog-button-row">
              <button type="submit" id="manual-move-confirm-button">확인</button>
              <button type="button" id="manual-move-cancel-button">취소</button>
            </div>
          </form>
        </dialog>
      </main>
    `;

    this.boardContainer = this.root.querySelector('#board-container');
    this.statusContainer = this.root.querySelector('#status-container');
    this.settingsContainer = this.root.querySelector('#settings-container');
    this.moveLogContainer = this.root.querySelector('#move-log-container');
    this.liveRegion = this.root.querySelector('#live-region');
    this.manualMoveDialog = this.root.querySelector('#manual-move-dialog');
    this.manualMoveForm = this.root.querySelector('#manual-move-form');
    this.manualMoveInput = this.root.querySelector('#manual-move-input');
    this.manualMoveHelp = this.root.querySelector('#manual-move-dialog-help');
    this.manualMoveError = this.root.querySelector('#manual-move-dialog-error');
    this.manualMoveCancelButton = this.root.querySelector('#manual-move-cancel-button');
  }

  setupManualMoveDialog() {
    this.manualMoveForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleConfirmManualMoveInput();
    });

    this.manualMoveCancelButton?.addEventListener('click', () => {
      this.closeManualMoveDialog({ restoreFocus: true });
    });

    this.manualMoveDialog?.addEventListener('close', () => {
      const shouldRestoreFocus = this.manualMoveDialogReturnFocus;
      this.manualMoveDialogReturnFocus = false;
      this.resetManualMoveDialog();
      if (shouldRestoreFocus) {
        window.requestAnimationFrame(() => {
          this.boardView.focusCell(this.boardView.lastFocusedIndex);
        });
      }
    });
  }

  resetManualMoveDialog() {
    if (this.manualMoveInput) {
      this.manualMoveInput.value = '';
      this.manualMoveInput.removeAttribute('aria-invalid');
    }
    if (this.manualMoveError) {
      this.manualMoveError.textContent = '';
    }
  }

  setManualMoveError(message) {
    if (!this.manualMoveError || !this.manualMoveInput) {
      return;
    }

    const normalizedMessage = String(message ?? '').trim();
    this.manualMoveError.textContent = normalizedMessage;
    if (normalizedMessage) {
      this.manualMoveInput.setAttribute('aria-invalid', 'true');
    } else {
      this.manualMoveInput.removeAttribute('aria-invalid');
    }
  }

  closeManualMoveDialog({ restoreFocus = true } = {}) {
    if (!isDialogOpen(this.manualMoveDialog)) {
      if (restoreFocus) {
        window.requestAnimationFrame(() => {
          this.boardView.focusCell(this.boardView.lastFocusedIndex);
        });
      }
      return;
    }

    this.manualMoveDialogReturnFocus = restoreFocus;
    closeDialog(this.manualMoveDialog);
  }

  getResolvedOptions() {
    const resolved = resolveEngineOptions(this.settings.presetKey, this.settings.customInputs, this.settings.styleKey);
    return {
      ...resolved,
      searchAlgorithm: normalizeSearchAlgorithmForPreset(
        this.settings.searchAlgorithm ?? DEFAULT_SEARCH_ALGORITHM,
        this.settings.presetKey,
      ),
      mctsExploration: resolved.mctsExploration ?? 1.35,
      mctsMaxIterations: resolved.mctsMaxIterations ?? 200000,
      mctsMaxNodes: resolved.mctsMaxNodes ?? Math.max(2048, Math.min(160000, Math.round((resolved.maxTableEntries ?? 50000) * 0.75))),
    };
  }

  getAiColor() {
    return this.settings.humanColor === 'black' ? 'white' : 'black';
  }

  setPositionSource(source) {
    this.positionSource = {
      type: source?.type ?? 'standard',
      label: source?.label ?? '기본 시작',
      sequenceText: String(source?.sequenceText ?? ''),
    };
  }

  applyHistoryState(history, { positionSource, restoreBoardFocus = true } = {}) {
    this.stateHistory = history;
    this.currentState = history[history.length - 1];
    this.searchResult = null;
    this.errorText = '';
    this.setPositionSource(positionSource);
    this.boardView.lastFocusedIndex = this.currentState.lastAction?.type === 'move'
      ? this.currentState.lastAction.index
      : 0;
    this.render({ restoreBoardFocus });
  }

  cancelAiTurn() {
    this.aiTurnToken += 1;

    if (!this.aiBusy) {
      return;
    }

    this.aiBusy = false;
    this.engineClient.cancel();
  }

  applyThemeMode(themeMode) {
    const normalizedThemeMode = normalizeThemeMode(themeMode);
    const rootElement = document.documentElement;
    if (!rootElement) {
      return;
    }

    if (normalizedThemeMode === 'system') {
      delete rootElement.dataset.theme;
      return;
    }

    rootElement.dataset.theme = normalizedThemeMode;
  }

  handleSettingsChange(settings) {
    this.closeManualMoveDialog({ restoreFocus: false });

    const nextSettings = {
      ...settings,
      themeMode: normalizeThemeMode(settings.themeMode),
      searchAlgorithm: normalizeSearchAlgorithmForPreset(
        describeSearchAlgorithm(settings.searchAlgorithm)?.key ?? DEFAULT_SEARCH_ALGORITHM,
        settings.presetKey,
      ),
      customInputs: { ...settings.customInputs },
    };
    const engineOrTurnSettingsChanged = this.settings.humanColor !== nextSettings.humanColor
      || this.settings.presetKey !== nextSettings.presetKey
      || this.settings.styleKey !== nextSettings.styleKey
      || this.settings.searchAlgorithm !== nextSettings.searchAlgorithm
      || customInputsChanged(this.settings.customInputs, nextSettings.customInputs);
    const accessibilitySettingsChanged = this.settings.showLegalHints !== nextSettings.showLegalHints
      || this.settings.enableBoardShortcuts !== nextSettings.enableBoardShortcuts;
    const themeChanged = normalizeThemeMode(this.settings.themeMode) !== nextSettings.themeMode;

    this.settings = nextSettings;

    if (themeChanged) {
      this.applyThemeMode(this.settings.themeMode);
    }

    if (engineOrTurnSettingsChanged) {
      this.cancelAiTurn();
      this.render();
      this.maybeStartAiTurn();
      return;
    }

    if (accessibilitySettingsChanged || themeChanged) {
      this.render();
    }
  }

  handleNewGame() {
    this.closeManualMoveDialog({ restoreFocus: false });
    this.cancelAiTurn();
    this.applyHistoryState([GameState.initial()], {
      positionSource: {
        type: 'standard',
        label: '기본 시작',
        sequenceText: '',
      },
      restoreBoardFocus: false,
    });

    this.announcer.announce(
      `새 게임 시작. 사람 ${PLAYER_NAMES[this.settings.humanColor]}, AI ${PLAYER_NAMES[this.getAiColor()]}. ${formatStateAnnouncement(this.currentState)}`,
    );
    this.maybeStartAiTurn();
  }

  handleNewXotGame() {
    this.closeManualMoveDialog({ restoreFocus: false });
    this.cancelAiTurn();

    try {
      const { index, sequence } = selectRandomXotOpening();
      const history = createStateHistoryFromMoveSequence(sequence);
      const displaySequence = formatCompactSequenceWithSpaces(sequence);
      this.applyHistoryState(history, {
        positionSource: {
          type: 'xot',
          label: `XOT ${index + 1}/${XOT_OPENING_COUNT}`,
          sequenceText: sequence,
        },
      });
      this.settingsView.setPositionSequenceValue(displaySequence);
      this.announcer.announce(
        `XOT 모드로 새 게임을 시작했습니다. ${index + 1}번째 시작 수순, 총 8수. ${displaySequence}. ${formatStateAnnouncement(this.currentState)}`
      );
      this.maybeStartAiTurn();
    } catch (error) {
      const detail = error instanceof Error ? error.message : '알 수 없는 오류입니다.';
      this.searchResult = null;
      this.errorText = `XOT 시작 수순을 불러오지 못했습니다. ${detail}`;
      this.render({ restoreBoardFocus: true });
      this.announcer.announce(this.errorText);
    }
  }

  handleStartFromSequence(sequenceText) {
    const trimmedSequence = String(sequenceText ?? '').trim();
    if (!trimmedSequence) {
      this.errorText = '불러올 수순을 입력해 주세요. 예: C4 C3 D6 C5';
      this.render({ restoreBoardFocus: true });
      this.announcer.announce(this.errorText);
      return;
    }

    this.closeManualMoveDialog({ restoreFocus: false });
    this.cancelAiTurn();

    try {
      const history = createStateHistoryFromMoveSequence(trimmedSequence);
      const compactSequence = serializeMoveHistoryCompact(history[history.length - 1].moveHistory);
      this.applyHistoryState(history, {
        positionSource: {
          type: 'sequence',
          label: compactSequence ? `입력 수순 ${history[history.length - 1].moveHistory.length}수` : '입력 수순',
          sequenceText: compactSequence,
        },
      });

      const moveCount = this.currentState.moveHistory.length;
      this.announcer.announce(
        `입력한 수순 ${moveCount}수 위치에서 새 게임을 시작했습니다. ${formatStateAnnouncement(this.currentState)}`,
      );
      this.maybeStartAiTurn();
    } catch (error) {
      this.searchResult = null;
      const detail = error instanceof Error ? error.message : '알 수 없는 오류입니다.';
      this.errorText = `입력한 수순으로 포지션을 시작하지 못했습니다. ${detail}`;
      this.render({ restoreBoardFocus: true });
      this.announcer.announce(this.errorText);
    }
  }

  handleUndo() {
    if (this.stateHistory.length <= 1) {
      this.announcer.announce('되돌릴 수 있는 수가 없습니다.');
      return;
    }

    this.closeManualMoveDialog({ restoreFocus: false });
    this.cancelAiTurn();
    this.searchResult = null;
    this.errorText = '';

    this.stateHistory.pop();
    while (this.stateHistory.length > 1 && this.stateHistory[this.stateHistory.length - 1].currentPlayer !== this.settings.humanColor) {
      this.stateHistory.pop();
    }

    this.currentState = this.stateHistory[this.stateHistory.length - 1];
    const restoredHumanTurn = this.currentState.currentPlayer === this.settings.humanColor;

    this.render({ restoreBoardFocus: true });
    this.announcer.announce(
      `${restoredHumanTurn
        ? '직전 사람 차례로 되돌렸습니다.'
        : '가장 가까운 이전 상태로 되돌렸습니다. 상대 차례이면 곧 다시 진행됩니다.'} ${formatStateAnnouncement(this.currentState)}`,
    );

    if (!restoredHumanTurn && !this.currentState.isTerminal()) {
      this.maybeStartAiTurn();
    }
  }

  handleReadStatus() {
    this.announcer.announce(
      `사람 ${PLAYER_NAMES[this.settings.humanColor]}, AI ${PLAYER_NAMES[this.getAiColor()]}. ${formatStateAnnouncement(this.currentState)}`,
    );
  }

  handleReadSettings() {
    const resolvedOptions = this.getResolvedOptions();
    const searchAlgorithm = describeSearchAlgorithm(resolvedOptions.searchAlgorithm);
    const presetDescription = ENGINE_PRESETS[resolvedOptions.presetKey]?.description ?? '';
    const styleDescription = resolvedOptions.styleApplied === false
      ? '스타일 적용 안 함'
      : (ENGINE_STYLE_PRESETS[resolvedOptions.styleKey]?.description ?? resolvedOptions.styleDescription ?? '');

    const segments = [
      `현재 설정. 사람 ${PLAYER_NAMES[this.settings.humanColor]}, AI ${PLAYER_NAMES[this.getAiColor()]}.`,
      `탐색 계열 ${searchAlgorithm?.label ?? '알 수 없음'}.`,
      `엔진 요약 ${formatEngineSummaryLine(resolvedOptions)}.`,
      presetDescription ? `난이도 설명 ${presetDescription}.` : '',
      styleDescription ? `스타일 설명 ${styleDescription}.` : '',
      `합법 수 시각 표시 ${this.settings.showLegalHints ? '켜짐' : '꺼짐'}.`,
      `보드 접근성 단축키 ${this.settings.enableBoardShortcuts ? '켜짐' : '꺼짐'}.`,
      `테마 ${formatThemeModeAnnouncement(this.settings.themeMode)}.`,
    ].filter(Boolean);

    this.announcer.announce(segments.join(' '));
  }

  handleReadDiscSummary() {
    const counts = this.currentState.getDiscCounts();
    this.announcer.announce(`현재 돌 개수 ${formatDiscSummary(counts)}.`);
  }

  handleReadLastMove() {
    this.announcer.announce(
      formatLastActionSummary(this.currentState.lastAction, this.currentState.moveHistory.length),
    );
  }

  handleNoPlayableMoveShortcut() {
    this.announcer.announce('현재 둘 수 있는 자리가 없습니다.');
  }

  async handleCopyMoveSequence() {
    try {
      const compactSequence = serializeMoveHistoryCompact(this.currentState.moveHistory);
      if (!compactSequence) {
        this.announcer.announce('아직 복사할 착수 기록이 없습니다.');
        return;
      }

      await copyTextToClipboard(compactSequence);
      this.announcer.announce('현재 수순 좌표 기보를 클립보드에 복사했습니다.');
    } catch (error) {
      this.announcer.announce('좌표 기보를 클립보드에 복사하지 못했습니다.');
    }
  }

  handleOpenManualMoveDialog() {
    if (this.aiBusy) {
      this.announcer.announce('AI가 생각 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (this.currentState.isTerminal()) {
      this.announcer.announce(formatStateAnnouncement(this.currentState));
      return;
    }

    if (this.currentState.currentPlayer !== this.settings.humanColor) {
      this.announcer.announce(`현재 ${PLAYER_NAMES[this.currentState.currentPlayer]} 차례는 AI가 두는 중입니다.`);
      return;
    }

    const legalMoves = this.currentState.getLegalMoves();
    if (legalMoves.length === 0) {
      this.handleNoPlayableMoveShortcut();
      return;
    }

    this.resetManualMoveDialog();
    if (this.manualMoveHelp) {
      this.manualMoveHelp.textContent = `예: C3, F7. 현재 둘 수 있는 칸 ${legalMoves.length}개: ${formatLegalMovesList(legalMoves)}.`;
    }

    this.manualMoveDialogReturnFocus = true;
    openDialog(this.manualMoveDialog);
    window.requestAnimationFrame(() => {
      this.manualMoveInput?.focus();
      this.manualMoveInput?.select();
    });
  }

  handleConfirmManualMoveInput() {
    if (!this.manualMoveInput) {
      return;
    }

    const rawInput = String(this.manualMoveInput.value ?? '').trim();
    const normalizedCoord = rawInput.toUpperCase();
    const coordinatePattern = /^[A-H][1-8]$/;

    if (!coordinatePattern.test(normalizedCoord)) {
      const message = '좌표 형식이 올바르지 않습니다. 예: C3 또는 F7처럼 입력해 주세요.';
      this.setManualMoveError(message);
      this.announcer.announce(message);
      this.manualMoveInput.focus();
      this.manualMoveInput.select();
      return;
    }

    const index = coordToIndex(normalizedCoord);
    const legalMoves = this.currentState.getLegalMoves();
    const legalMove = legalMoves.find((move) => move.index === index);

    if (!legalMove) {
      const occupant = this.currentState.getCellOccupant(index);
      const message = occupant
        ? `${normalizedCoord} 칸은 이미 차 있어 지금 둘 수 없습니다.`
        : `${normalizedCoord}에는 지금 둘 수 없습니다. 가능한 칸 ${legalMoves.length}개: ${formatLegalMovesList(legalMoves)}.`;
      this.setManualMoveError(message);
      this.announcer.announce(message);
      this.manualMoveInput.focus();
      this.manualMoveInput.select();
      return;
    }

    this.manualMoveDialogReturnFocus = false;
    closeDialog(this.manualMoveDialog);
    this.handleCellActivate(index);
  }

  appendState(nextState) {
    this.stateHistory.push(nextState);
    this.currentState = nextState;
  }

  processForcedPasses(messages) {
    while (!this.currentState.isTerminal() && this.currentState.getLegalMoves().length === 0) {
      const passedState = this.currentState.passTurn();
      this.appendState(passedState);
      messages.push(formatActionAnnouncement(passedState.lastAction, passedState.getDiscCounts()));
    }

    if (this.currentState.isTerminal()) {
      messages.push(formatStateAnnouncement(this.currentState));
    }
  }

  handleCellActivate(index) {
    const state = this.currentState;
    const legalMoves = state.getLegalMoves();
    const legalMoveSet = new Set(legalMoves.map((move) => move.index));

    if (this.aiBusy) {
      this.announcer.announce('AI가 생각 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (state.isTerminal()) {
      this.announcer.announce(formatStateAnnouncement(state));
      return;
    }

    if (state.currentPlayer !== this.settings.humanColor) {
      this.announcer.announce(`현재 ${PLAYER_NAMES[state.currentPlayer]} 차례는 AI가 두는 중입니다.`);
      return;
    }

    const outcome = state.applyMove(index);
    if (!outcome) {
      const occupant = state.getCellOccupant(index);
      if (occupant) {
        this.announcer.announce(`${formatCellName(state, index, legalMoveSet)} 칸은 이미 차 있어 지금 둘 수 없습니다.`);
      } else {
        const coord = indexToCoord(index);
        this.announcer.announce(`${coord}에는 지금 둘 수 없습니다. 가능한 칸 ${legalMoves.length}개: ${formatLegalMovesList(legalMoves)}.`);
      }
      return;
    }

    const messages = [];
    this.appendState(outcome.state);
    messages.push(formatActionAnnouncement(outcome.move, this.currentState.getDiscCounts()));
    this.processForcedPasses(messages);
    this.boardView.lastFocusedIndex = index;
    this.errorText = '';
    this.render({ restoreBoardFocus: true });
    this.announcer.announce(messages.join(' '));
    this.maybeStartAiTurn();
  }

  async maybeStartAiTurn() {
    if (this.aiBusy || this.currentState.isTerminal()) {
      return;
    }

    if (this.currentState.currentPlayer === this.settings.humanColor) {
      return;
    }

    const searchStartHash = this.currentState.hashKey();
    const searchStartState = this.currentState;
    const options = {
      presetKey: this.settings.presetKey,
      styleKey: this.settings.styleKey,
      searchAlgorithm: this.settings.searchAlgorithm,
      ...this.settings.customInputs,
    };
    const turnToken = this.aiTurnToken + 1;
    this.aiTurnToken = turnToken;
    this.aiBusy = true;
    this.errorText = '';
    this.render({ restoreBoardFocus: true });

    try {
      await nextAnimationFrame();
      if (turnToken !== this.aiTurnToken) {
        return;
      }

      await wait(140);
      if (turnToken !== this.aiTurnToken) {
        return;
      }

      const result = await this.engineClient.search(searchStartState, options);
      if (turnToken !== this.aiTurnToken || !this.aiBusy) {
        return;
      }

      if (this.currentState.hashKey() !== searchStartHash) {
        this.aiBusy = false;
        return;
      }

      this.aiBusy = false;
      this.searchResult = result;

      if (result.error) {
        this.errorText = `AI 워커 오류: ${result.error}`;
        this.render({ restoreBoardFocus: true });
        this.announcer.announce(this.errorText);
        return;
      }

      if (result.bestMoveIndex === null) {
        const passedState = this.currentState.passTurn();
        this.appendState(passedState);
        const messages = [formatActionAnnouncement(passedState.lastAction, passedState.getDiscCounts())];
        this.processForcedPasses(messages);
        this.render({ restoreBoardFocus: true });
        this.announcer.announce(messages.join(' '));
        this.maybeStartAiTurn();
        return;
      }

      const outcome = this.currentState.applyMove(result.bestMoveIndex);
      if (!outcome) {
        this.errorText = 'AI가 불법 수를 반환했습니다. 현재 탐색 결과는 무시됩니다.';
        this.render();
        this.announcer.announce(this.errorText);
        return;
      }

      const messages = [];
      this.appendState(outcome.state);
      messages.push(formatActionAnnouncement(outcome.move, this.currentState.getDiscCounts()));
      this.processForcedPasses(messages);
      this.render({ restoreBoardFocus: true });
      this.announcer.announce(messages.join(' '));
      this.maybeStartAiTurn();
    } catch (error) {
      if (error instanceof SearchCanceledError) {
        return;
      }

      this.aiBusy = false;
      this.errorText = 'AI 탐색 중 오류가 발생했습니다.';
      this.render();
      this.announcer.announce(this.errorText);
      console.error(error);
    }
  }

  renderStatusPanel() {
    const counts = this.currentState.getDiscCounts();
    const legalMoves = this.currentState.getLegalMoves();
    const lastActionText = this.currentState.lastAction
      ? formatMoveLogEntry(this.currentState.lastAction, this.currentState.moveHistory.length)
      : '아직 착수가 없습니다.';
    const aiStateText = this.aiBusy
      ? `${PLAYER_NAMES[this.getAiColor()]} AI가 수를 계산 중입니다.`
      : this.currentState.isTerminal()
        ? '대국이 끝났습니다.'
        : this.currentState.currentPlayer === this.settings.humanColor
          ? '사람 차례입니다.'
          : '다음 차례는 AI입니다.';
    const sequenceText = this.positionSource.sequenceText
      ? formatCompactSequenceWithSpaces(this.positionSource.sequenceText)
      : '';
    const positionSourceText = sequenceText
      ? `${this.positionSource.label} (${sequenceText})`
      : this.positionSource.label;
    const resolvedOptions = this.getResolvedOptions();
    const searchAlgorithm = describeSearchAlgorithm(resolvedOptions.searchAlgorithm);
    const mctsProofSummary = formatMctsProofSummary(this.searchResult);
    const resolvedList = formatResolvedOptionsList(resolvedOptions).map((entry) => `
      <li><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.value)}</li>
    `).join('');

    this.statusContainer.innerHTML = `
      <div class="status-block">
        <h3>현재 상태 요약</h3>
        <ul class="summary-list">
          <li><strong>현재 차례:</strong> ${PLAYER_NAMES[this.currentState.currentPlayer]}</li>
          <li><strong>사람 / AI:</strong> ${PLAYER_NAMES[this.settings.humanColor]} / ${PLAYER_NAMES[this.getAiColor()]}</li>
          <li><strong>시작 방식:</strong> ${escapeHtml(positionSourceText)}</li>
          <li><strong>현재 점수:</strong> ${escapeHtml(formatDiscSummary(counts))}</li>
          <li><strong>합법 수:</strong> ${legalMoves.length}개 (${escapeHtml(formatLegalMovesList(legalMoves))})</li>
          <li><strong>최근 행동:</strong> ${escapeHtml(lastActionText)}</li>
          <li><strong>AI 상태:</strong> ${escapeHtml(aiStateText)}</li>
          ${this.errorText ? `<li><strong>오류:</strong> ${escapeHtml(this.errorText)}</li>` : ''}
        </ul>
      </div>

      <div class="status-block">
        <h3>엔진 요약</h3>
        <p>${escapeHtml(formatEngineSummaryLine(resolvedOptions))}</p>
        <p><strong>AI 모드:</strong> ${escapeHtml(searchAlgorithm?.description ?? '')}</p>
        <p><strong>난이도:</strong> ${escapeHtml(ENGINE_PRESETS[resolvedOptions.presetKey]?.description ?? '')}</p>
        <p><strong>스타일:</strong> ${escapeHtml(ENGINE_STYLE_PRESETS[resolvedOptions.styleKey]?.description ?? resolvedOptions.styleDescription ?? '')}</p>
      </div>

      <div class="status-block">
        <div class="section-toggle-row">
          <h3 id="engine-metrics-title">사용 중인 엔진 수치</h3>
          <button
            type="button"
            id="engine-metrics-toggle-button"
            class="section-toggle-button"
            aria-controls="engine-metrics-content"
            aria-expanded="${this.engineMetricsExpanded ? 'true' : 'false'}"
          >${this.engineMetricsExpanded ? '사용 중인 엔진 수치 접기' : '사용 중인 엔진 수치 펼치기'}</button>
        </div>
        <div id="engine-metrics-content" class="collapsible-content" ${this.engineMetricsExpanded ? '' : 'hidden'}>
          <ul class="compact-list">
            ${resolvedList}
          </ul>
        </div>
      </div>

      <div class="status-block">
        <h3>최근 AI 탐색</h3>
        <p>${escapeHtml(formatSearchSummary(this.searchResult))}</p>
        ${mctsProofSummary ? `<p><strong>말기 proof:</strong> ${escapeHtml(mctsProofSummary)}</p>` : ''}
      </div>
    `;

    const engineMetricsToggleButton = this.statusContainer.querySelector('#engine-metrics-toggle-button');
    const engineMetricsContent = this.statusContainer.querySelector('#engine-metrics-content');

    if (engineMetricsToggleButton && engineMetricsContent) {
      engineMetricsToggleButton.addEventListener('click', () => {
        this.engineMetricsExpanded = !this.engineMetricsExpanded;
        engineMetricsContent.hidden = !this.engineMetricsExpanded;
        engineMetricsToggleButton.setAttribute('aria-expanded', String(this.engineMetricsExpanded));
        engineMetricsToggleButton.textContent = this.engineMetricsExpanded
          ? '사용 중인 엔진 수치 접기'
          : '사용 중인 엔진 수치 펼치기';
      });
    }
  }

  renderMoveLog() {
    const moves = this.currentState.moveHistory;
    if (moves.length === 0) {
      this.moveLogContainer.innerHTML = '<p>아직 착수 기록이 없습니다.</p>';
      return;
    }

    const items = moves.map((action, index) => `
      <li>${escapeHtml(formatMoveLogEntry(action, index + 1))}</li>
    `).join('');

    this.moveLogContainer.innerHTML = `<ol class="move-log-list">${items}</ol>`;
  }

  render({ restoreBoardFocus = false } = {}) {
    const resolvedOptions = this.getResolvedOptions();
    const legalMoves = this.currentState.getLegalMoves();

    this.settingsView.setResolvedOptionsSummary(formatEngineSummaryLine(resolvedOptions));
    this.settingsView.setUndoEnabled(this.stateHistory.length > 1);
    this.settingsView.setCopySequenceEnabled(this.currentState.moveHistory.length > 0);
    this.boardView.render({
      state: this.currentState,
      legalMoves,
      humanColor: this.settings.humanColor,
      aiBusy: this.aiBusy,
      showLegalHints: this.settings.showLegalHints,
      enableBoardShortcuts: this.settings.enableBoardShortcuts,
    }, { restoreFocus: restoreBoardFocus });
    this.renderStatusPanel();
    this.renderMoveLog();
  }
}
