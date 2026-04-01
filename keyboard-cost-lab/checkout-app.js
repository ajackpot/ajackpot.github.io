import { checkoutScenario } from './data/checkout-scenario.js';
import { checkoutTasks } from './data/tasks-checkout.js';
import { benchmarkResultsCheckout } from './data/benchmark-results-checkout.js';
import { createTaskLogger } from './lib/logger.js';
import {
  uniqueId,
  formatSeconds,
  escapeHtml,
  deepClone,
  getDefaultConditionOrder,
  renderRunnerFooterHtml,
  renderRunnerCompletionDialogHtml,
} from './lib/utils.js';
import {
  createMessageBridge as createSharedMessageBridge,
  postBridgeMessage as postSharedBridgeMessage,
  getOrCreateSessionId as getSharedSessionId,
  buildLaunchStorageKey as buildSharedLaunchStorageKey,
  saveLaunchSnapshot as saveSharedLaunchSnapshot,
  readLaunchSnapshot as readSharedLaunchSnapshot,
  clearLaunchSnapshot as clearSharedLaunchSnapshot,
  buildRunnerUrl as buildSharedRunnerUrl,
  closeRunnerWindow as closeSharedRunnerWindow,
  trapFocusInDialog as trapSharedFocusInDialog,
  getAppMode,
} from './lib/experiment-bridge.js';
import { commonMeasurementRules } from './data/measurement-rules.js';
import {
  renderLanguageGuideCard as renderSharedLanguageGuideCard,
  renderProfileBenchmarkTable as renderSharedProfileBenchmarkTable,
  renderLaunchStatusMessage as renderSharedLaunchStatusMessage,
  renderFinalConditionCard as renderSharedFinalConditionCard,
  aggregateBenchmarkCondition as aggregateSharedBenchmarkCondition,
  buildExportPayload as buildSharedExportPayload,
  buildExportDataUrl as buildSharedExportDataUrl,
  buildSurveyUrl as buildSharedSurveyUrl,
  formatSigned as formatSharedSigned,
  aggregateMetrics,
} from './lib/service-shell.js';
import { renderStudyServiceCompletionCard, saveCompletedServiceRecord } from './lib/study-session.js';

const APP_MODE = getAppMode();
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-study-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-checkout-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-checkout-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-checkout-channel-fallback';
const SURVEY_CONFIG = {
  baseUrl: '',
};

const MEASUREMENT_RULES = commonMeasurementRules;

const VARIANT_META = {
  variantA: {
    shortLabel: 'A',
    title: '비교안 A · 조작 부담이 큰 구조',
    subtitle: '상단 보조 링크와 길게 이어진 신청 단계들을 차례로 지나야 하고, 각 항목의 현재 선택·최근 확인·설명 보기·값 선택 버튼이 흩어져 있으며, 설명 대화상자를 닫으면 신청 단계 제목 근처부터 다시 찾아야 하는 구조',
    improvements: [
      '상단 보조 링크와 여러 신청 단계 안내를 차례로 지나야 원하는 항목에 도달합니다.',
      '각 항목마다 현재 선택, 최근 확인, 설명 보기, 값 선택 버튼이 따로 나뉘어 있어 순차 이동이 길어집니다.',
      '설명 대화상자를 닫으면 방금 보던 항목 대신 신청 단계 제목 근처로 돌아와 다시 위치를 찾아야 합니다.',
    ],
  },
  variantB: {
    shortLabel: 'B',
    title: '비교안 B · 개선 구조',
    subtitle: '신청 단계로 바로 이동하고, 단계 묶음을 한 번 선택한 뒤 같은 묶음 안에서 필요한 신청 항목을 바꾸며, 설명 대화상자를 닫으면 방금 누른 설명 보기 버튼으로 돌아오는 구조',
    improvements: [
      '신청 단계로 바로 이동해 첫 진입 부담을 줄입니다.',
      '신청 단계 묶음은 한 번만 들어간 뒤 방향키로 고를 수 있어 관련 없는 단계를 길게 지나지 않습니다.',
      '설명 대화상자를 닫으면 같은 설명 보기 버튼으로 초점이 돌아와 다음 선택과 제출을 이어서 수행하기 쉽습니다.',
    ],
  },
};

const RUNNER_LABELS = {
  quickJump: '신청 단계로 바로 이동',
  footerJump: '신청 단계로 이동',
};

const GLOSSARY_ENTRIES = [
  {
    term: '비교안 A/B',
    description: '같은 신청 과업을 두 가지 다른 화면 구조로 비교하기 위한 화면입니다. 신청 내용은 같고 이동 방식만 다릅니다.',
  },
  {
    term: '사전 계산 기준',
    description: '실제 실험 전에 미리 계산해 둔 예상 조작 부담 값입니다. 실제 기록과 나란히 비교합니다.',
  },
  {
    term: '신청 단계',
    description: '신청 정보, 안내 수신, 결제 수단, 제출 확인처럼 비슷한 항목을 한곳에 모은 영역입니다.',
  },
  {
    term: '대화상자',
    description: '신청 항목 설명을 확인할 때 잠깐 열리는 작은 창입니다.',
  },
  {
    term: '간편 결제',
    description: '저장된 결제 수단을 이용해 짧은 확인 뒤 바로 결제하는 방식입니다.',
  },
];

const root = document.querySelector('#app');
if (!root) {
  throw new Error('#app root not found');
}

const state = APP_MODE === 'runner' ? createRunnerState() : createMainState();
const bridge = createMessageBridge(state.sessionId);
wireEvents();
if (APP_MODE === 'runner') {
  postBridgeMessage({
    type: 'runner-ready',
    sessionId: state.sessionId,
    launchId: state.launchId,
    conditionId: state.conditionId,
    taskIndex: state.taskIndex,
  });
}
render();

function createMessageBridge(sessionId) {
  return createSharedMessageBridge({
    sessionId,
    channelPrefix: CHANNEL_PREFIX,
    fallbackStoragePrefix: CHANNEL_FALLBACK_STORAGE_PREFIX,
    onMessage: handleBridgeMessage,
  });
}

function postBridgeMessage(message) {
  postSharedBridgeMessage(bridge, message);
}

function handleBridgeMessage(message) {
  if (!message || message.sessionId !== state.sessionId) return;
  if (APP_MODE === 'runner') return;
  const activeLaunch = state.activeLaunch;
  if (!activeLaunch) return;
  if (message.launchId && message.launchId !== activeLaunch.launchId) return;

  if (message.type === 'runner-ready') {
    state.activeLaunch.status = 'ready';
    state.activeLaunch.lastMessage = '수행 탭이 열렸습니다. 이 창에 과업 안내가 그대로 남아 있습니다.';
    render();
    return;
  }

  if (message.type === 'runner-started') {
    state.activeLaunch.status = 'started';
    state.activeLaunch.lastMessage = '수행 탭에서 첫 조작이 들어가 실제 계측이 시작되었습니다.';
    render();
    return;
  }

  if (message.type === 'task-complete') {
    acceptRunnerTaskCompletion(message);
    return;
  }

  if (message.type === 'runner-closed') {
    if (state.activeLaunch?.status !== 'completed') {
      state.activeLaunch.status = 'closed';
      state.activeLaunch.lastMessage = '수행 탭이 닫혔습니다. 필요하면 새 탭을 다시 열 수 있습니다.';
      render();
    }
  }
}

function createMainState() {
  const sessionId = getOrCreateSessionId();
  const order = getDefaultConditionOrder();
  return {
    sessionId,
    order,
    currentConditionIndex: 0,
    currentTaskIndex: 0,
    view: 'serviceIntro',
    benchmarkProfileFocus: 'keyboard',
    focusRequest: null,
    activeLaunch: null,
    runs: {
      variantA: createConditionRuntime('variantA'),
      variantB: createConditionRuntime('variantB'),
    },
  };
}

function createRunnerState() {
  const params = new URL(window.location.href).searchParams;
  const sessionId = params.get('sessionId') || getOrCreateSessionId();
  const conditionId = params.get('condition') || 'variantA';
  const taskIndex = Number.parseInt(params.get('taskIndex') || '0', 10);
  const launchId = params.get('launchId') || '';
  const launchPayload = launchId ? readLaunchSnapshot(launchId) : null;

  if (!launchPayload) {
    return {
      sessionId,
      conditionId,
      taskIndex,
      launchId,
      focusRequest: null,
      completed: false,
      run: createConditionRuntime(conditionId),
      error: '수행에 필요한 시작 정보가 없습니다. 원래 실험 창에서 과업을 다시 여십시오.',
    };
  }

  const runtime = hydrateConditionRuntime(conditionId, launchPayload.runSnapshot);
  const task = checkoutTasks[taskIndex] ?? checkoutTasks[0];
  runtime.modal = null;
  runtime.isSaving = false;
  runtime.liveStatus = '신청 항목을 맞춘 뒤 제출 확인에서 신청서 제출을 누르십시오.';
  runtime.currentTaskLogger = createTaskLogger({
    sessionId,
    conditionId,
    taskId: task.id,
    taskTitle: task.title,
    startMode: 'first-input',
    ignoreSelector: '[data-measurement-exempt="true"]',
    onStart() {
      postBridgeMessage({
        type: 'runner-started',
        sessionId,
        launchId,
        conditionId,
        taskIndex,
      });
    },
  });

  return {
    sessionId,
    conditionId,
    taskIndex,
    launchId,
    focusRequest: null,
    completed: false,
    run: runtime,
    error: '',
  };
}

function createConditionRuntime(variantId) {
  return {
    variantId,
    currentSectionId: checkoutScenario.sections[0]?.id ?? null,
    settingValues: deepClone(checkoutScenario.initialValues),
    helpVisitedThisTask: {},
    modal: null,
    liveStatus: '신청 항목을 바꾸면 제출 전에 다시 확인할 수 있습니다.',
    taskResults: [],
    currentTaskLogger: null,
    isSaving: false,
    lastSavedSectionId: null,
    lastTaskCompletionNote: '',
  };
}

function getOrCreateSessionId() {
  return getSharedSessionId({
    storageKey: STORAGE_KEY_SESSION,
    idPrefix: 'checkout-session',
  });
}

function getCurrentConditionId() {
  if (APP_MODE === 'runner') return state.conditionId;
  return state.order[state.currentConditionIndex] ?? null;
}

function getCurrentRun() {
  if (APP_MODE === 'runner') return state.run;
  const conditionId = getCurrentConditionId();
  return conditionId ? state.runs[conditionId] : null;
}

function getCurrentTask() {
  if (APP_MODE === 'runner') return checkoutTasks[state.taskIndex] ?? null;
  return checkoutTasks[state.currentTaskIndex] ?? null;
}

function hydrateConditionRuntime(variantId, snapshot = {}) {
  const runtime = createConditionRuntime(variantId);
  runtime.currentSectionId = snapshot.currentSectionId ?? runtime.currentSectionId;
  runtime.settingValues = deepClone(snapshot.settingValues ?? runtime.settingValues);
  runtime.helpVisitedThisTask = deepClone(snapshot.helpVisitedThisTask ?? runtime.helpVisitedThisTask);
  runtime.lastSavedSectionId = snapshot.lastSavedSectionId ?? runtime.lastSavedSectionId;
  runtime.lastTaskCompletionNote = snapshot.lastTaskCompletionNote ?? runtime.lastTaskCompletionNote;
  runtime.liveStatus = snapshot.liveStatus ?? runtime.liveStatus;
  return runtime;
}

function serializeRuntimeSnapshot(run) {
  return {
    variantId: run.variantId,
    currentSectionId: run.currentSectionId,
    settingValues: deepClone(run.settingValues),
    helpVisitedThisTask: deepClone(run.helpVisitedThisTask),
    lastSavedSectionId: run.lastSavedSectionId,
    lastTaskCompletionNote: run.lastTaskCompletionNote,
    liveStatus: run.liveStatus,
  };
}

function applyRuntimeSnapshot(targetRun, snapshot) {
  const hydrated = hydrateConditionRuntime(targetRun.variantId, snapshot);
  targetRun.currentSectionId = hydrated.currentSectionId;
  targetRun.settingValues = hydrated.settingValues;
  targetRun.helpVisitedThisTask = hydrated.helpVisitedThisTask;
  targetRun.lastSavedSectionId = hydrated.lastSavedSectionId;
  targetRun.lastTaskCompletionNote = hydrated.lastTaskCompletionNote;
  targetRun.liveStatus = hydrated.liveStatus;
  targetRun.modal = null;
  targetRun.isSaving = false;
}

function resetExperimentState() {
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  state.activeLaunch = null;
  state.runs.variantA = createConditionRuntime('variantA');
  state.runs.variantB = createConditionRuntime('variantB');
}

function goHome() {
  window.location.href = './index.html';
}

function startExperiment() {
  if (APP_MODE === 'runner') return;
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  state.runs.variantA = createConditionRuntime('variantA');
  state.runs.variantB = createConditionRuntime('variantB');
  prepareCurrentTaskForMain();
  state.view = 'taskPrep';
  requestFocus('#task-prep-heading');
  render();
}

function restartExperiment() {
  if (APP_MODE === 'runner') return;
  resetExperimentState();
  state.view = 'serviceIntro';
  requestFocus('#service-heading');
  render();
}

function prepareCurrentTaskForMain() {
  const conditionId = getCurrentConditionId();
  const task = getCurrentTask();
  if (!conditionId || !task) return;
  const run = state.runs[conditionId];
  run.modal = null;
  run.isSaving = false;
  run.currentSectionId = checkoutScenario.sections[0]?.id ?? run.currentSectionId;
  run.helpVisitedThisTask = {};
  run.lastSavedSectionId = null;
  run.liveStatus = '과업 내용은 이 창에서 확인하고, 실제 수행은 새 탭에서 진행합니다.';
  state.activeLaunch = null;
}

function continueAfterTask() {
  if (APP_MODE === 'runner') return;
  if (state.currentTaskIndex < checkoutTasks.length - 1) {
    state.currentTaskIndex += 1;
    prepareCurrentTaskForMain();
    state.view = 'taskPrep';
    requestFocus('#task-prep-heading');
    render();
    return;
  }

  state.view = 'conditionReview';
  requestFocus('#condition-review-heading');
  render();
}

function continueAfterCondition() {
  if (APP_MODE === 'runner') return;
  if (state.currentConditionIndex < state.order.length - 1) {
    state.currentConditionIndex += 1;
    state.currentTaskIndex = 0;
    const nextVariant = getCurrentConditionId();
    state.runs[nextVariant] = createConditionRuntime(nextVariant);
    prepareCurrentTaskForMain();
    state.view = 'taskPrep';
    requestFocus('#task-prep-heading');
    render();
    return;
  }

  state.view = 'final';
  requestFocus('#final-summary-heading');
  render();
}

function buildLaunchStorageKey(launchId) {
  return buildSharedLaunchStorageKey(LAUNCH_STORAGE_PREFIX, launchId);
}

function saveLaunchSnapshot(launchId, payload) {
  saveSharedLaunchSnapshot(LAUNCH_STORAGE_PREFIX, launchId, payload);
}

function readLaunchSnapshot(launchId) {
  return readSharedLaunchSnapshot(LAUNCH_STORAGE_PREFIX, launchId);
}

function clearLaunchSnapshot(launchId) {
  clearSharedLaunchSnapshot(LAUNCH_STORAGE_PREFIX, launchId);
}

function buildRunnerUrl({ launchId, conditionId, taskIndex, sessionId }) {
  return buildSharedRunnerUrl({
    currentHref: window.location.href,
    sessionId,
    conditionId,
    taskIndex,
    launchId,
  });
}

function launchRunnerTask() {
  if (APP_MODE === 'runner') return;
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!conditionId || !run || !task) return;

  const launchId = uniqueId('checkout-launch');
  const payload = {
    launchId,
    sessionId: state.sessionId,
    conditionId,
    taskIndex: state.currentTaskIndex,
    taskId: task.id,
    runSnapshot: serializeRuntimeSnapshot(run),
  };
  saveLaunchSnapshot(launchId, payload);

  state.activeLaunch = {
    launchId,
    status: 'opening',
    lastMessage: '새 탭을 열고 있습니다. 열리지 않으면 브라우저의 팝업 차단을 확인하십시오.',
  };

  const runnerWindow = window.open(
    buildRunnerUrl({
      launchId,
      conditionId,
      taskIndex: state.currentTaskIndex,
      sessionId: state.sessionId,
    }),
    '_blank'
  );

  if (!runnerWindow) {
    state.activeLaunch.status = 'blocked';
    state.activeLaunch.lastMessage = '새 탭을 열지 못했습니다. 팝업 차단을 해제한 뒤 다시 시도하십시오.';
    state.view = 'taskPrep';
    render();
    return;
  }

  state.view = 'taskRunning';
  requestFocus('#task-prep-heading');
  render();
}

function acceptRunnerTaskCompletion(message) {
  const conditionId = getCurrentConditionId();
  const task = getCurrentTask();
  if (!conditionId || !task) return;
  const run = state.runs[conditionId];
  applyRuntimeSnapshot(run, message.runSnapshot ?? {});
  run.lastTaskCompletionNote = message.summary?.completionReason ?? '';
  run.taskResults.push({
    ...message.summary,
    benchmarkTaskId: task.benchmarkTaskId,
    targetSectionId: task.targetSectionId,
    settingValuesAfterTask: deepClone(run.settingValues),
    conditionId,
  });

  if (state.activeLaunch) {
    state.activeLaunch.status = 'completed';
    state.activeLaunch.lastMessage = '결과를 전달받았습니다.';
    clearLaunchSnapshot(state.activeLaunch.launchId);
  }

  state.activeLaunch = null;
  state.view = 'taskReview';
  requestFocus('#review-heading');
  render();
}

function closeRunnerWindow() {
  if (APP_MODE !== 'runner') return;
  closeSharedRunnerWindow({
    bridge,
    sessionId: state.sessionId,
    launchId: state.launchId,
    completed: state.completed,
    fallbackHref: window.location.href,
  });
}

function wireEvents() {
  root.addEventListener('click', handleRootClick);
  root.addEventListener('change', handleRootChange);
  root.addEventListener('keydown', handleRootKeydown);

  if (APP_MODE === 'runner') {
    window.addEventListener('beforeunload', () => {
      postBridgeMessage({
        type: 'runner-closed',
        sessionId: state.sessionId,
        launchId: state.launchId,
        completed: state.completed,
      });
    });
  }
}

function handleRootClick(event) {
  const inertLink = event.target.closest('[data-inert-link="true"]');
  if (inertLink) {
    event.preventDefault();
  }

  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;

  if (APP_MODE === 'main') {
    if (action === 'go-home') {
      event.preventDefault();
      goHome();
      return;
    }
    if (action === 'start-experiment') {
      event.preventDefault();
      startExperiment();
      return;
    }
    if (action === 'launch-runner') {
      event.preventDefault();
      launchRunnerTask();
      return;
    }
    if (action === 'restart-experiment') {
      event.preventDefault();
      restartExperiment();
      return;
    }
    if (action === 'continue-after-task') {
      event.preventDefault();
      continueAfterTask();
      return;
    }
    if (action === 'continue-after-condition') {
      event.preventDefault();
      continueAfterCondition();
      return;
    }
    if (action === 'save-service-evaluation') {
      event.preventDefault();
      saveServiceEvaluation();
      return;
    }
    return;
  }

  if (action === 'switch-section') {
    event.preventDefault();
    switchSection(actionTarget.dataset.sectionId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'toggle-setting') {
    event.preventDefault();
    toggleSetting(actionTarget.dataset.settingId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'set-choice-value') {
    event.preventDefault();
    updateSettingValue(actionTarget.dataset.settingId, actionTarget.dataset.valueId, {
      focusSelector: `[data-focus-id="${actionTarget.dataset.focusId}"]`,
      actionType: 'choice',
    });
    return;
  }

  if (action === 'open-setting-help') {
    event.preventDefault();
    openSettingHelp(actionTarget.dataset.settingId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'submit-application') {
    event.preventDefault();
    submitApplication(actionTarget.dataset.focusId);
    return;
  }

  if (action === 'dialog-close') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (action === 'jump-results') {
    event.preventDefault();
    focusElementNow('#settings-heading');
    return;
  }

  if (action === 'close-runner') {
    event.preventDefault();
    closeRunnerWindow();
    return;
  }

  if (action === 'acknowledge-task-complete') {
    event.preventDefault();
    closeRunnerWindow();
  }
}


function saveServiceEvaluation() {
  const form = document.querySelector('[data-service-survey-form]');
  if (!(form instanceof HTMLFormElement)) return;
  if (!form.reportValidity()) return;

  saveCompletedServiceRecord({
    sessionId: state.sessionId,
    serviceId: 'checkout',
    serviceLabel: '신청·결제 흐름',
    order: state.order,
    actualA: aggregateActualCondition(state.runs.variantA),
    actualB: aggregateActualCondition(state.runs.variantB),
    formElement: form,
  });

  goHome();
}

function handleRootChange(event) {
  const element = event.target;
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;

  if (APP_MODE === 'main' && element.name === 'benchmark-profile') {
    state.benchmarkProfileFocus = element.value;
    render();
  }
}

function handleRootKeydown(event) {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  if (!run) return;

  if (state.completed) {
    const completionDialog = document.querySelector('[data-completion-dialog]');
    if (completionDialog instanceof HTMLElement && event.key === 'Tab') {
      trapFocusInDialog(completionDialog, event);
    } else if (completionDialog instanceof HTMLElement && event.key === 'Escape') {
      event.preventDefault();
    }
    return;
  }

  if (run.modal && event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (run.modal) {
    const dialog = document.querySelector('[data-modal-dialog]');
    if (dialog instanceof HTMLElement && dialog.contains(event.target) && event.key === 'Tab') {
      trapFocusInDialog(dialog, event);
      return;
    }
  }

  if (state.conditionId === 'variantB') {
    const sectionTab = event.target.closest('[data-section-tab="true"]');
    if (sectionTab instanceof HTMLElement) {
      handleSectionTabNavigation(event, sectionTab);
      return;
    }

    const choiceButton = event.target.closest('[data-setting-choice="true"]');
    if (choiceButton instanceof HTMLElement) {
      handleChoiceGroupNavigation(event, choiceButton);
    }
  }
}

function requestFocus(selector) {
  state.focusRequest = selector;
}

function focusElementNow(selector) {
  const target = document.querySelector(selector);
  if (target instanceof HTMLElement) {
    target.focus();
    return true;
  }
  requestFocus(selector);
  return false;
}

function applyPendingFocus() {
  if (!state.focusRequest) return;
  const selector = state.focusRequest;
  state.focusRequest = null;
  window.requestAnimationFrame(() => {
    const target = document.querySelector(selector);
    if (target instanceof HTMLElement) {
      target.focus();
    }
  });
}

function getSectionById(sectionId) {
  return checkoutScenario.sections.find((section) => section.id === sectionId) ?? null;
}

function getSettingById(settingId) {
  return checkoutScenario.settings.find((setting) => setting.id === settingId) ?? null;
}

function getSettingsBySection(sectionId) {
  return checkoutScenario.settings.filter((setting) => setting.sectionId === sectionId);
}

function getCurrentSection(run) {
  return getSectionById(run.currentSectionId) ?? checkoutScenario.sections[0] ?? null;
}

function buildSectionTabSelector(sectionId) {
  return `[data-section-tab="true"][data-section-id="${sectionId}"]`;
}

function getSettingValueLabel(setting, value) {
  if (!setting) return value;
  if (setting.type === 'toggle') {
    return setting.valueLabels?.[value] ?? value;
  }
  if (setting.type === 'choice') {
    return setting.options.find((option) => option.id === value)?.label ?? value;
  }
  return value;
}

function formatSettingStateLabel(settingId, run) {
  const setting = getSettingById(settingId);
  if (!setting) return '';
  const value = run.settingValues[settingId];
  return `${setting.label} ${getSettingValueLabel(setting, value)}`;
}

function formatTaskCurrentState(task, run) {
  const relevantSettingIds = Object.keys(task.requiredValues ?? {});
  const items = relevantSettingIds.map((settingId) => formatSettingStateLabel(settingId, run));
  if (task.requiresHelpVisitSettingId) {
    const helpSetting = getSettingById(task.requiresHelpVisitSettingId);
    items.unshift(`${helpSetting?.label ?? '설명'} ${run.helpVisitedThisTask[task.requiresHelpVisitSettingId] ? '확인함' : '아직 확인 안 함'}`);
  }
  return items.join(' / ');
}

function formatRunStateSummary(run) {
  const currentSection = getCurrentSection(run);
  const submitted = run.lastSavedSectionId === 'submit';
  return [
    currentSection ? `현재 단계 ${currentSection.label}` : '현재 단계 없음',
    submitted ? '최근 제출 완료' : '최근 제출 없음',
  ].join(' / ');
}

function areTaskValueRequirementsMet(task, run) {
  return Object.entries(task.requiredValues ?? {}).every(([settingId, requiredValue]) => run.settingValues[settingId] === requiredValue);
}

function isTaskSatisfied(task, run) {
  if (!task || !run) return false;
  if (!areTaskValueRequirementsMet(task, run)) return false;
  if (task.requiresHelpVisitSettingId && !run.helpVisitedThisTask[task.requiresHelpVisitSettingId]) return false;
  return true;
}

function noteWrongSettingAction(actionType, payload = {}) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task) return;

  let isWrong = false;

  if (actionType === 'open-help') {
    isWrong = payload.settingId !== task.requiresHelpVisitSettingId;
  } else if (actionType === 'submit-application') {
    isWrong = !isTaskSatisfied(task, run);
  } else if (actionType === 'set-value') {
    const requiredValue = task.requiredValues?.[payload.settingId];
    isWrong = requiredValue == null || requiredValue !== payload.value;
  }

  if (!isWrong) return;

  run.currentTaskLogger?.note('wrong-selection', {
    actionType,
    ...payload,
    targetSectionId: task.targetSectionId,
    targetValues: task.requiredValues,
    requiresHelpVisitSettingId: task.requiresHelpVisitSettingId ?? '',
  });
}

function switchSection(sectionId, focusId) {
  const run = getCurrentRun();
  if (!run || !sectionId) return;
  const section = getSectionById(sectionId);
  if (!section) return;
  run.currentSectionId = section.id;
  run.liveStatus = `${section.label}으로 이동했습니다.`;
  if (focusId) {
    requestFocus(`[data-focus-id="${focusId}"]`);
  }
  render();
}

function updateSettingValue(settingId, value, { focusSelector = '', actionType = 'choice' } = {}) {
  const run = getCurrentRun();
  if (!run || !settingId || run.isSaving) return;
  const setting = getSettingById(settingId);
  if (!setting) return;
  const previousValue = run.settingValues[settingId];
  if (previousValue === value) {
    if (focusSelector) requestFocus(focusSelector);
    render();
    return;
  }

  run.currentSectionId = setting.sectionId;
  run.settingValues = {
    ...run.settingValues,
    [settingId]: value,
  };

  run.currentTaskLogger?.note('setting-change', {
    settingId,
    sectionId: setting.sectionId,
    previousValue,
    value,
    changeKind: actionType,
  });
  noteWrongSettingAction('set-value', { settingId, value, previousValue, sectionId: setting.sectionId });

  run.liveStatus = `${setting.label} 값이 ${getSettingValueLabel(setting, value)}로 바뀌었습니다.`;
  if (focusSelector) {
    requestFocus(focusSelector);
  }
  render();
}

function toggleSetting(settingId, focusId) {
  const run = getCurrentRun();
  const setting = getSettingById(settingId);
  if (!run || !setting || setting.type !== 'toggle') return;
  const nextValue = run.settingValues[settingId] === 'on' ? 'off' : 'on';
  updateSettingValue(settingId, nextValue, {
    focusSelector: focusId ? `[data-focus-id="${focusId}"]` : '',
    actionType: 'toggle',
  });
}

function openSettingHelp(settingId, triggerFocusId) {
  const run = getCurrentRun();
  const setting = getSettingById(settingId);
  if (!run || !setting || run.isSaving) return;

  noteWrongSettingAction('open-help', { settingId, sectionId: setting.sectionId });
  run.currentSectionId = setting.sectionId;
  run.modal = {
    kind: 'setting-help',
    settingId,
    triggerFocusId,
  };

  run.currentTaskLogger?.note('open-setting-help', {
    settingId,
    sectionId: setting.sectionId,
  });
  run.currentTaskLogger?.setModalState({
    open: true,
    containerSelector: '[data-modal-dialog]',
    triggerFocusId,
  });

  if (state.conditionId === 'variantB') {
    requestFocus('[data-dialog-close]');
  } else {
    requestFocus('#dialog-title');
  }
  render();
}

function closeModal() {
  const run = getCurrentRun();
  if (!run || !run.modal) return;
  const closingModal = run.modal;
  const setting = getSettingById(closingModal.settingId);
  run.modal = null;

  if (setting) {
    run.helpVisitedThisTask = {
      ...run.helpVisitedThisTask,
      [setting.id]: true,
    };
  }

  run.currentTaskLogger?.setModalState({
    open: false,
    containerSelector: null,
    triggerFocusId: closingModal.triggerFocusId,
    closedAt: performance.now(),
  });

  if (state.conditionId === 'variantB' && closingModal.triggerFocusId) {
    requestFocus(`[data-focus-id="${closingModal.triggerFocusId}"]`);
  } else {
    run.currentTaskLogger?.note('context-reset', { reason: 'dialog-closed-returned-to-settings-heading' });
    requestFocus('#settings-heading');
  }

  if (setting) {
    run.liveStatus = `${setting.label} 설명을 닫았습니다.`;
  }
  render();
}

function submitApplication(focusId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || run.isSaving) return;

  noteWrongSettingAction('submit-application', {
    sectionId: run.currentSectionId,
  });
  run.isSaving = true;
  run.currentSectionId = 'submit';
  run.liveStatus = '신청서를 제출하는 중입니다…';
  render();

  window.setTimeout(() => {
    run.isSaving = false;
    run.lastSavedSectionId = 'submit';
    run.currentTaskLogger?.note('submit-application', {
      values: deepClone(run.settingValues),
    });

    if (isTaskSatisfied(task, run)) {
      finishRunnerTask('submitted-application');
      return;
    }

    run.liveStatus = '신청서를 아직 제출할 수 없습니다. 목표 신청 상태를 다시 확인하십시오.';
    if (state.conditionId === 'variantB' && focusId) {
      requestFocus(`[data-focus-id="${focusId}"]`);
    } else {
      requestFocus('#section-heading-submit');
    }
    render();
  }, 260);
}

function finishRunnerTask(reason) {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger) return;

  const summary = run.currentTaskLogger.finish({
    success: true,
    reason,
    notes: [
      `currentSection=${run.currentSectionId ?? 'none'}`,
      `submitted=${run.lastSavedSectionId === 'submit' ? 'yes' : 'no'}`,
      `values=${JSON.stringify(run.settingValues)}`,
      `helpVisited=${Object.keys(run.helpVisitedThisTask).filter((settingId) => run.helpVisitedThisTask[settingId]).join(',') || 'none'}`,
      'measurement=first-input-visible-only',
    ],
  });

  run.currentTaskLogger = null;
  run.lastTaskCompletionNote = reason;
  run.modal = null;
  state.completed = true;
  run.liveStatus = '과업 수행이 끝났습니다. 확인을 누르면 이 탭이 닫힙니다.';

  postBridgeMessage({
    type: 'task-complete',
    sessionId: state.sessionId,
    launchId: state.launchId,
    conditionId: state.conditionId,
    taskIndex: state.taskIndex,
    summary,
    runSnapshot: serializeRuntimeSnapshot(run),
  });

  requestFocus('[data-completion-confirm]');
  render();
}

function handleSectionTabNavigation(event, currentButton) {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const run = getCurrentRun();
  if (!run) return;
  const currentIndex = checkoutScenario.sections.findIndex((section) => section.id === currentButton.dataset.sectionId);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, checkoutScenario.sections.length - 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = checkoutScenario.sections.length - 1;

  event.preventDefault();
  const nextSection = checkoutScenario.sections[nextIndex];
  run.currentSectionId = nextSection.id;
  run.liveStatus = `${nextSection.label}으로 이동했습니다.`;
  requestFocus(buildSectionTabSelector(nextSection.id));
  render();
}

function handleChoiceGroupNavigation(event, currentButton) {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const settingId = currentButton.dataset.settingId;
  const setting = getSettingById(settingId);
  if (!setting || setting.type !== 'choice') return;
  const currentIndex = setting.options.findIndex((option) => option.id === currentButton.dataset.valueId);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, setting.options.length - 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = setting.options.length - 1;

  event.preventDefault();
  const nextOption = setting.options[nextIndex];
  updateSettingValue(setting.id, nextOption.id, {
    focusSelector: `[data-focus-id="setting-choice-${setting.id}-${nextOption.id}"]`,
    actionType: 'choice-arrow',
  });
}

function trapFocusInDialog(dialog, event) {
  trapSharedFocusInDialog(dialog, event);
}

function render() {
  document.title = getDocumentTitle();
  if (APP_MODE === 'runner') {
    root.innerHTML = renderRunnerPage();
  } else {
    root.innerHTML = `
      <div class="page-shell">
        ${renderMainPage()}
        ${renderLanguageGuideCard()}
      </div>
    `;
  }
  applyPendingFocus();
}

function getDocumentTitle() {
  if (APP_MODE === 'runner') {
    const task = getCurrentTask();
    return `수행 화면 · ${task?.title ?? '신청·결제 흐름'}`;
  }
  if (state.view === 'serviceIntro') return '신청·결제 흐름 서비스 화면';
  if (state.view === 'taskPrep' || state.view === 'taskRunning') return `과업 준비 · ${getCurrentTask()?.title ?? '신청·결제 흐름'}`;
  if (state.view === 'taskReview') return '과업 결과 요약';
  if (state.view === 'conditionReview') return '비교안 요약';
  return '신청·결제 흐름 최종 비교';
}

function renderMainPage() {
  if (state.view === 'serviceIntro') return renderServiceIntroView();
  if (state.view === 'taskPrep' || state.view === 'taskRunning') return renderTaskPreparationView();
  if (state.view === 'taskReview') return renderTaskReviewView();
  if (state.view === 'conditionReview') return renderConditionReviewView();
  return renderFinalView();
}

function renderRunnerPage() {
  if (state.error) {
    return `
      <div class="runner-shell">
        <main class="runner-main card">
          <h1 id="runner-error-heading" tabindex="-1">수행 창을 준비할 수 없습니다.</h1>
          <p>${escapeHtml(state.error)}</p>
          <div class="button-row" data-runner-footer data-measurement-exempt="true">
            <button class="button button-primary" data-action="close-runner">이 창 닫기</button>
          </div>
        </main>
      </div>
    `;
  }

  const run = getCurrentRun();
  const conditionId = getCurrentConditionId();
  const task = getCurrentTask();

  return `
    <div class="runner-shell">
      ${conditionId === 'variantB' && !state.completed ? `<a class="skip-link" href="#settings-heading" data-action="jump-results" data-focus-id="runner-skip-checkout">${RUNNER_LABELS.quickJump}</a>` : ''}
      <main class="runner-main" aria-label="신청·결제 흐름 수행 화면" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <h1 class="sr-only" id="runner-title" tabindex="-1">${escapeHtml(task.title)} · ${escapeHtml(VARIANT_META[conditionId].title)}</h1>
        ${renderSettingsHeader(conditionId)}
        ${renderSettingsWorkspace(conditionId, run)}
      </main>
      ${state.completed ? '' : `<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="live-status-region">${escapeHtml(run.liveStatus)}</div>`}
      ${state.completed ? '' : renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${run.modal ? renderSettingHelpModal(run.modal, run) : ''}
      ${state.completed
        ? renderRunnerCompletionDialogHtml({
          description: `${task.title} 기록을 원래 창으로 전달했습니다. 확인을 누르면 이 탭이 자동으로 닫힙니다.`,
        })
        : ''}
    </div>
  `;
}

function renderServiceIntroView() {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">신청·결제 흐름</h1>
      <p>
        같은 신청·결제 내용을 두 가지 다른 이동 구조로 보여 주는 실험 화면입니다.
        이 화면에서 과업 준비 단계로 들어가거나, 다시 서비스 선택 화면으로 돌아갈 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번에 확인하는 것</h2>
          <ul>
            <li>길게 이어진 신청 단계와 흩어진 설명 보기 버튼이 순차 탐색 부담을 얼마나 키우는지</li>
            <li>신청 단계를 빠르게 고르고 같은 묶음 안에서 바로 값을 맞춘 뒤 제출할 수 있을 때 부담이 얼마나 줄어드는지</li>
            <li>설명 대화상자를 닫은 뒤 같은 자리로 돌아오는 구조가 실제 기록에 어떤 차이를 만드는지</li>
          </ul>
        </section>
        <section>
          <h2>실험 설정</h2>
          <dl class="meta-list">
            <div><dt>비교안 순서</dt><dd>${state.order.map((variantId) => VARIANT_META[variantId].shortLabel).join(' → ')}</dd></div>
            <div><dt>실제 수행 방식</dt><dd>메인 창에서 과업 확인 후 새 탭에서 수행</dd></div>
            <div><dt>사전 계산 기준</dt><dd>키보드 · 화면낭독 · 스위치</dd></div>
          </dl>
        </section>
      </div>
      <div class="button-row">
        <button class="button button-primary" data-action="start-experiment">과업 준비로 이동</button>
        <button class="button button-secondary" data-action="go-home">서비스 선택으로 돌아가기</button>
      </div>
    </header>
  `;
}

function renderLanguageGuideCard() {
  return renderSharedLanguageGuideCard(GLOSSARY_ENTRIES);
}

function renderTaskPreparationView() {
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const task = getCurrentTask();
  const benchmark = benchmarkResultsCheckout.variants[conditionId].tasks[task.benchmarkTaskId];
  const activeLaunch = state.activeLaunch;
  const isRunning = state.view === 'taskRunning';
  const targetSection = getSectionById(task.targetSectionId);

  return `
    <section class="card review-hero">
      <div>
        <p class="eyebrow">${escapeHtml(VARIANT_META[conditionId].title)}</p>
        <h1 id="task-prep-heading" tabindex="-1">과업 ${state.currentTaskIndex + 1} 준비</h1>
        <p>${escapeHtml(task.title)}를 시작하기 전에 이 창에서 과업 내용을 먼저 확인하십시오.</p>
      </div>
      <div class="pill-group">
        <span class="pill">실험 번호 ${escapeHtml(state.sessionId)}</span>
        <span class="pill">비교안 ${escapeHtml(VARIANT_META[conditionId].shortLabel)}</span>
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${checkoutTasks.length}</span>
      </div>
    </section>

    <section class="review-grid">
      <article class="card">
        <h2>이번 과업</h2>
        <p class="goal">${escapeHtml(task.goalSummary)}</p>
        <ol>
          ${task.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}
        </ol>
        <dl class="meta-list compact">
          <div><dt>현재 신청 상태</dt><dd>${escapeHtml(formatTaskCurrentState(task, run))}</dd></div>
          <div><dt>목표 신청 단계</dt><dd>${escapeHtml(targetSection?.label ?? '없음')}</dd></div>
          <div><dt>목표 신청 상태</dt><dd>${escapeHtml(task.targetSummary)}</dd></div>
        </dl>
      </article>

      <article class="card">
        <h2>실제 계측 규칙</h2>
        <ul>
          ${MEASUREMENT_RULES.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}
        </ul>
        <div class="status-box" role="status" aria-live="polite" aria-atomic="true">
          ${escapeHtml(renderLaunchStatusMessage(activeLaunch, isRunning))}
        </div>
      </article>

      <article class="card">
        <h2>현재 화면의 이동 구조</h2>
        <ul>
          ${VARIANT_META[conditionId].improvements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </article>
    </section>

    <section class="review-grid">
      <article class="card">
        <h2>사전 계산 기준</h2>
        ${renderProfileBenchmarkTable(benchmark)}
      </article>
      <article class="card">
        <h2>실행 버튼</h2>
        <p class="muted">새 탭을 열면 실제 조작 기록은 새 탭의 첫 입력부터 시작합니다. 이 창은 과업 내용을 다시 확인하는 용도로 그대로 유지됩니다.</p>
        <dl class="meta-list compact">
          <div><dt>현재 실행 상태</dt><dd>${escapeHtml(formatRunStateSummary(run))}</dd></div>
        </dl>
        <div class="button-row">
          <button class="button button-primary" data-action="launch-runner">
            ${isRunning ? '수행 탭 다시 열기' : `새 탭에서 비교안 ${escapeHtml(VARIANT_META[conditionId].shortLabel)} 열고 과업 시작`}
          </button>
          ${isRunning
            ? '<button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>'
            : '<button class="button button-secondary" data-action="go-home">서비스 선택으로 돌아가기</button>'}
        </div>
      </article>
    </section>
  `;
}

function renderLaunchStatusMessage(activeLaunch, isRunning) {
  return renderSharedLaunchStatusMessage(activeLaunch, isRunning);
}

function renderTaskReviewView() {
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const task = getCurrentTask();
  const result = run.taskResults.at(-1);
  const benchmark = benchmarkResultsCheckout.variants[conditionId].tasks[result.benchmarkTaskId];
  const comparison = benchmarkResultsCheckout.comparisons[result.benchmarkTaskId];

  return `
    <section class="card review-hero">
      <p class="eyebrow">${escapeHtml(VARIANT_META[conditionId].title)}</p>
      <h1 id="review-heading" tabindex="-1">과업 완료</h1>
      <p>${escapeHtml(task.title)}를 완료했습니다. 실제 기록과 사전 계산 기준을 함께 확인하십시오.</p>
    </section>
    <section class="review-grid">
      <article class="card">
        <h2>실제 기록 요약</h2>
        <dl class="meta-list compact">
          <div><dt>완료 시간</dt><dd>${formatSeconds(result.durationSeconds)}</dd></div>
          <div><dt>숨김 탭 제외 시간</dt><dd>${formatSeconds(result.hiddenDurationSeconds ?? 0)}</dd></div>
          <div><dt>총 키 입력</dt><dd>${result.totalKeyInputs}</dd></div>
          <div><dt>초점 이동</dt><dd>${result.focusChanges}</dd></div>
          <div><dt>되돌아간 입력</dt><dd>${result.backtrackInputs}</dd></div>
          <div><dt>목표와 다른 항목에서 동작</dt><dd>${result.wrongSelections}</dd></div>
          <div><dt>위치 다시 찾기</dt><dd>${result.contextResets ?? 0}</dd></div>
          <div><dt>클릭 입력</dt><dd>${result.pointerActivations}</dd></div>
        </dl>
        <p class="muted">과업 설명을 읽는 시간과 수행 탭이 숨겨진 시간은 실제 완료 시간에서 제외했습니다.</p>
      </article>
      <article class="card">
        <h2>사전 계산 기준</h2>
        ${renderProfileBenchmarkTable(benchmark)}
      </article>
      <article class="card">
        <h2>왜 조작 부담 차이가 나는가</h2>
        <ul>
          ${benchmark.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join('')}
        </ul>
        <p class="muted">${escapeHtml(benchmarkResultsCheckout.variants[conditionId].description)}</p>
      </article>
    </section>
    <section class="card">
      <h2>비교안 간 예상 차이</h2>
      <table class="summary-table">
        <thead>
          <tr><th>사용자 유형</th><th>A→B 예상 감소 시간</th><th>A→B 예상 감소 비율</th></tr>
        </thead>
        <tbody>
          ${Object.entries(comparison).map(([profileId, value]) => `
            <tr>
              <th>${escapeHtml(benchmarkResultsCheckout.overall[profileId].label)}</th>
              <td>${formatSeconds(value.expectedReductionSeconds)}</td>
              <td>${value.expectedReductionPercent}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="button-row">
        <button class="button button-primary" data-action="continue-after-task">
          ${state.currentTaskIndex < checkoutTasks.length - 1 ? '다음 과업 준비' : '현재 비교안 요약 보기'}
        </button>
        <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
      </div>
    </section>
  `;
}

function renderProfileBenchmarkTable(benchmark) {
  return renderSharedProfileBenchmarkTable(benchmark);
}

function renderConditionReviewView() {
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const totals = aggregateActualCondition(run);
  const benchmarkOverall = aggregateBenchmarkCondition(conditionId);

  return `
    <section class="card review-hero">
      <p class="eyebrow">비교안 ${escapeHtml(VARIANT_META[conditionId].shortLabel)} 완료</p>
      <h1 id="condition-review-heading" tabindex="-1">현재 서비스 요약</h1>
      <p>${escapeHtml(VARIANT_META[conditionId].title)}에서 3개 과업을 모두 마쳤습니다.</p>
    </section>
    <section class="review-grid">
      <article class="card">
        <h2>실제 수행 합계</h2>
        <dl class="meta-list compact">
          <div><dt>총 완료 시간</dt><dd>${formatSeconds(totals.durationSeconds)}</dd></div>
          <div><dt>총 숨김 탭 제외 시간</dt><dd>${formatSeconds(totals.hiddenDurationSeconds)}</dd></div>
          <div><dt>총 키 입력</dt><dd>${totals.totalKeyInputs}</dd></div>
          <div><dt>총 초점 이동</dt><dd>${totals.focusChanges}</dd></div>
          <div><dt>목표와 다른 항목에서 동작</dt><dd>${totals.wrongSelections}</dd></div>
          <div><dt>위치 다시 찾기</dt><dd>${totals.contextResets}</dd></div>
          <div><dt>대화상자 바깥으로 초점 이탈</dt><dd>${totals.modalEscapes}</dd></div>
        </dl>
      </article>
      <article class="card">
        <h2>예상 조작 부담 합계</h2>
        <table class="summary-table">
          <thead>
            <tr><th>사용자 유형</th><th>기준 예상</th><th>A→B 예상 감소</th></tr>
          </thead>
          <tbody>
            ${Object.entries(benchmarkOverall).map(([profileId, value]) => `
              <tr>
                <th>${escapeHtml(value.label)}</th>
                <td>${formatSeconds(value.expectedSeconds)}</td>
                <td>${value.variantReductionHint}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </article>
      <article class="card">
        <h2>수행한 과업 기록</h2>
        <ol>
          ${run.taskResults.map((result, index) => `<li><strong>${escapeHtml(checkoutTasks[index].title)}</strong> — ${formatSeconds(result.durationSeconds)}, 키 ${result.totalKeyInputs}회, 초점 이동 ${result.focusChanges}회</li>`).join('')}
        </ol>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-condition">
        ${state.currentConditionIndex < state.order.length - 1 ? '다음 비교안 준비' : '최종 비교 보기'}
      </button>
      <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
    </div>
  `;
}

function renderFinalView() {
  const actualA = aggregateActualCondition(state.runs.variantA);
  const actualB = aggregateActualCondition(state.runs.variantB);
  const selectedProfileId = state.benchmarkProfileFocus;
  const exportUrl = buildExportDataUrl();

  return `
    <section class="card review-hero">
      <p class="eyebrow">신청·결제 흐름 실험 완료</p>
      <h1 id="final-summary-heading" tabindex="-1">비교안 A/B 최종 비교</h1>
      <p>실제 기록과 사전 계산 기준을 함께 보면서, 다음 서비스 유형으로 확장할 때 다시 쓸 기준점과 점검 기준을 마련했습니다.</p>
    </section>
    <section class="card toolbar-card">
      <label>
        <span>비교 기준 사용자 유형</span>
        <select name="benchmark-profile">
          ${Object.entries(benchmarkResultsCheckout.overall).map(([profileId, profile]) => `
            <option value="${profileId}" ${profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>
          `).join('')}
        </select>
      </label>
      <div class="button-row">
        <a class="button button-secondary" download="checkout-flow-${escapeHtml(state.sessionId)}.json" href="${exportUrl}">결과 파일(JSON) 내려받기</a>
      </div>
    </section>
    <section class="comparison-grid">
      ${renderFinalConditionCard('variantA', actualA, selectedProfileId)}
      ${renderFinalConditionCard('variantB', actualB, selectedProfileId)}
    </section>
    ${renderStudyServiceCompletionCard({ sessionId: state.sessionId, serviceId: 'checkout', serviceLabel: '신청·결제 흐름' })}
    <section class="card">
      <h2>실제 기록 비교</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>지표</th>
            <th>비교안 A</th>
            <th>비교안 B</th>
            <th>차이</th>
          </tr>
        </thead>
        <tbody>
          <tr><th>총 완료 시간</th><td>${formatSeconds(actualA.durationSeconds)}</td><td>${formatSeconds(actualB.durationSeconds)}</td><td>${formatSigned(actualB.durationSeconds - actualA.durationSeconds, '초')}</td></tr>
          <tr><th>총 숨김 탭 제외 시간</th><td>${formatSeconds(actualA.hiddenDurationSeconds)}</td><td>${formatSeconds(actualB.hiddenDurationSeconds)}</td><td>${formatSigned(actualB.hiddenDurationSeconds - actualA.hiddenDurationSeconds, '초')}</td></tr>
          <tr><th>총 키 입력</th><td>${actualA.totalKeyInputs}</td><td>${actualB.totalKeyInputs}</td><td>${formatSigned(actualB.totalKeyInputs - actualA.totalKeyInputs)}</td></tr>
          <tr><th>총 초점 이동</th><td>${actualA.focusChanges}</td><td>${actualB.focusChanges}</td><td>${formatSigned(actualB.focusChanges - actualA.focusChanges)}</td></tr>
          <tr><th>목표와 다른 항목에서 동작</th><td>${actualA.wrongSelections}</td><td>${actualB.wrongSelections}</td><td>${formatSigned(actualB.wrongSelections - actualA.wrongSelections)}</td></tr>
          <tr><th>위치 다시 찾기</th><td>${actualA.contextResets}</td><td>${actualB.contextResets}</td><td>${formatSigned(actualB.contextResets - actualA.contextResets)}</td></tr>
        </tbody>
      </table>
      <p class="muted">과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</p>
    </section>
    <section class="card">
      <h2>다음 단계에 바로 쓸 수 있는 포인트</h2>
      <ul>
        <li>신청·결제 흐름도 메인 창과 수행 탭을 분리해 같은 운영 방식으로 확장했습니다.</li>
        <li>서비스별 사전 계산 그래프와 결과 파일을 별도로 둬 후속 서비스 유형을 독립적으로 추가할 수 있습니다.</li>
        <li>수동 점검표 문서를 함께 두어 브라우저 자동화가 어려운 부분을 배포 전 점검으로 보완할 수 있습니다.</li>
      </ul>
      <div class="button-row">
        <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
        <button class="button button-secondary" data-action="go-home">서비스 선택으로 돌아가기</button>
      </div>
    </section>
  `;
}

function renderFinalConditionCard(conditionId, actualTotals, selectedProfileId) {
  return renderSharedFinalConditionCard({
    conditionId,
    actualTotals,
    selectedProfileId,
    benchmarkResults: benchmarkResultsCheckout,
    variantMeta: VARIANT_META,
  });
}

function renderSettingsHeader(conditionId) {
  const links = ['신청 요약', '진행 안내', '연락 도움말', '결제 도움말', '환불 안내', '제출 도움말'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <nav aria-label="신청·결제 화면 보조 내비게이션">
        ${links.map((label, index) => `<a href="#" class="nav-link" data-focus-id="settings-nav-${index + 1}" data-inert-link="true">${escapeHtml(label)}</a>`).join('')}
      </nav>
    </header>
  `;
}

function renderSettingsWorkspace(conditionId, run) {
  return `
    <section class="card settings-workspace-card">
      <div class="results-header">
        <div>
          <h2 id="settings-heading" tabindex="-1">신청 단계</h2>
          <p class="muted">${escapeHtml(checkoutScenario.pageSummary)}</p>
        </div>
        ${conditionId === 'variantB'
          ? '<p class="keyboard-tip">방향키로 신청 단계를 고르고, 같은 묶음 안에서 값을 바꾼 뒤 제출 단계로 이동</p>'
          : '<p class="keyboard-tip">탭 키와 Shift+탭 키로 설명 보기, 값 선택, 제출 버튼을 차례대로 이동</p>'}
      </div>
      ${conditionId === 'variantA'
        ? renderVariantASettingsLayout(run)
        : renderVariantBSettingsLayout(run)}
    </section>
  `;
}

function renderVariantASettingsLayout(run) {
  return `
    <div class="settings-section-stack">
      ${checkoutScenario.sections.map((section) => renderVariantASection(section, run)).join('')}
    </div>
  `;
}

function renderVariantASection(section, run) {
  const settings = getSettingsBySection(section.id);
  return `
    <article class="settings-section-card settings-section-card-a">
      <div class="settings-section-head">
        <div>
          <h3 id="section-heading-${section.id}" tabindex="-1">${escapeHtml(section.label)}</h3>
          <p class="muted">${escapeHtml(section.summary)}</p>
        </div>
        <span class="pill">${escapeHtml(settings.length)}개 항목</span>
      </div>
      <div class="settings-item-list">
        ${settings.map((setting) => renderVariantASetting(setting, run)).join('')}
      </div>
      ${renderSubmitActionForSection(section, run)}
    </article>
  `;
}

function renderSubmitActionForSection(section, run, mode = 'variantA') {
  if (!section || section.id !== 'submit') return '';
  const label = run.isSaving ? '신청서 제출 중…' : '신청서 제출';
  return `
    <div class="button-row">
      <button class="button button-primary" data-action="submit-application" data-focus-id="submit-application-button" ${run.isSaving ? 'disabled' : ''}>
        ${escapeHtml(label)}
      </button>
    </div>
  `;
}

function renderVariantASetting(setting, run) {
  const valueLabel = getSettingValueLabel(setting, run.settingValues[setting.id]);
  return `
    <section class="setting-row setting-row-a">
      <div class="setting-row-head">
        <div>
          <h4>${escapeHtml(setting.label)}</h4>
          <p class="muted">${escapeHtml(setting.description)}</p>
        </div>
        <span class="pill">${escapeHtml(valueLabel)}</span>
      </div>
      <div class="button-row compact-row">
        <a href="#" class="inline-link" data-focus-id="setting-status-${setting.id}" data-inert-link="true">현재 선택 ${escapeHtml(valueLabel)}</a>
        <a href="#" class="inline-link" data-focus-id="setting-changed-${setting.id}" data-inert-link="true">최근 확인 ${escapeHtml(setting.changedAt)}</a>
        <button class="button button-secondary" data-action="open-setting-help" data-setting-id="${setting.id}" data-focus-id="setting-help-${setting.id}">${escapeHtml(setting.label)} 설명 보기</button>
        ${renderSettingActionButtons(setting, run, 'variantA')}
      </div>
    </section>
  `;
}

function renderVariantBSettingsLayout(run) {
  const section = getCurrentSection(run);
  return `
    <div class="settings-composite-layout">
      <section class="card settings-tablist-card">
        <h3 id="settings-section-nav">신청 단계</h3>
        <div class="settings-tablist" role="tablist" aria-labelledby="settings-section-nav" aria-orientation="vertical">
          ${checkoutScenario.sections.map((item) => `
            <button
              role="tab"
              class="settings-tab-button ${run.currentSectionId === item.id ? 'settings-tab-button-active' : ''}"
              aria-selected="${run.currentSectionId === item.id ? 'true' : 'false'}"
              data-action="switch-section"
              data-section-tab="true"
              data-section-id="${item.id}"
              data-focus-id="section-tab-${item.id}"
              tabindex="${run.currentSectionId === item.id ? '0' : '-1'}"
            >
              <span><strong>${escapeHtml(item.label)}</strong></span>
              <span class="muted">${escapeHtml(item.summary)}</span>
            </button>
          `).join('')}
        </div>
      </section>
      <section class="card selected-settings-card" role="tabpanel" aria-labelledby="selected-section-title">
        <div class="settings-section-head">
          <div>
            <h3 id="selected-section-title">${escapeHtml(section?.label ?? '신청 단계')}</h3>
            <p class="muted">${escapeHtml(section?.summary ?? '')}</p>
          </div>
          <span class="pill">${escapeHtml(section ? `${getSettingsBySection(section.id).length}개 항목` : '0개 항목')}</span>
        </div>
        <div class="settings-item-list settings-item-list-b">
          ${section ? getSettingsBySection(section.id).map((setting) => renderVariantBSetting(setting, run)).join('') : '<p class="muted">표시할 신청 단계가 없습니다.</p>'}
        </div>
        ${section ? renderSubmitActionForSection(section, run, 'variantB') : ''}
      </section>
    </div>
  `;
}

function renderVariantBSetting(setting, run) {
  const valueLabel = getSettingValueLabel(setting, run.settingValues[setting.id]);
  return `
    <section class="setting-row setting-row-b">
      <div class="setting-row-head">
        <div>
          <h4 id="setting-label-${setting.id}">${escapeHtml(setting.label)}</h4>
          <p class="muted">${escapeHtml(setting.description)}</p>
        </div>
        <span class="pill">${escapeHtml(valueLabel)}</span>
      </div>
      <div class="button-row compact-row">
        <button class="button button-secondary" data-action="open-setting-help" data-setting-id="${setting.id}" data-focus-id="setting-help-${setting.id}">${escapeHtml(setting.label)} 설명 보기</button>
        ${renderSettingActionButtons(setting, run, 'variantB')}
      </div>
    </section>
  `;
}

function renderSettingActionButtons(setting, run, mode) {
  if (setting.type === 'toggle') {
    return renderToggleActionButtons(setting, run, mode);
  }
  return renderChoiceActionButtons(setting, run, mode);
}

function renderToggleActionButtons(setting, run, mode) {
  const currentValue = run.settingValues[setting.id];
  if (mode === 'variantB') {
    const nextValue = currentValue === 'on' ? 'off' : 'on';
    const nextLabel = nextValue === 'on' ? '켜기' : '끄기';
    return `
      <button class="button button-ghost" data-action="toggle-setting" data-setting-id="${setting.id}" data-focus-id="toggle-setting-${setting.id}" aria-pressed="${currentValue === 'on' ? 'true' : 'false'}">
        ${escapeHtml(setting.label)} ${nextLabel}
      </button>
    `;
  }

  return `
    <button class="button button-ghost" data-action="set-choice-value" data-setting-id="${setting.id}" data-value-id="on" data-focus-id="setting-choice-${setting.id}-on" ${currentValue === 'on' ? 'aria-pressed="true"' : ''}>${escapeHtml(setting.label)} 켜기</button>
    <button class="button button-ghost" data-action="set-choice-value" data-setting-id="${setting.id}" data-value-id="off" data-focus-id="setting-choice-${setting.id}-off" ${currentValue === 'off' ? 'aria-pressed="true"' : ''}>${escapeHtml(setting.label)} 끄기</button>
  `;
}

function renderChoiceActionButtons(setting, run, mode) {
  if (mode === 'variantB') {
    return `
      <div class="setting-choice-group" role="radiogroup" aria-labelledby="setting-label-${setting.id}">
        ${setting.options.map((option) => `
          <button
            role="radio"
            class="setting-choice-button ${run.settingValues[setting.id] === option.id ? 'setting-choice-button-active' : ''}"
            aria-checked="${run.settingValues[setting.id] === option.id ? 'true' : 'false'}"
            tabindex="${run.settingValues[setting.id] === option.id ? '0' : '-1'}"
            data-action="set-choice-value"
            data-setting-choice="true"
            data-setting-id="${setting.id}"
            data-value-id="${option.id}"
            data-focus-id="setting-choice-${setting.id}-${option.id}"
          >
            ${escapeHtml(option.label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  return setting.options.map((option) => `
    <button class="button button-ghost" data-action="set-choice-value" data-setting-id="${setting.id}" data-value-id="${option.id}" data-focus-id="setting-choice-${setting.id}-${option.id}" ${run.settingValues[setting.id] === option.id ? 'aria-pressed="true"' : ''}>${escapeHtml(setting.label)} ${escapeHtml(option.label)} 선택</button>
  `).join('');
}

function renderSettingHelpModal(modal, run) {
  const setting = getSettingById(modal.settingId);
  if (!setting) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">${escapeHtml(setting.helpTitle)}</h2>
        <p id="dialog-description">${escapeHtml(setting.description)}</p>
        <dl class="meta-list compact">
          <div><dt>신청 단계</dt><dd>${escapeHtml(getSectionById(setting.sectionId)?.label ?? '')}</dd></div>
          <div><dt>현재 선택</dt><dd>${escapeHtml(getSettingValueLabel(setting, run.settingValues[setting.id]))}</dd></div>
          <div><dt>최근 확인</dt><dd>${escapeHtml(setting.changedAt)}</dd></div>
        </dl>
        <p class="muted">${escapeHtml(setting.helpBody)}</p>
        <div class="button-row">
          <button class="button button-primary" data-action="dialog-close" data-dialog-close data-focus-id="setting-dialog-close">닫기</button>
        </div>
      </div>
    </div>
  `;
}

function aggregateActualCondition(run) {
  return aggregateMetrics(run.taskResults, {
    durationSeconds: 'durationSeconds',
    hiddenDurationSeconds: 'hiddenDurationSeconds',
    totalKeyInputs: 'totalKeyInputs',
    focusChanges: 'focusChanges',
    wrongSelections: 'wrongSelections',
    contextResets: 'contextResets',
    modalEscapes: 'modalEscapes',
  });
}

function aggregateBenchmarkCondition(conditionId) {
  return aggregateSharedBenchmarkCondition({
    benchmarkResults: benchmarkResultsCheckout,
    conditionId,
  });
}

function buildExportPayload() {
  return buildSharedExportPayload({
    serviceId: 'checkout',
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actualRuns: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmarkResults: benchmarkResultsCheckout,
  });
}

function buildExportDataUrl() {
  return buildSharedExportDataUrl(buildExportPayload());
}

function buildSurveyUrl() {
  return buildSharedSurveyUrl({
    baseUrl: SURVEY_CONFIG.baseUrl,
    sessionId: state.sessionId,
    serviceId: 'checkout',
    order: state.order,
    actualA: aggregateActualCondition(state.runs.variantA),
    actualB: aggregateActualCondition(state.runs.variantB),
  });
}

function formatSigned(value, suffix = '') {
  return formatSharedSigned(value, suffix);
}
