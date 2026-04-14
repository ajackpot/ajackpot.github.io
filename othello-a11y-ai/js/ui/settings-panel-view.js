import {
  createDefaultCustomDifficultyInputs,
  createDefaultCustomStyleInputs,
  CUSTOM_DIFFICULTY_CLASSIC_ONLY_FIELDS,
  CUSTOM_DIFFICULTY_COMMON_FIELDS,
  CUSTOM_DIFFICULTY_FIELDS,
  CUSTOM_DIFFICULTY_MCTS_FIELDS,
  CUSTOM_DIFFICULTY_MCTS_GUIDED_HYBRID_FIELDS,
  CUSTOM_DIFFICULTY_MCTS_HYBRID_ONLY_FIELDS,
  CUSTOM_STYLE_FIELDS,
  CUSTOM_STYLE_KEY,
  CUSTOM_STYLE_OPTION,
  ENGINE_PRESETS,
  ENGINE_STYLE_PRESETS,
  getCustomDifficultyDefaultsForSearchAlgorithm,
  mergeCustomInputGroups,
  splitCustomInputGroups,
} from '../ai/presets.js';
import {
  DEFAULT_SEARCH_ALGORITHM,
  listSearchAlgorithmEntries,
  normalizeSearchAlgorithmForPreset,
} from '../ai/search-algorithms.js';
import {
  buildDifficultyStateNote,
  buildSearchAlgorithmNoteText,
  buildStyleStateNote,
  getDifficultyDialogModeNote,
  getDifficultyDialogVisibilityMap,
  getStyleDialogModeNote,
} from './settings-search-algorithm-presentations.js';
import { closeDialog, focusFirstEnabledDialogControl, openDialog } from './dialog-utils.js';
import { escapeHtml } from './formatters.js';

const DIFFICULTY_DIALOG_GROUPS = Object.freeze([
  {
    key: 'common',
    title: '공통 난이도 항목',
    description: '모든 탐색 계열에서 공통으로 쓰는 시간, 끝내기, 무작위성, 전이표 관련 설정입니다.',
    fields: CUSTOM_DIFFICULTY_COMMON_FIELDS,
  },
  {
    key: 'classic',
    title: '클래식 전용 항목',
    description: 'iterative deepening + alpha-beta / PVS 계열에서만 의미가 있는 설정입니다.',
    fields: CUSTOM_DIFFICULTY_CLASSIC_ONLY_FIELDS,
  },
  {
    key: 'mcts',
    title: 'MCTS 기본 항목',
    description: 'MCTS 계열 공통의 탐험, 반복 수, 트리 크기 제한입니다.',
    fields: CUSTOM_DIFFICULTY_MCTS_FIELDS,
  },
  {
    key: 'guided',
    title: 'Guided / Hybrid 보강 항목',
    description: 'proof-priority를 포함한 guided 계열 전용 보강 설정입니다.',
    fields: CUSTOM_DIFFICULTY_MCTS_GUIDED_HYBRID_FIELDS,
  },
  {
    key: 'hybrid',
    title: 'Hybrid 전용 항목',
    description: 'shallow minimax prior 깊이와 후보 수를 조절합니다.',
    fields: CUSTOM_DIFFICULTY_MCTS_HYBRID_ONLY_FIELDS,
  },
]);

function buildFieldControlMarkup(field, value, { idPrefix = '', describedById = '' } = {}) {
  const controlId = `${idPrefix}${field.key}`;
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

function buildFieldMarkup(field, value, { idPrefix = '' } = {}) {
  const helpTextId = field.helpText ? `${idPrefix}${field.key}-help` : '';
  const helpTextMarkup = field.helpText
    ? `<p id="${helpTextId}" class="subtle-text">${escapeHtml(field.helpText)}</p>`
    : '';
  return `
    <div class="field-row">
      <label for="${idPrefix}${field.key}">${escapeHtml(field.label)}</label>
      ${buildFieldControlMarkup(field, value, { idPrefix, describedById: helpTextId })}
      ${helpTextMarkup}
    </div>
  `;
}

function buildFieldGroupMarkup({ group, values, idPrefix = '' }) {
  const fieldMarkup = group.fields.map((field) => buildFieldMarkup(field, values[field.key], { idPrefix })).join('');
  return `
    <fieldset data-difficulty-group="${group.key}">
      <legend>${escapeHtml(group.title)}</legend>
      <p class="subtle-text">${escapeHtml(group.description)}</p>
      <div class="dialog-field-grid">
        ${fieldMarkup}
      </div>
    </fieldset>
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
    onReadSettings,
    onStartFromSequence,
    onCopyMoveSequence,
    onSaveSettingsCookie,
    onResetSettingsCookie,
  }) {
    this.container = container;
    this.onSettingsChange = onSettingsChange;
    this.onNewGame = onNewGame;
    this.onNewXotGame = onNewXotGame;
    this.onUndo = onUndo;
    this.onReadStatus = onReadStatus;
    this.onReadSettings = onReadSettings;
    this.onStartFromSequence = onStartFromSequence;
    this.onCopyMoveSequence = onCopyMoveSequence;
    this.onSaveSettingsCookie = onSaveSettingsCookie;
    this.onResetSettingsCookie = onResetSettingsCookie;
    this.settingsExpanded = false;
    this.dialogReturnFocusMap = new WeakMap();

    const splitInputs = splitCustomInputGroups(initialSettings.customInputs);
    this.customDifficultyInputs = {
      ...createDefaultCustomDifficultyInputs(),
      ...splitInputs.customDifficultyInputs,
      ...((initialSettings.customDifficultyInputs && typeof initialSettings.customDifficultyInputs === 'object')
        ? initialSettings.customDifficultyInputs
        : {}),
    };
    this.customStyleInputs = {
      ...createDefaultCustomStyleInputs(),
      ...splitInputs.customStyleInputs,
      ...((initialSettings.customStyleInputs && typeof initialSettings.customStyleInputs === 'object')
        ? initialSettings.customStyleInputs
        : {}),
    };

    this.container.innerHTML = this.buildMarkup(initialSettings);
    this.form = this.container.querySelector('form.settings-form');
    this.presetSelect = this.container.querySelector('#preset-select');
    this.styleSelect = this.container.querySelector('#style-select');
    this.searchAlgorithmSelect = this.container.querySelector('#search-algorithm-select');
    this.searchAlgorithmNote = this.container.querySelector('#search-algorithm-note');
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
    this.customDifficultyButton = this.container.querySelector('#difficulty-detail-button');
    this.customStyleButton = this.container.querySelector('#style-detail-button');
    this.difficultyDialog = this.container.querySelector('#difficulty-detail-dialog');
    this.difficultyDialogForm = this.container.querySelector('#difficulty-detail-dialog-form');
    this.difficultyDialogModeNote = this.container.querySelector('#difficulty-detail-mode-note');
    this.difficultyDialogCancelButton = this.container.querySelector('#difficulty-detail-cancel-button');
    this.styleDialog = this.container.querySelector('#style-detail-dialog');
    this.styleDialogForm = this.container.querySelector('#style-detail-dialog-form');
    this.styleDialogModeNote = this.container.querySelector('#style-detail-mode-note');
    this.styleDialogCancelButton = this.container.querySelector('#style-detail-cancel-button');
    this.saveSettingsCookieButton = this.container.querySelector('#save-settings-cookie-button');
    this.resetSettingsCookieButton = this.container.querySelector('#reset-settings-cookie-button');

    this.handleSettingsFormMutation = this.handleSettingsFormMutation.bind(this);

    this.form.addEventListener('input', this.handleSettingsFormMutation);
    this.form.addEventListener('change', this.handleSettingsFormMutation);

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

    this.container.querySelector('#read-settings-button').addEventListener('click', () => {
      this.onReadSettings?.();
    });

    this.saveSettingsCookieButton?.addEventListener('click', () => {
      this.onSaveSettingsCookie?.();
    });

    this.resetSettingsCookieButton?.addEventListener('click', () => {
      this.onResetSettingsCookie?.();
    });

    this.customDifficultyButton?.addEventListener('click', () => {
      this.handleOpenDifficultyDialog();
    });

    this.customStyleButton?.addEventListener('click', () => {
      this.handleOpenStyleDialog();
    });

    this.difficultyDialogForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.applyDifficultyDialogValues();
    });

    this.styleDialogForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.applyStyleDialogValues();
    });

    this.difficultyDialogCancelButton?.addEventListener('click', () => {
      this.closeSettingsDialog(this.difficultyDialog);
    });

    this.styleDialogCancelButton?.addEventListener('click', () => {
      this.closeSettingsDialog(this.styleDialog);
    });

    this.setupDialogFocusRestoration(this.difficultyDialog);
    this.setupDialogFocusRestoration(this.styleDialog);

    this.syncSearchAlgorithmAvailability();
    this.syncCustomDetailControls();
    this.syncSettingsSectionVisibility();
  }

  buildMarkup(initialSettings) {
    const themeMode = normalizeThemeMode(initialSettings.themeMode);
    const presetOptions = Object.entries(ENGINE_PRESETS).map(([key, preset]) => `
      <option value="${key}" ${initialSettings.presetKey === key ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
    `).join('');

    const styleOptionEntries = [
      ...Object.entries(ENGINE_STYLE_PRESETS),
      [CUSTOM_STYLE_KEY, CUSTOM_STYLE_OPTION],
    ];
    const styleOptions = styleOptionEntries.map(([key, preset]) => `
      <option value="${key}" ${initialSettings.styleKey === key ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
    `).join('');

    const normalizedSearchAlgorithm = normalizeSearchAlgorithmForPreset(
      initialSettings.searchAlgorithm,
      initialSettings.presetKey,
    );
    const searchAlgorithmOptions = listSearchAlgorithmEntries(initialSettings.presetKey).map((entry) => `
      <option value="${escapeHtml(entry.key)}" ${normalizedSearchAlgorithm === entry.key ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
    `).join('');

    const themeOptionsMarkup = [
      { value: 'system', label: '시스템 설정 따르기' },
      { value: 'dark', label: '다크 모드' },
      { value: 'high-contrast', label: '고대비 모드' },
    ].map((option) => buildThemeRadioOptionMarkup({
      ...option,
      checked: option.value === themeMode,
    })).join('');

    const difficultyDefaults = getCustomDifficultyDefaultsForSearchAlgorithm(
      normalizedSearchAlgorithm,
      this.customDifficultyInputs,
    );
    const difficultyValues = {
      ...difficultyDefaults,
      ...this.customDifficultyInputs,
    };
    const difficultyGroupMarkup = DIFFICULTY_DIALOG_GROUPS.map((group) => buildFieldGroupMarkup({
      group,
      values: difficultyValues,
      idPrefix: 'difficulty-detail-',
    })).join('');

    const styleValues = {
      ...createDefaultCustomStyleInputs(),
      ...this.customStyleInputs,
    };
    const styleFieldMarkup = CUSTOM_STYLE_FIELDS.map((field) => buildFieldMarkup(field, styleValues[field.key], {
      idPrefix: 'style-detail-',
    })).join('');

    return `
      <div class="settings-form-shell">
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
                    난이도와 스타일은 즉시 반영됩니다. 다만 화면 읽기 낭독은 자동으로 다시 읽지 않으며, 필요하면 아래의 “현재 설정 값 다시 읽기” 버튼을 사용할 수 있습니다. 난이도 프리셋에서 “사용자 지정”을 고르면 난이도 상세 설정 버튼이, 스타일에서 “사용자 지정”을 고르면 스타일 상세 설정 버튼이 활성화됩니다.
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
                  <legend>AI 모드</legend>
                  <div class="field-row">
                    <label for="search-algorithm-select">탐색 계열</label>
                    <select id="search-algorithm-select" name="searchAlgorithm">
                      ${searchAlgorithmOptions}
                    </select>
                  </div>
                  <p id="search-algorithm-note" class="subtle-text">${escapeHtml(buildSearchAlgorithmNoteText(normalizedSearchAlgorithm, initialSettings.presetKey))}</p>
                </fieldset>

                <fieldset>
                  <legend>엔진 난이도</legend>
                  <div class="field-row">
                    <label for="preset-select">난이도 프리셋</label>
                    <select id="preset-select" name="presetKey">
                      ${presetOptions}
                    </select>
                  </div>
                  <div class="detail-button-row">
                    <button
                      type="button"
                      id="difficulty-detail-button"
                      data-ignore-settings-change="true"
                    >난이도 상세 설정</button>
                  </div>
                  <p id="custom-state-note" class="subtle-text">${escapeHtml(buildDifficultyStateNote({
                    isCustomDifficulty: initialSettings.presetKey === 'custom',
                    searchAlgorithm: normalizedSearchAlgorithm,
                  }))}</p>
                </fieldset>

                <fieldset id="style-preset-fieldset">
                  <legend>엔진 스타일 / 성격</legend>
                  <div class="field-row">
                    <label for="style-select">스타일 프리셋</label>
                    <select id="style-select" name="styleKey">
                      ${styleOptions}
                    </select>
                  </div>
                  <div class="detail-button-row">
                    <button
                      type="button"
                      id="style-detail-button"
                      data-ignore-settings-change="true"
                    >스타일 상세 설정</button>
                  </div>
                  <p id="style-state-note" class="subtle-text">${escapeHtml(buildStyleStateNote({
                    isCustomStyle: initialSettings.styleKey === CUSTOM_STYLE_KEY,
                    searchAlgorithm: normalizedSearchAlgorithm,
                  }))}</p>
                  <p id="engine-summary-output" class="subtle-text"></p>
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

              <section class="settings-group-panel" aria-labelledby="settings-storage-title">
                <div class="settings-group-panel-header">
                  <h4 id="settings-storage-title" class="settings-group-panel-title">설정 저장</h4>
                  <p class="subtle-text settings-group-panel-description">
                    현재 보이는 설정 값을 쿠키에 저장하면 다음에 이 페이지를 열 때 자동으로 불러옵니다. 쿠키를 초기화하면 현재 페이지의 값은 그대로 두고, 다음에 열 때부터 기본 설정으로 시작합니다.
                  </p>
                </div>

                <fieldset data-ignore-settings-change="true">
                  <legend>설정 쿠키</legend>
                  <div class="button-stack" data-ignore-settings-change="true">
                    <button type="button" id="save-settings-cookie-button" data-ignore-settings-change="true">현재 설정 쿠키에 저장하기</button>
                    <button type="button" id="reset-settings-cookie-button" data-ignore-settings-change="true">설정 쿠키 초기화</button>
                  </div>
                </fieldset>
              </section>
            </div>
          </div>

          <div class="button-stack">
            <button type="button" id="new-game-button">새 게임 시작하기</button>
            <button type="button" id="xot-game-button">XOT 모드로 새 게임 시작</button>
            <button type="button" id="undo-button">직전 사람 차례로 무르기</button>
            <button type="button" id="read-status-button">현재 상태 다시 읽기</button>
            <button type="button" id="read-settings-button">현재 설정 값 다시 읽기</button>
            <button type="button" id="copy-move-sequence-button">현재 수순 좌표 기보 복사</button>
          </div>
        </form>

        <dialog id="difficulty-detail-dialog" class="settings-detail-dialog" aria-labelledby="difficulty-detail-dialog-title">
          <form id="difficulty-detail-dialog-form" class="settings-detail-dialog-form" method="dialog" novalidate>
            <h2 id="difficulty-detail-dialog-title">난이도 상세 설정</h2>
            <p id="difficulty-detail-dialog-help" class="subtle-text">
              현재 선택한 탐색 계열에 맞는 사용자 지정 난이도 수치를 조절합니다. 숨겨진 항목의 값은 지워지지 않고 보관됩니다.
            </p>
            <p id="difficulty-detail-mode-note" class="subtle-text"></p>
            ${difficultyGroupMarkup}
            <div class="dialog-button-row">
              <button type="submit" id="difficulty-detail-save-button">적용</button>
              <button type="button" id="difficulty-detail-cancel-button">취소</button>
            </div>
          </form>
        </dialog>

        <dialog id="style-detail-dialog" class="settings-detail-dialog" aria-labelledby="style-detail-dialog-title">
          <form id="style-detail-dialog-form" class="settings-detail-dialog-form" method="dialog" novalidate>
            <h2 id="style-detail-dialog-title">스타일 상세 설정</h2>
            <p id="style-detail-dialog-help" class="subtle-text">
              기동성부터 위험 칸 패널티까지의 평가 가중치 배율을 직접 조절합니다. 값은 1.00이 기본이며, 1보다 크면 비중이 커지고 1보다 작으면 비중이 줄어듭니다.
            </p>
            <p id="style-detail-mode-note" class="subtle-text"></p>
            <fieldset>
              <legend>평가 가중치 배율</legend>
              <div class="dialog-field-grid">
                ${styleFieldMarkup}
              </div>
            </fieldset>
            <div class="dialog-button-row">
              <button type="submit" id="style-detail-save-button">적용</button>
              <button type="button" id="style-detail-cancel-button">취소</button>
            </div>
          </form>
        </dialog>
      </div>
    `;
  }

  setupDialogFocusRestoration(dialog) {
    dialog?.addEventListener('close', () => {
      const returnFocusElement = this.dialogReturnFocusMap.get(dialog);
      this.dialogReturnFocusMap.delete(dialog);
      if (returnFocusElement instanceof HTMLElement) {
        window.requestAnimationFrame(() => {
          returnFocusElement.focus();
        });
      }
    });
  }

  openSettingsDialog(dialog, triggerButton) {
    if (!dialog || !triggerButton) {
      return;
    }

    this.dialogReturnFocusMap.set(dialog, triggerButton);
    openDialog(dialog);
    window.requestAnimationFrame(() => {
      focusFirstEnabledDialogControl(dialog);
    });
  }

  closeSettingsDialog(dialog) {
    closeDialog(dialog);
  }

  getCurrentSearchAlgorithm() {
    return normalizeSearchAlgorithmForPreset(
      this.searchAlgorithmSelect?.value || DEFAULT_SEARCH_ALGORITHM,
      this.presetSelect?.value || 'normal',
    );
  }

  readSettings() {
    const formData = new FormData(this.form);
    const customDifficultyInputs = { ...this.customDifficultyInputs };
    const customStyleInputs = { ...this.customStyleInputs };

    return {
      humanColor: formData.get('humanColor') === 'white' ? 'white' : 'black',
      presetKey: formData.get('presetKey') || 'normal',
      styleKey: this.styleSelect?.value || 'balanced',
      searchAlgorithm: this.getCurrentSearchAlgorithm(),
      showLegalHints: this.form.querySelector('[name="showLegalHints"]').checked,
      enableBoardShortcuts: this.form.querySelector('[name="enableBoardShortcuts"]').checked,
      themeMode: normalizeThemeMode(formData.get('themeMode')),
      customDifficultyInputs,
      customStyleInputs,
      customInputs: mergeCustomInputGroups(customDifficultyInputs, customStyleInputs),
    };
  }

  handleSettingsFormMutation(event) {
    if (event.target?.closest('[data-ignore-settings-change="true"]')) {
      return;
    }

    this.syncSearchAlgorithmAvailability();
    this.syncCustomDetailControls();
    this.onSettingsChange(this.readSettings());
  }

  syncCustomDetailControls() {
    const searchAlgorithm = this.getCurrentSearchAlgorithm();
    const isCustomDifficulty = this.presetSelect?.value === 'custom';
    const isCustomStyle = this.styleSelect?.value === CUSTOM_STYLE_KEY;

    if (this.customDifficultyButton) {
      this.customDifficultyButton.disabled = !isCustomDifficulty;
    }
    if (this.customStyleButton) {
      this.customStyleButton.disabled = !isCustomStyle;
    }
    if (this.customStateNote) {
      this.customStateNote.textContent = buildDifficultyStateNote({
        isCustomDifficulty,
        searchAlgorithm,
      });
    }
    if (this.styleStateNote) {
      this.styleStateNote.textContent = buildStyleStateNote({
        isCustomStyle,
        searchAlgorithm,
      });
    }

    this.syncDifficultyDialogPresentation();
    this.syncStyleDialogPresentation();
  }

  syncSearchAlgorithmAvailability() {
    if (!this.searchAlgorithmSelect || !this.presetSelect) {
      return;
    }

    const presetKey = this.presetSelect.value || 'normal';
    const currentValue = this.searchAlgorithmSelect.value;
    const normalizedValue = normalizeSearchAlgorithmForPreset(currentValue, presetKey);
    const optionMarkup = listSearchAlgorithmEntries(presetKey).map((entry) => `
      <option value="${escapeHtml(entry.key)}" ${normalizedValue === entry.key ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
    `).join('');

    this.searchAlgorithmSelect.innerHTML = optionMarkup;
    this.searchAlgorithmSelect.value = normalizedValue;
    this.syncSearchAlgorithmDescription();
    this.syncDifficultyDialogFieldValues();
    this.syncDifficultyDialogPresentation();
    this.syncStyleDialogPresentation();
  }

  syncSearchAlgorithmDescription() {
    if (!this.searchAlgorithmNote || !this.searchAlgorithmSelect || !this.presetSelect) {
      return;
    }

    this.searchAlgorithmNote.textContent = buildSearchAlgorithmNoteText(
      this.getCurrentSearchAlgorithm(),
      this.presetSelect.value || 'normal',
    );
  }

  syncDifficultyDialogFieldValues() {
    if (!this.difficultyDialogForm) {
      return;
    }

    const searchAlgorithm = this.getCurrentSearchAlgorithm();
    const defaults = getCustomDifficultyDefaultsForSearchAlgorithm(searchAlgorithm, this.customDifficultyInputs);
    const values = {
      ...defaults,
      ...this.customDifficultyInputs,
    };

    for (const field of CUSTOM_DIFFICULTY_FIELDS) {
      const control = this.difficultyDialogForm.querySelector(`[name="${field.key}"]`);
      if (control) {
        control.value = String(values[field.key] ?? defaults[field.key] ?? '');
      }
    }
  }

  syncDifficultyDialogPresentation() {
    if (!this.difficultyDialog || !this.difficultyDialogModeNote) {
      return;
    }

    const searchAlgorithm = this.getCurrentSearchAlgorithm();
    const visibilityByGroup = getDifficultyDialogVisibilityMap(searchAlgorithm);
    this.difficultyDialogModeNote.textContent = getDifficultyDialogModeNote(searchAlgorithm);

    for (const group of DIFFICULTY_DIALOG_GROUPS) {
      const fieldset = this.difficultyDialog.querySelector(`[data-difficulty-group="${group.key}"]`);
      if (!fieldset) {
        continue;
      }
      const visible = visibilityByGroup[group.key] === true;
      fieldset.hidden = !visible;
      for (const control of fieldset.querySelectorAll('input, select')) {
        control.disabled = !visible;
      }
    }
  }

  syncStyleDialogFieldValues() {
    if (!this.styleDialogForm) {
      return;
    }

    const values = {
      ...createDefaultCustomStyleInputs(),
      ...this.customStyleInputs,
    };

    for (const field of CUSTOM_STYLE_FIELDS) {
      const control = this.styleDialogForm.querySelector(`[name="${field.key}"]`);
      if (control) {
        control.value = String(values[field.key] ?? 1);
      }
    }
  }

  syncStyleDialogPresentation() {
    if (!this.styleDialogModeNote) {
      return;
    }

    const searchAlgorithm = this.getCurrentSearchAlgorithm();
    this.styleDialogModeNote.textContent = getStyleDialogModeNote(searchAlgorithm);
  }

  handleOpenDifficultyDialog() {
    if (this.customDifficultyButton?.disabled) {
      return;
    }

    this.syncDifficultyDialogFieldValues();
    this.syncDifficultyDialogPresentation();
    this.openSettingsDialog(this.difficultyDialog, this.customDifficultyButton);
  }

  handleOpenStyleDialog() {
    if (this.customStyleButton?.disabled) {
      return;
    }

    this.syncStyleDialogFieldValues();
    this.syncStyleDialogPresentation();
    this.openSettingsDialog(this.styleDialog, this.customStyleButton);
  }

  applyDifficultyDialogValues() {
    if (!this.difficultyDialogForm) {
      return;
    }

    const nextInputs = { ...this.customDifficultyInputs };
    const searchAlgorithm = this.getCurrentSearchAlgorithm();
    const activeFields = getCustomDifficultyDefaultsForSearchAlgorithm(searchAlgorithm, this.customDifficultyInputs);

    for (const field of CUSTOM_DIFFICULTY_FIELDS) {
      const control = this.difficultyDialogForm.querySelector(`[name="${field.key}"]`);
      if (!control) {
        continue;
      }
      if (Object.hasOwn(activeFields, field.key)) {
        nextInputs[field.key] = control.value;
      }
    }

    this.customDifficultyInputs = nextInputs;
    this.closeSettingsDialog(this.difficultyDialog);
    this.onSettingsChange(this.readSettings());
  }

  applyStyleDialogValues() {
    if (!this.styleDialogForm) {
      return;
    }

    const nextInputs = { ...this.customStyleInputs };
    for (const field of CUSTOM_STYLE_FIELDS) {
      const control = this.styleDialogForm.querySelector(`[name="${field.key}"]`);
      if (control) {
        nextInputs[field.key] = control.value;
      }
    }

    this.customStyleInputs = nextInputs;
    this.closeSettingsDialog(this.styleDialog);
    this.onSettingsChange(this.readSettings());
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
