import { DEFAULT_ENGINE_OPTIONS, ENGINE_PRESETS } from '../engine/EnginePresets.js';

export class ControlsView {
  constructor({ root, onSettingsChange, onNewGame, onUndo, onClearSelection }) {
    this.root = root;
    this.onSettingsChange = onSettingsChange;
    this.onNewGame = onNewGame;
    this.onUndo = onUndo;
    this.onClearSelection = onClearSelection;
    this.#captureElements();
    this.#bindEvents();
    this.updateCustomState();
    this.updatePresetDescription();
  }

  #captureElements() {
    this.presetSelect = this.root.querySelector('#engine-preset');
    this.engineSideSelect = this.root.querySelector('#engine-side');
    this.orientationSelect = this.root.querySelector('#board-orientation');
    this.openingBookCheckbox = this.root.querySelector('#use-opening-book');
    this.presetDescription = this.root.querySelector('#preset-description');
    this.customInputs = [...this.root.querySelectorAll('[data-custom-only="true"]')];
    this.moveTimeInput = this.root.querySelector('#move-time-ms');
    this.maxDepthInput = this.root.querySelector('#max-depth');
    this.candidatePoolInput = this.root.querySelector('#candidate-pool');
    this.skillNoiseInput = this.root.querySelector('#skill-noise');
    this.quiescenceInput = this.root.querySelector('#quiescence-depth');
    this.newGameButton = this.root.querySelector('#new-game-button');
    this.undoButton = this.root.querySelector('#undo-button');
    this.clearSelectionButton = this.root.querySelector('#clear-selection-button');
    this.engineStatus = this.root.querySelector('#engine-thinking-status');
  }

  #bindEvents() {
    this.root.addEventListener('change', () => {
      this.updateCustomState();
      this.updatePresetDescription();
      this.onSettingsChange?.(this.getSettings());
    });

    this.newGameButton.addEventListener('click', () => this.onNewGame?.());
    this.undoButton.addEventListener('click', () => this.onUndo?.());
    this.clearSelectionButton.addEventListener('click', () => this.onClearSelection?.());
  }

  getSettings() {
    return {
      presetKey: this.presetSelect.value,
      customValues: {
        moveTimeMs: Number(this.moveTimeInput.value),
        maxDepth: Number(this.maxDepthInput.value),
        candidatePool: Number(this.candidatePoolInput.value),
        skillNoiseCp: Number(this.skillNoiseInput.value),
        maxQuiescenceDepth: Number(this.quiescenceInput.value),
      },
      toggles: {
        engineSide: this.engineSideSelect.value,
        orientation: this.orientationSelect.value,
        useOpeningBook: this.openingBookCheckbox.checked,
      },
    };
  }

  updateCustomState() {
    const customEnabled = this.presetSelect.value === 'custom';
    this.customInputs.forEach((input) => {
      input.disabled = !customEnabled;
      input.setAttribute('aria-disabled', String(!customEnabled));
    });
  }

  updatePresetDescription() {
    const preset = ENGINE_PRESETS[this.presetSelect.value] ?? ENGINE_PRESETS.strong;
    const customMessage = this.presetSelect.value === 'custom'
      ? '사용자 지정 파라미터가 활성화되었습니다.'
      : '사용자 지정 파라미터는 사용자 지정 난이도에서만 적용됩니다.';
    this.presetDescription.textContent = `${preset.label}: ${preset.description} ${customMessage}`;
  }

  setThinking(thinking) {
    this.engineStatus.textContent = thinking ? 'AI가 현재 수를 계산 중입니다.' : 'AI가 대기 중입니다.';
    this.undoButton.disabled = thinking;
    this.undoButton.setAttribute('aria-disabled', String(thinking));
  }

  applyDefaults() {
    this.presetSelect.value = DEFAULT_ENGINE_OPTIONS.presetKey;
    this.engineSideSelect.value = DEFAULT_ENGINE_OPTIONS.engineSide;
    this.orientationSelect.value = DEFAULT_ENGINE_OPTIONS.orientation;
    this.openingBookCheckbox.checked = DEFAULT_ENGINE_OPTIONS.useOpeningBook;
    this.updateCustomState();
    this.updatePresetDescription();
  }
}
