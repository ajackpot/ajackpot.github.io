import { CUSTOM_ENGINE_FIELDS, ENGINE_PRESETS, ENGINE_STYLE_PRESETS } from '../ai/presets.js';
import { escapeHtml } from './formatters.js';

function buildCustomFieldControlMarkup(field, value, describedById = '') {
  const controlId = `custom-${field.key}`;
  const describedByAttr = describedById ? ` aria-describedby="${describedById}"` : '';
  if (field.type === 'select') {
    const options = Array.isArray(field.options) ? field.options : [];
    const optionMarkup = options.map((option) => {
      const optionValue = String(option.value);
      const isSelected = String(value) === optionValue;
      return `<option value="${escapeHtml(optionValue)}" ${isSelected ? 'selected' : ''}>${escapeHtml(option.label)}</option>`;
    }).join('');
    return `
      <select id="${controlId}" name="${field.key}"${describedByAttr}>
        ${optionMarkup}
      </select>
    `;
  }

  return `
    <input
      id="${controlId}"
      name="${field.key}"
      type="number"
      min="${field.min}"
      max="${field.max}"
      step="${field.step}"
      value="${escapeHtml(String(value))}"
      inputmode="decimal"${describedByAttr}
    >
  `;
}

function buildCustomFieldMarkup(field, value) {
  const helpTextId = field.helpText ? `custom-${field.key}-help` : '';
  const helpTextMarkup = field.helpText
    ? `<p id="${helpTextId}" class="subtle-text">${escapeHtml(field.helpText)}</p>`
    : '';
  return `
    <div class="field-row">
      <label for="custom-${field.key}">${escapeHtml(field.label)}</label>
      ${buildCustomFieldControlMarkup(field, value, helpTextId)}
      ${helpTextMarkup}
    </div>
  `;
}

function normalizeThemeMode(themeMode) {
  return themeMode === 'dark' || themeMode === 'high-contrast'
    ? themeMode
    : 'system';
}

function buildThemeRadioOptionMarkup({ value, label, checked }) {
  const inputId = `theme-mode-${value}`;
  return `
    <label for="${inputId}">
      <input
        id="${inputId}"
        type="radio"
        name="themeMode"
        value="${escapeHtml(value)}"
        ${checked ? 'checked' : ''}
      >
      ${escapeHtml(label)}
    </label>
  `;
}

export class SettingsPanelView {
  constructor({
    container,
    initialSettings,
    onSettingsChange,
    onNewGame,
    onNewXotGame,
    onUndo,
    onReadStatus,
    onStartFromSequence,
    onCopyMoveSequence,
  }) {
    this.container = container;
    this.onSettingsChange = onSettingsChange;
    this.onNewGame = onNewGame;
    this.onNewXotGame = onNewXotGame;
    this.onUndo = onUndo;
    this.onReadStatus = onReadStatus;
    this.onStartFromSequence = onStartFromSequence;
    this.onCopyMoveSequence = onCopyMoveSequence;
    this.settingsExpanded = false;

    this.container.innerHTML = this.buildMarkup(initialSettings);
    this.form = this.container.querySelector('form');
    this.presetSelect = this.container.querySelector('#preset-select');
    this.styleSelect = this.container.querySelector('#style-select');
    this.styleFieldset = this.container.querySelector('#style-preset-fieldset');
    this.customFieldset = this.container.querySelector('#custom-options-fieldset');
    this.positionSequenceInput = this.container.querySelector('#position-sequence-input');
    this.startFromSequenceButton = this.container.querySelector('#start-from-sequence-button');
    this.xotGameButton = this.container.querySelector('#xot-game-button');
    this.undoButton = this.container.querySelector('#undo-button');
    this.copyMoveSequenceButton = this.container.querySelector('#copy-move-sequence-button');
    this.engineSummaryOutput = this.container.querySelector('#engine-summary-output');
    this.customStateNote = this.container.querySelector('#custom-state-note');
    this.styleStateNote = this.container.querySelector('#style-state-note');
    this.settingsToggleButton = this.container.querySelector('#settings-toggle-button');
    this.settingsContent = this.container.querySelector('#settings-collapsible-content');

    this.form.addEventListener('input', (event) => {
      if (event.target?.closest('[data-ignore-settings-change="true"]')) {
        return;
      }
      this.syncCustomFieldAvailability();
      this.onSettingsChange(this.readSettings());
    });

    this.form.addEventListener('change', (event) => {
      if (event.target?.closest('[data-ignore-settings-change="true"]')) {
        return;
      }
      this.syncCustomFieldAvailability();
      this.onSettingsChange(this.readSettings());
    });

    this.settingsToggleButton.addEventListener('click', () => {
      this.settingsExpanded = !this.settingsExpanded;
      this.syncSettingsSectionVisibility();
    });

    this.container.querySelector('#new-game-button').addEventListener('click', () => {
      this.onNewGame();
    });

    this.xotGameButton?.addEventListener('click', () => {
      this.onNewXotGame?.();
    });

    this.startFromSequenceButton.addEventListener('click', () => {
      this.onStartFromSequence?.(this.positionSequenceInput?.value ?? '');
    });

    this.undoButton.addEventListener('click', () => {
      this.onUndo();
    });

    this.copyMoveSequenceButton.addEventListener('click', () => {
      this.onCopyMoveSequence?.();
    });

    this.container.querySelector('#read-status-button').addEventListener('click', () => {
      this.onReadStatus();
    });

    this.syncCustomFieldAvailability();
    this.syncSettingsSectionVisibility();
  }

  buildMarkup(initialSettings) {
    const themeMode = normalizeThemeMode(initialSettings.themeMode);
    const presetOptions = Object.entries(ENGINE_PRESETS).map(([key, preset]) => `
      <option value="${key}" ${initialSettings.presetKey === key ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
    `).join('');

    const styleOptions = Object.entries(ENGINE_STYLE_PRESETS).map(([key, preset]) => `
      <option value="${key}" ${initialSettings.styleKey === key ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
    `).join('');

    const customFields = CUSTOM_ENGINE_FIELDS.map((field) => {
      const value = initialSettings.customInputs[field.key] ?? ENGINE_PRESETS.custom[field.key];
      return buildCustomFieldMarkup(field, value);
    }).join('');

    const themeOptionsMarkup = [
      { value: 'system', label: '시스템 설정 따르기' },
      { value: 'dark', label: '다크 모드' },
      { value: 'high-contrast', label: '고대비 모드' },
    ].map((option) => buildThemeRadioOptionMarkup({
      ...option,
      checked: option.value === themeMode,
    })).join('');

    return `
      <form class="settings-form">
        <div class="section-toggle-row">
          <h3 id="settings-controls-title">설정</h3>
          <button
            type="button"
            id="settings-toggle-button"
            class="section-toggle-button"
            aria-controls="settings-collapsible-content"
            aria-expanded="false"
          >설정 펼치기</button>
        </div>

        <div id="settings-collapsible-content" class="collapsible-content" hidden>
          <div class="settings-sections">
            <section class="settings-group-panel" aria-labelledby="engine-settings-title">
              <div class="settings-group-panel-header">
                <h4 id="engine-settings-title" class="settings-group-panel-title">엔진 설정</h4>
                <p id="settings-help-text" class="subtle-text settings-group-panel-description">
                  난이도와 스타일은 즉시 반영됩니다. 다만 “사용자 지정” 난이도에서는 아래 입력값이 우선하며 스타일 프리셋은 잠시 비활성화됩니다.
                </p>
              </div>

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
              </fieldset>

              <fieldset id="style-preset-fieldset">
                <legend>엔진 스타일 / 성격</legend>
                <div class="field-row">
                  <label for="style-select">스타일 프리셋</label>
                  <select id="style-select" name="styleKey">
                    ${styleOptions}
                  </select>
                </div>
                <p id="style-state-note" class="subtle-text"></p>
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
                <legend>특정 포지션에서 시작</legend>
                <p id="position-sequence-help" class="subtle-text">
                  예: C4 C3 D6 C5 또는 c4c3d6c5. 쉼표와 줄바꿈도 사용할 수 있으며, 강제 패스는 생략해도 됩니다. 정말 필요한 경우에만 pass 또는 패스를 넣어도 됩니다.
                </p>
                <div class="sequence-import-grid" data-ignore-settings-change="true">
                  <label for="position-sequence-input">수순 입력</label>
                  <textarea
                    id="position-sequence-input"
                    class="sequence-input"
                    rows="4"
                    spellcheck="false"
                    autocomplete="off"
                    autocapitalize="characters"
                    aria-describedby="position-sequence-help"
                    data-ignore-settings-change="true"
                  ></textarea>
                </div>
                <div class="sequence-actions button-stack" data-ignore-settings-change="true">
                  <button type="button" id="start-from-sequence-button" data-ignore-settings-change="true">입력된 수순에서 시작하기</button>
                </div>
              </fieldset>
            </section>

            <section class="settings-group-panel" aria-labelledby="accessibility-settings-title">
              <div class="settings-group-panel-header">
                <h4 id="accessibility-settings-title" class="settings-group-panel-title">접근성 설정</h4>
                <p class="subtle-text settings-group-panel-description">
                  보드 탐색 보조와 화면 테마를 바로 바꿀 수 있습니다. 다크 모드와 고대비 모드는 한 번에 하나만 선택됩니다.
                </p>
              </div>

              <fieldset>
                <legend>시각 보조</legend>
                <div class="checkbox-row">
                  <label><input type="checkbox" name="showLegalHints" ${initialSettings.showLegalHints ? 'checked' : ''}> 합법 수 시각 표시</label>
                </div>
              </fieldset>

              <fieldset>
                <legend>보드 접근성 단축키</legend>
                <div class="checkbox-row">
                  <label><input type="checkbox" name="enableBoardShortcuts" ${initialSettings.enableBoardShortcuts !== false ? 'checked' : ''}> 보드 접근성 단축키 사용(S, L, M, Shift+M, I)</label>
                </div>
                <p class="subtle-text">보드 안에서만 동작하며, 현재 돌 개수 읽기, 마지막 수 읽기, 다음 또는 이전 합법 수로 초점 이동, 좌표 직접 입력 대화상자를 제공합니다.</p>
              </fieldset>

              <fieldset>
                <legend>테마</legend>
                <div class="radio-row">
                  ${themeOptionsMarkup}
                </div>
                <p class="subtle-text">시스템 설정 따르기를 선택하면 운영체제의 밝은 모드 또는 다크 모드 선호를 그대로 사용합니다.</p>
              </fieldset>
            </section>
          </div>
        </div>

        <div class="button-stack">
          <button type="button" id="new-game-button">새 게임 시작하기</button>
          <button type="button" id="xot-game-button">XOT 모드로 새 게임 시작</button>
          <button type="button" id="undo-button">직전 사람 차례로 무르기</button>
          <button type="button" id="read-status-button">현재 상태 다시 읽기</button>
          <button type="button" id="copy-move-sequence-button">현재 수순 좌표 기보 복사</button>
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
      presetKey: formData.get('presetKey') || 'normal',
      styleKey: this.styleSelect?.value || 'balanced',
      showLegalHints: this.form.querySelector('[name="showLegalHints"]').checked,
      enableBoardShortcuts: this.form.querySelector('[name="enableBoardShortcuts"]').checked,
      themeMode: normalizeThemeMode(formData.get('themeMode')),
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
      ? '사용자 지정 프리셋이 켜져 있습니다. 아래 입력값이 그대로 엔진에 적용됩니다.'
      : '현재는 사용자 지정이 꺼져 있습니다. 아래 입력값은 잠시 보관만 되며 엔진에는 적용되지 않습니다.';

    this.styleFieldset.disabled = isCustom;
    this.styleSelect.disabled = isCustom;
    this.styleStateNote.textContent = isCustom
      ? '난이도가 “사용자 지정”이면 사용자 지정 수치가 우선하므로 스타일 프리셋은 비활성화됩니다. 선택값은 보관되며 다른 난이도로 바꾸면 다시 적용됩니다.'
      : '선택한 스타일 프리셋은 현재 난이도 설정 위에 추가 성향 보정을 적용합니다.';
  }

  syncSettingsSectionVisibility() {
    this.settingsContent.hidden = !this.settingsExpanded;
    this.settingsToggleButton.setAttribute('aria-expanded', String(this.settingsExpanded));
    this.settingsToggleButton.textContent = this.settingsExpanded ? '설정 접기' : '설정 펼치기';
  }

  setResolvedOptionsSummary(text) {
    this.engineSummaryOutput.textContent = text;
  }

  setPositionSequenceValue(text) {
    if (this.positionSequenceInput) {
      this.positionSequenceInput.value = text;
    }
  }

  setUndoEnabled(enabled) {
    this.undoButton.disabled = !enabled;
  }

  setCopySequenceEnabled(enabled) {
    this.copyMoveSequenceButton.disabled = !enabled;
  }
}
