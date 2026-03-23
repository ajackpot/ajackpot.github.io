import { ENGINE_PRESETS, ENGINE_STYLE_PRESETS, resolveEngineOptions } from '../ai/presets.js';
import { GameState } from '../core/game-state.js';
import { indexToCoord } from '../core/bitboard.js';
import { BoardView } from './board-view.js';
import { EngineClient, SearchCanceledError } from './engine-client.js';
import {
  escapeHtml,
  formatActionAnnouncement,
  formatCellName,
  formatDiscSummary,
  formatEngineSummaryLine,
  formatLegalMovesList,
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
    showLegalHints: true,
    customInputs,
  };
}

function nextAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
    this.engineClient = new EngineClient();

    this.buildShell();

    this.announcer = new LiveRegionAnnouncer(this.liveRegion);
    this.boardView = new BoardView({
      container: this.boardContainer,
      onCellActivate: (index) => this.handleCellActivate(index),
    });
    this.settingsView = new SettingsPanelView({
      container: this.settingsContainer,
      initialSettings: this.settings,
      onSettingsChange: (settings) => this.handleSettingsChange(settings),
      onNewGame: () => this.handleNewGame(),
      onUndo: () => this.handleUndo(),
      onReadStatus: () => this.handleReadStatus(),
    });
    this.statusContainer.addEventListener('click', (event) => this.handleStatusContainerClick(event));

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
            Tab으로 판 전체를 순차 탐색할 수 있고, Enter 또는 Space로 현재 칸을 실행합니다. 방향키와 Home, End로 같은 행 안팎을 빠르게 이동할 수도 있습니다.
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
      </main>
    `;

    this.boardContainer = this.root.querySelector('#board-container');
    this.statusContainer = this.root.querySelector('#status-container');
    this.settingsContainer = this.root.querySelector('#settings-container');
    this.moveLogContainer = this.root.querySelector('#move-log-container');
    this.liveRegion = this.root.querySelector('#live-region');
  }

  getResolvedOptions() {
    return resolveEngineOptions(this.settings.presetKey, this.settings.customInputs, this.settings.styleKey);
  }

  getAiColor() {
    return this.settings.humanColor === 'black' ? 'white' : 'black';
  }

  cancelAiTurn() {
    if (!this.aiBusy) {
      return;
    }

    this.aiBusy = false;
    this.engineClient.cancel();
  }

  handleSettingsChange(settings) {
    this.settings = {
      ...settings,
      customInputs: { ...settings.customInputs },
    };
    this.cancelAiTurn();
    this.render();
    this.maybeStartAiTurn();
  }

  handleNewGame() {
    this.cancelAiTurn();
    this.stateHistory = [GameState.initial()];
    this.currentState = this.stateHistory[0];
    this.searchResult = null;
    this.errorText = '';
    this.boardView.lastFocusedIndex = 0;
    this.render();

    this.announcer.announce(
      `새 게임 시작. 사람 ${PLAYER_NAMES[this.settings.humanColor]}, AI ${PLAYER_NAMES[this.getAiColor()]}. ${formatStateAnnouncement(this.currentState)}`,
    );
    this.maybeStartAiTurn();
  }

  handleUndo() {
    if (this.stateHistory.length <= 1) {
      this.announcer.announce('되돌릴 수 있는 수가 없습니다.');
      return;
    }

    this.cancelAiTurn();
    this.searchResult = null;
    this.errorText = '';

    this.stateHistory.pop();
    while (this.stateHistory.length > 1 && this.stateHistory[this.stateHistory.length - 1].currentPlayer !== this.settings.humanColor) {
      this.stateHistory.pop();
    }

    this.currentState = this.stateHistory[this.stateHistory.length - 1];
    this.render({ restoreBoardFocus: true });
    this.announcer.announce(`직전 사람 차례로 되돌렸습니다. ${formatStateAnnouncement(this.currentState)}`);
  }

  handleReadStatus() {
    this.announcer.announce(
      `사람 ${PLAYER_NAMES[this.settings.humanColor]}, AI ${PLAYER_NAMES[this.getAiColor()]}. ${formatStateAnnouncement(this.currentState)}`,
    );
  }

  handleStatusContainerClick(event) {
    const toggleButton = event.target.closest('#engine-metrics-toggle-button');
    if (!toggleButton) {
      return;
    }

    this.engineMetricsExpanded = !this.engineMetricsExpanded;
    this.renderStatusPanel();
    this.statusContainer.querySelector('#engine-metrics-toggle-button')?.focus();
    this.announcer.announce(
      this.engineMetricsExpanded ? '사용 중인 엔진 수치를 펼쳤습니다.' : '사용 중인 엔진 수치를 접었습니다.',
    );
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
    const options = {
      presetKey: this.settings.presetKey,
      styleKey: this.settings.styleKey,
      ...this.settings.customInputs,
    };
    this.aiBusy = true;
    this.errorText = '';
    this.render({ restoreBoardFocus: true });

    try {
      await nextAnimationFrame();
      await wait(140);
      const result = await this.engineClient.search(this.currentState, options);
      if (!this.aiBusy) {
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
    const resolvedOptions = this.getResolvedOptions();
    const resolvedList = formatResolvedOptionsList(resolvedOptions).map((entry) => `
      <li><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.value)}</li>
    `).join('');
    const engineMetricsToggleLabel = this.engineMetricsExpanded ? '사용 중인 엔진 수치 접기' : '사용 중인 엔진 수치 펼치기';

    this.statusContainer.innerHTML = `
      <div class="status-block">
        <h3>현재 상태 요약</h3>
        <ul class="summary-list">
          <li><strong>현재 차례:</strong> ${PLAYER_NAMES[this.currentState.currentPlayer]}</li>
          <li><strong>사람 / AI:</strong> ${PLAYER_NAMES[this.settings.humanColor]} / ${PLAYER_NAMES[this.getAiColor()]}</li>
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
        <p><strong>난이도:</strong> ${escapeHtml(ENGINE_PRESETS[resolvedOptions.presetKey]?.description ?? '')}</p>
        <p><strong>스타일:</strong> ${escapeHtml(resolvedOptions.styleDescription ?? ENGINE_STYLE_PRESETS[resolvedOptions.styleKey]?.description ?? '')}</p>
      </div>

      <div class="status-block">
        <div class="status-block-header">
          <h3>사용 중인 엔진 수치</h3>
          <button
            type="button"
            id="engine-metrics-toggle-button"
            class="section-toggle-button"
            aria-expanded="${this.engineMetricsExpanded ? 'true' : 'false'}"
            aria-controls="engine-metrics-collapsible-panel"
          >${engineMetricsToggleLabel}</button>
        </div>
        <div id="engine-metrics-collapsible-panel" class="collapsible-panel" ${this.engineMetricsExpanded ? '' : 'hidden'}>
          <ul class="compact-list">
            ${resolvedList}
          </ul>
        </div>
      </div>

      <div class="status-block">
        <h3>최근 AI 탐색</h3>
        <p>${escapeHtml(formatSearchSummary(this.searchResult))}</p>
      </div>
    `;
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
    this.boardView.render({
      state: this.currentState,
      legalMoves,
      humanColor: this.settings.humanColor,
      aiBusy: this.aiBusy,
      showLegalHints: this.settings.showLegalHints,
    }, { restoreFocus: restoreBoardFocus });
    this.renderStatusPanel();
    this.renderMoveLog();
  }
}
