import { CUSTOM_ENGINE_FIELDS, ENGINE_PRESETS } from '../ai/presets.js';
import { escapeHtml } from './formatters.js';

export class SettingsPanelView {
  constructor({
    container,
    initialSettings,
    onSettingsChange,
    onNewGame,
    onUndo,
    onReadStatus,
  }) {
    this.container = container;
    this.onSettingsChange = onSettingsChange;
    this.onNewGame = onNewGame;
    this.onUndo = onUndo;
    this.onReadStatus = onReadStatus;

    this.container.innerHTML = this.buildMarkup(initialSettings);
    this.form = this.container.querySelector('form');
    this.presetSelect = this.container.querySelector('#preset-select');
    this.customFieldset = this.container.querySelector('#custom-options-fieldset');
    this.undoButton = this.container.querySelector('#undo-button');
    this.engineSummaryOutput = this.container.querySelector('#engine-summary-output');
    this.customStateNote = this.container.querySelector('#custom-state-note');

    this.form.addEventListener('input', () => {
      this.syncCustomFieldAvailability();
      this.onSettingsChange(this.readSettings());
    });

    this.form.addEventListener('change', () => {
      this.syncCustomFieldAvailability();
      this.onSettingsChange(this.readSettings());
    });

    this.container.querySelector('#new-game-button').addEventListener('click', () => {
      this.onNewGame();
    });

    this.undoButton.addEventListener('click', () => {
      this.onUndo();
    });

    this.container.querySelector('#read-status-button').addEventListener('click', () => {
      this.onReadStatus();
    });

    this.syncCustomFieldAvailability();
  }

  buildMarkup(initialSettings) {
    const presetOptions = Object.entries(ENGINE_PRESETS).map(([key, preset]) => `
      <option value="${key}" ${initialSettings.presetKey === key ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
    `).join('');

    const customFields = CUSTOM_ENGINE_FIELDS.map((field) => {
      const value = initialSettings.customInputs[field.key] ?? ENGINE_PRESETS.custom[field.key];
      return `
        <div class="field-row">
          <label for="custom-${field.key}">${escapeHtml(field.label)}</label>
          <input
            id="custom-${field.key}"
            name="${field.key}"
            type="number"
            min="${field.min}"
            max="${field.max}"
            step="${field.step}"
            value="${value}"
            inputmode="decimal"
          >
        </div>
      `;
    }).join('');

    return `
      <form class="settings-form" aria-describedby="settings-help-text">
        <p id="settings-help-text" class="subtle-text">
          난이도 프리셋은 즉시 반영됩니다. 사용자 지정 수치는 “사용자 지정”일 때만 활성화되고 적용됩니다.
        </p>

        <fieldset>
          <legend>플레이어 색상</legend>
          <div class="radio-row">
            <label><input type="radio" name="humanColor" value="black" ${initialSettings.humanColor === 'black' ? 'checked' : ''}> 사람이 흑</label>
            <label><input type="radio" name="humanColor" value="white" ${initialSettings.humanColor === 'white' ? 'checked' : ''}> 사람이 백</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>엔진 난이도</legend>
          <div class="field-row">
            <label for="preset-select">난이도 프리셋</label>
            <select id="preset-select" name="presetKey">
              ${presetOptions}
            </select>
          </div>
          <p id="engine-summary-output" class="subtle-text" role="status" aria-live="polite" aria-atomic="true"></p>
        </fieldset>

        <fieldset id="custom-options-fieldset">
          <legend>사용자 지정 수치</legend>
          <p id="custom-state-note" class="subtle-text"></p>
          <div class="custom-grid">
            ${customFields}
          </div>
        </fieldset>

        <fieldset>
          <legend>표시 옵션</legend>
          <div class="checkbox-row">
            <label><input type="checkbox" name="showLegalHints" ${initialSettings.showLegalHints ? 'checked' : ''}> 합법 수 시각 표시</label>
          </div>
        </fieldset>

        <div class="button-stack">
          <button type="button" id="new-game-button">현재 설정으로 새 게임 시작</button>
          <button type="button" id="undo-button">직전 사람 차례로 무르기</button>
          <button type="button" id="read-status-button">현재 상태 다시 읽기</button>
        </div>
      </form>
    `;
  }

  readSettings() {
    const formData = new FormData(this.form);
    const customInputs = {};
    for (const field of CUSTOM_ENGINE_FIELDS) {
      const control = this.form.querySelector(`[name="${field.key}"]`);
      customInputs[field.key] = control ? control.value : formData.get(field.key);
    }

    return {
      humanColor: formData.get('humanColor') === 'white' ? 'white' : 'black',
      presetKey: formData.get('presetKey') || 'strong',
      showLegalHints: this.form.querySelector('[name="showLegalHints"]').checked,
      customInputs,
    };
  }

  syncCustomFieldAvailability() {
    const isCustom = this.presetSelect.value === 'custom';
    this.customFieldset.disabled = !isCustom;
    for (const control of this.customFieldset.querySelectorAll('input, select')) {
      control.disabled = !isCustom;
    }
    this.customStateNote.textContent = isCustom
      ? '사용자 지정 프리셋이 켜져 있습니다. 아래 입력값이 엔진에 적용됩니다.'
      : '현재는 사용자 지정이 꺼져 있습니다. 아래 입력값은 잠시 보관만 되며 엔진에는 적용되지 않습니다.';
  }

  setResolvedOptionsSummary(text) {
    this.engineSummaryOutput.textContent = text;
  }

  setUndoEnabled(enabled) {
    this.undoButton.disabled = !enabled;
  }
}
