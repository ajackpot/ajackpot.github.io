import { calendarScenario } from './data/calendar-scenario.js';
import { calendarTasks } from './data/tasks-calendar.js';
import { benchmarkResultsCalendar } from './data/benchmark-results-calendar.js';
import { createTaskLogger } from './lib/logger.js';
import {
  uniqueId,
  formatSeconds,
  escapeHtml,
  deepClone,
  formatServiceScreenButtonLabel,
  getDefaultConditionOrder,
  renderRunnerTaskRequestHtml,
  renderRunnerFooterHtml,
  renderRunnerCompletionDialogHtml,
  renderEndTaskConfirmationDialogHtml,
  renderTaskRequestVisibilitySwitchHtml,
  renderSiteNoticeHtml,
} from './lib/utils.js';
import { serviceRegistry, getServiceById } from './data/service-registry.js';
import { commonMeasurementRules } from './data/measurement-rules.js';
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
import {
  renderLanguageGuideCard as renderSharedLanguageGuideCard,
  renderServiceIntroView as renderSharedServiceIntroView,
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
import {
  getServiceProgress,
  readStoredExperimentResults,
  saveServiceRunSnapshot,
} from './lib/experiment-store.js';

const APP_MODE = getAppMode();
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-channel-fallback';
const SURVEY_CONFIG = {
  baseUrl: '',
};

const DAY_ORDER = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
};

const MEASUREMENT_RULES = commonMeasurementRules;

const SERVICE_ID = 'calendar';
const SERVICE_LABEL = '예약 캘린더';
const SERVICE_TYPES = serviceRegistry;

const SERVICE_INTRO_POINTS = [
  '예약 시간 탐색 구조에 따라 키보드 조작 부담이 얼마나 달라지는지',
  '실제 수행 기록과 사전 계산 기준이 비슷한 방향으로 움직이는지',
  '같은 실험 틀을 다른 서비스 유형에도 그대로 확장할 수 있는지',
];
const VARIANT_META = {
  variantA: {
    shortLabel: 'A',
    title: '비교안 A · 조작 부담이 큰 구조',
    subtitle: '상단 링크와 조건 선택을 지난 뒤 결과에 도달하고, 예약 시간을 다시 찾게 되는 구조',
    improvements: [
      '상단 링크와 보조 링크를 모두 지나야 결과를 만날 수 있습니다.',
      '예약 시간마다 선택과 시간 안내 보기 버튼이 나뉘어 있어 순서대로 많이 이동하게 됩니다.',
      '대화상자를 닫거나 확정하면 방금 보던 예약 시간으로 돌아가지 않고 결과 제목 근처부터 다시 찾아야 합니다.',
    ],
  },
  variantB: {
    shortLabel: 'B',
    title: '비교안 B · 개선 구조',
    subtitle: '예약 가능 시간으로 바로 이동하고, 예약 시간표에 한 번만 들어가 이동하며, 대화상자 초점 복귀를 보장하는 구조',
    improvements: [
      '예약 가능 시간으로 바로 이동할 수 있어 첫 진입 부담을 낮춥니다.',
      '예약 시간표는 한 번만 들어간 뒤 방향키로 이동합니다.',
      '대화상자를 열면 첫 동작으로 이동하고 닫으면 방금 있던 예약 시간으로 돌아갑니다.',
    ],
  },
};

const RUNNER_LABELS = {
  quickJump: '예약 가능 시간으로 바로 이동',
  footerJump: '예약 가능 시간으로 이동',
};

const GLOSSARY_ENTRIES = [
  {
    term: '비교안 A/B',
    description: '같은 과업을 두 가지 화면 구조로 비교하기 위한 화면입니다. 내용은 같고 이동 방식만 다릅니다.',
  },
  {
    term: '초점',
    description: '키보드로 현재 선택되어 있는 위치입니다. 탭 키를 누를 때 초점이 다음 요소로 이동합니다.',
  },
  {
    term: '대화상자',
    description: '예약 확인이나 취소 확인을 위해 잠깐 열리는 작은 창입니다.',
  },
  {
    term: '결과 파일(JSON)',
    description: '실험 기록을 텍스트 형태로 저장하는 파일입니다. JSON은 파일 형식 이름입니다.',
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
    selectedServiceId: null,
    view: 'home',
    benchmarkProfileFocus: 'keyboard',
    runnerTaskRequestVisible: false,
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
  const serviceId = params.get('service') || 'calendar';
  const launchPayload = launchId ? readLaunchSnapshot(launchId) : null;

  if (!launchPayload) {
    return {
      sessionId,
      conditionId,
      taskIndex,
      launchId,
      serviceId,
      showTaskRequestInRunner: false,
      focusRequest: null,
      completed: false,
      run: createConditionRuntime(conditionId),
      error: '수행에 필요한 시작 정보가 없습니다. 원래 실험 창에서 과업을 다시 여십시오.',
    };
  }

  const runtime = hydrateConditionRuntime(conditionId, launchPayload.runSnapshot);
  const task = calendarTasks[taskIndex] ?? calendarTasks[0];
  runtime.modal = null;
  runtime.isApplying = false;
  runtime.isWorking = false;
  runtime.cancelPerformedThisTask = false;
  runtime.liveStatus = '조건을 적용한 뒤 원하는 예약 시간을 여십시오.';
  const visibleAvailableSlots = getAvailableVisibleSlots(runtime);
  runtime.currentGridSlotId = visibleAvailableSlots.find((slot) => slot.id === runtime.currentGridSlotId)?.id ?? visibleAvailableSlots[0]?.id ?? null;
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
    serviceId,
    showTaskRequestInRunner: Boolean(launchPayload.runnerTaskRequestVisible),
    focusRequest: null,
    completed: false,
    run: runtime,
    error: '',
  };
}

function createConditionRuntime(variantId) {
  return {
    variantId,
    filters: defaultFilters(),
    filtersDraft: defaultFilters(),
    booking: null,
    bookingCompletion: null,
    modal: null,
    liveStatus: '필터를 적용하면 결과 수가 갱신됩니다.',
    taskResults: [],
    currentTaskLogger: null,
    currentGridSlotId: null,
    cancelPerformedThisTask: false,
    isApplying: false,
    isWorking: false,
    lastTaskCompletionNote: '',
    finalConfirmationAcknowledged: false,
    siteNotice: '',
    featurePanel: null,
    savedFeatureItems: {},
    selectedPass: 'single',
    reminderSettings: { email: true, sms: false },
  };
}

function defaultFilters() {
  return {
    serviceType: 'counseling',
    mode: 'all',
    provider: 'all',
    duration: 'all',
  };
}

function getOrCreateSessionId() {
  return getSharedSessionId({
    storageKey: STORAGE_KEY_SESSION,
    idPrefix: 'session',
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
  if (APP_MODE === 'runner') return calendarTasks[state.taskIndex] ?? null;
  return calendarTasks[state.currentTaskIndex] ?? null;
}

function hydrateConditionRuntime(variantId, snapshot = {}) {
  const runtime = createConditionRuntime(variantId);
  runtime.filters = normalizeFilters(snapshot.filters ?? runtime.filters);
  runtime.filtersDraft = {
    ...runtime.filters,
    ...(snapshot.filtersDraft ?? runtime.filtersDraft),
  };
  runtime.booking = snapshot.booking ? deepClone(snapshot.booking) : null;
  runtime.bookingCompletion = snapshot.bookingCompletion ? deepClone(snapshot.bookingCompletion) : null;
  runtime.currentGridSlotId = snapshot.currentGridSlotId ?? null;
  runtime.cancelPerformedThisTask = Boolean(snapshot.cancelPerformedThisTask);
  runtime.lastTaskCompletionNote = snapshot.lastTaskCompletionNote ?? '';
  runtime.finalConfirmationAcknowledged = Boolean(snapshot.finalConfirmationAcknowledged);
  runtime.siteNotice = snapshot.siteNotice ?? '';
  runtime.featurePanel = snapshot.featurePanel ? deepClone(snapshot.featurePanel) : null;
  runtime.savedFeatureItems = snapshot.savedFeatureItems ? deepClone(snapshot.savedFeatureItems) : {};
  runtime.selectedPass = snapshot.selectedPass ?? runtime.selectedPass;
  runtime.reminderSettings = snapshot.reminderSettings ? deepClone(snapshot.reminderSettings) : runtime.reminderSettings;
  runtime.liveStatus = snapshot.liveStatus ?? runtime.liveStatus;
  return runtime;
}

function serializeRuntimeSnapshot(run) {
  return {
    variantId: run.variantId,
    filters: deepClone(run.filters),
    filtersDraft: deepClone(run.filtersDraft),
    booking: run.booking ? deepClone(run.booking) : null,
    bookingCompletion: run.bookingCompletion ? deepClone(run.bookingCompletion) : null,
    currentGridSlotId: run.currentGridSlotId,
    cancelPerformedThisTask: run.cancelPerformedThisTask,
    lastTaskCompletionNote: run.lastTaskCompletionNote,
    finalConfirmationAcknowledged: run.finalConfirmationAcknowledged,
    siteNotice: run.siteNotice,
    featurePanel: run.featurePanel ? deepClone(run.featurePanel) : null,
    savedFeatureItems: deepClone(run.savedFeatureItems),
    selectedPass: run.selectedPass,
    reminderSettings: deepClone(run.reminderSettings),
    liveStatus: run.liveStatus,
  };
}

function applyRuntimeSnapshot(targetRun, snapshot) {
  const hydrated = hydrateConditionRuntime(targetRun.variantId, snapshot);
  targetRun.filters = hydrated.filters;
  targetRun.filtersDraft = hydrated.filtersDraft;
  targetRun.booking = hydrated.booking;
  targetRun.bookingCompletion = hydrated.bookingCompletion;
  targetRun.currentGridSlotId = hydrated.currentGridSlotId;
  targetRun.cancelPerformedThisTask = hydrated.cancelPerformedThisTask;
  targetRun.lastTaskCompletionNote = hydrated.lastTaskCompletionNote;
  targetRun.finalConfirmationAcknowledged = hydrated.finalConfirmationAcknowledged;
  targetRun.siteNotice = hydrated.siteNotice;
  targetRun.featurePanel = hydrated.featurePanel;
  targetRun.savedFeatureItems = hydrated.savedFeatureItems;
  targetRun.selectedPass = hydrated.selectedPass;
  targetRun.reminderSettings = hydrated.reminderSettings;
  targetRun.liveStatus = hydrated.liveStatus;
  targetRun.modal = null;
  targetRun.isApplying = false;
  targetRun.isWorking = false;
}

function resetExperimentState() {
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  state.order = getDefaultConditionOrder();
  state.activeLaunch = null;
  state.runnerTaskRequestVisible = false;
  state.runs.variantA = createConditionRuntime('variantA');
  state.runs.variantB = createConditionRuntime('variantB');
}

function getSelectedService() {
  if (APP_MODE === 'runner') return getServiceById(state.serviceId);
  return getServiceById(state.selectedServiceId);
}

function openService(serviceId) {
  if (APP_MODE === 'runner') return;
  const service = SERVICE_TYPES.find((item) => item.id === serviceId);
  if (!service || !service.available) return;
  if (service.path) {
    window.location.href = service.path;
    return;
  }
  state.selectedServiceId = service.id;
  resetExperimentState();
  state.view = 'serviceIntro';
  requestFocus('#service-heading');
  render();
}

function goHome() {
  if (APP_MODE === 'runner') return;
  state.selectedServiceId = null;
  resetExperimentState();
  state.view = 'home';
  requestFocus('#page-title');
  render();
}

function startExperiment() {
  if (APP_MODE === 'runner') return;
  const selectedService = getSelectedService();
  if (!selectedService || !selectedService.available) return;
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  state.order = getDefaultConditionOrder();
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
  state.view = state.selectedServiceId ? 'serviceIntro' : 'home';
  requestFocus(state.selectedServiceId ? '#service-heading' : '#page-title');
  render();
}

function prepareCurrentTaskForMain() {
  const conditionId = getCurrentConditionId();
  const task = getCurrentTask();
  if (!conditionId || !task) return;
  const run = state.runs[conditionId];
  run.modal = null;
  run.isApplying = false;
  run.isWorking = false;
  run.cancelPerformedThisTask = false;
  run.bookingCompletion = null;
  run.finalConfirmationAcknowledged = false;
  run.siteNotice = '';
  run.featurePanel = null;
  run.liveStatus = '과업 내용은 이 창에서 확인하고, 실제 수행은 새 탭에서 진행합니다.';
  const visibleAvailableSlots = getAvailableVisibleSlots(run);
  run.currentGridSlotId = visibleAvailableSlots.find((slot) => slot.id === run.currentGridSlotId)?.id ?? visibleAvailableSlots[0]?.id ?? null;
  state.activeLaunch = null;
}

function continueAfterTask() {
  if (APP_MODE === 'runner') return;
  if (state.currentTaskIndex < calendarTasks.length - 1) {
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

function buildRunnerUrl({ launchId, conditionId, taskIndex, serviceId, sessionId }) {
  return buildSharedRunnerUrl({
    currentHref: window.location.href,
    sessionId,
    serviceId,
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

  const launchId = uniqueId('launch');
  const payload = {
    launchId,
    sessionId: state.sessionId,
    serviceId: state.selectedServiceId,
    conditionId,
    taskIndex: state.currentTaskIndex,
    taskId: task.id,
    runSnapshot: serializeRuntimeSnapshot(run),
    runnerTaskRequestVisible: Boolean(state.runnerTaskRequestVisible),
  };
  saveLaunchSnapshot(launchId, payload);

  state.activeLaunch = {
    launchId,
    status: 'opening',
    lastMessage: '새 탭을 열고 있습니다. 열리지 않으면 브라우저의 팝업 차단 설정을 확인하십시오.',
  };

  const runnerWindow = window.open(
    buildRunnerUrl({
      launchId,
      conditionId,
      taskIndex: state.currentTaskIndex,
      serviceId: state.selectedServiceId,
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
    targetSlotId: task.targetSlotId,
    bookingAfterTask: deepClone(run.booking),
    cancellationPerformed: run.cancelPerformedThisTask,
    conditionId,
  });
  persistCurrentServiceProgress();

  if (state.activeLaunch) {
    state.activeLaunch.status = 'completed';
    state.activeLaunch.lastMessage = '결과를 전달받았습니다.';
    clearLaunchSnapshot(state.activeLaunch.launchId);
  }

  advanceAfterRunnerCompletion();
}

function advanceAfterRunnerCompletion() {
  state.activeLaunch = null;

  if (state.currentTaskIndex < calendarTasks.length - 1) {
    state.currentTaskIndex += 1;
    prepareCurrentTaskForMain();
    state.view = 'taskPrep';
    requestFocus('#task-prep-heading');
    render();
    return;
  }

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
  root.addEventListener('submit', handleRootSubmit);

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

function handleRootSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (APP_MODE !== 'runner') return;
  if (form.matches('[data-simulated-submit="calendar-search"]')) {
    event.preventDefault();
    const input = form.querySelector('input[type="search"]');
    const query = input instanceof HTMLInputElement ? input.value.trim() : '';
    openFeaturePanel('search', 'calendar-search-submit', { query: query || '심리 상담' });
  }
}

function handleRootClick(event) {
  const inertLink = event.target.closest('[data-inert-link="true"]');
  if (inertLink) {
    event.preventDefault();
    if (APP_MODE === 'runner') {
      const label = inertLink.textContent?.trim() || '해당';
      showSiteNotice(`${label} 기능은 현재 점검 중입니다. 이 화면 안에서 계속 진행하십시오.`);
      return;
    }
  }

  if (APP_MODE === 'runner') {
    const gridSlotButton = event.target.closest('[data-grid-slot="true"]');
    if (gridSlotButton instanceof HTMLElement) {
      event.preventDefault();
      openSlotModal(gridSlotButton.dataset.slotId, gridSlotButton.dataset.focusId, 'select');
      return;
    }
  }

  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;

  if (APP_MODE === 'main') {
    if (action === 'open-service') {
      event.preventDefault();
      openService(actionTarget.dataset.serviceId);
      return;
    }

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

    return;
  }

  if (action === 'site-placeholder') {
    event.preventDefault();
    showSiteNotice(actionTarget.dataset.notice || '해당 기능은 현재 점검 중입니다. 이 화면 안에서 계속 진행하십시오.');
    return;
  }

  if (action === 'open-feature-panel') {
    event.preventDefault();
    openFeaturePanel(actionTarget.dataset.featureId, actionTarget.dataset.focusId, {
      query: getSearchQueryFromPage(),
    });
    return;
  }

  if (action === 'close-feature-panel') {
    event.preventDefault();
    closeFeaturePanel();
    return;
  }

  if (action === 'set-provider-filter') {
    event.preventDefault();
    setDraftFilter({ provider: actionTarget.dataset.providerId || 'all' }, '상담사 조건을 입력했습니다. 조건 적용을 누르면 예약 가능 시간이 갱신됩니다.');
    return;
  }

  if (action === 'set-mode-filter') {
    event.preventDefault();
    setDraftFilter({ mode: actionTarget.dataset.modeId || 'all' }, '상담 방식 조건을 입력했습니다. 조건 적용을 누르면 예약 가능 시간이 갱신됩니다.');
    return;
  }

  if (action === 'select-pass') {
    event.preventDefault();
    selectPass(actionTarget.dataset.passId || 'single', actionTarget.dataset.focusId);
    return;
  }

  if (action === 'feature-save') {
    event.preventDefault();
    toggleFeatureSave(actionTarget.dataset.itemId || actionTarget.textContent?.trim() || 'item', actionTarget.dataset.focusId);
    return;
  }

  if (action === 'feature-message') {
    event.preventDefault();
    showFeatureActionNotice(actionTarget.dataset.notice || '요청을 접수했습니다.', actionTarget.dataset.focusId);
    return;
  }

  if (action === 'toggle-reminder') {
    event.preventDefault();
    toggleReminder(actionTarget.dataset.reminder || 'email', actionTarget.dataset.focusId);
    return;
  }

  if (action === 'end-task') {
    event.preventDefault();
    openEndTaskConfirmation();
    return;
  }

  if (action === 'confirm-end-task') {
    event.preventDefault();
    confirmEndRunnerTask();
    return;
  }

  if (action === 'cancel-end-task') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (action === 'apply-filters') {
    event.preventDefault();
    applyFilters();
    return;
  }

  if (action === 'slot-open') {
    event.preventDefault();
    const slotId = actionTarget.dataset.slotId;
    const mode = actionTarget.dataset.dialogMode || 'select';
    openSlotModal(slotId, actionTarget.dataset.focusId, mode);
    return;
  }

  if (action === 'open-cancel-modal') {
    event.preventDefault();
    openCancelModal(actionTarget.dataset.focusId);
    return;
  }

  if (action === 'dialog-close') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (action === 'dialog-confirm-slot') {
    event.preventDefault();
    confirmSlotFromModal();
    return;
  }

  if (action === 'dialog-confirm-cancel') {
    event.preventDefault();
    confirmCancelFromModal();
    return;
  }

  if (action === 'jump-results') {
    event.preventDefault();
    focusElementNow('#results-heading');
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

function handleRootChange(event) {
  const element = event.target;
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;

  if (APP_MODE === 'main') {
    if (element.name === 'runner-task-request-visible' && element instanceof HTMLInputElement) {
      state.runnerTaskRequestVisible = element.checked;
      return;
    }

    if (element.name === 'benchmark-profile') {
      state.benchmarkProfileFocus = element.value;
      render();
      return;
    }
    return;
  }

  const run = getCurrentRun();
  if (!run) return;
  if (element.name in run.filtersDraft) {
    run.filtersDraft[element.name] = element.value;
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
    if (run.modal.kind !== 'task-final') {
      closeModal();
    }
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
    const slotButton = event.target.closest('[data-grid-slot="true"]');
    if (slotButton instanceof HTMLElement) {
      handleGridNavigation(event, slotButton);
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

function showSiteNotice(message) {
  const run = getCurrentRun();
  if (!run) return;
  run.siteNotice = message;
  run.liveStatus = message;
  render();
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

function normalizeFilters(filtersDraft) {
  return {
    serviceType: filtersDraft.serviceType,
    mode: filtersDraft.mode,
    provider: filtersDraft.provider,
    duration: filtersDraft.duration === 'all' ? 'all' : Number(filtersDraft.duration),
  };
}

function applyFilters() {
  const run = getCurrentRun();
  if (!run || run.isApplying || run.isWorking) return;

  run.isApplying = true;
  run.liveStatus = '조건을 적용하는 중입니다…';
  render();

  window.setTimeout(() => {
    run.isApplying = false;
    run.filters = normalizeFilters(run.filtersDraft);
    const visibleAvailableSlots = getAvailableVisibleSlots(run);
    run.currentGridSlotId = visibleAvailableSlots.find((slot) => slot.id === run.currentGridSlotId)?.id ?? visibleAvailableSlots[0]?.id ?? null;
    const resultCount = visibleAvailableSlots.length;
    run.liveStatus = `예약 가능한 시간이 ${resultCount}개 표시되었습니다.`;

    if (state.conditionId === 'variantB') {
      requestFocus('#results-heading');
    } else {
      requestFocus('[data-focus-id="apply-criteria"]');
    }
    render();
  }, 320);
}

function openSlotModal(slotId, triggerFocusId, dialogMode = 'select') {
  const run = getCurrentRun();
  if (!run || run.isWorking) return;
  const slot = getSlotById(slotId);
  if (!slot) return;

  run.modal = {
    kind: 'slot',
    slotId,
    triggerFocusId,
    dialogMode,
  };
  run.currentTaskLogger?.note('open-slot', {
    slotId,
    dialogMode,
  });
  run.currentTaskLogger?.setModalState({
    open: true,
    containerSelector: '[data-modal-dialog]',
    triggerFocusId,
  });

  if (state.conditionId === 'variantB') {
    requestFocus('[data-dialog-primary]');
  } else {
    requestFocus('#dialog-title');
  }
  render();
}

function openCancelModal(triggerFocusId) {
  const run = getCurrentRun();
  if (!run || !run.booking || run.isWorking) return;
  run.modal = {
    kind: 'cancel-booking',
    triggerFocusId,
  };
  run.currentTaskLogger?.note('open-cancel-dialog');
  run.currentTaskLogger?.setModalState({
    open: true,
    containerSelector: '[data-modal-dialog]',
    triggerFocusId,
  });

  if (state.conditionId === 'variantB') {
    requestFocus('[data-dialog-primary]');
  } else {
    requestFocus('#dialog-title');
  }
  render();
}

function openTaskFinalModal({ title, description }) {
  const run = getCurrentRun();
  if (!run) return;
  run.modal = {
    kind: 'task-final',
    title,
    description,
    triggerFocusId: 'runner-footer-end',
  };
  run.currentTaskLogger?.setModalState({
    open: true,
    containerSelector: '[data-modal-dialog]',
    triggerFocusId: 'runner-footer-end',
  });
  requestFocus('[data-dialog-primary]');
  render();
}

function closeModal() {
  const run = getCurrentRun();
  if (!run || !run.modal) return;
  const closingModal = run.modal;
  run.modal = null;

  if (closingModal.kind === 'task-end-confirm') {
    run.currentTaskLogger?.setModalState({
      open: false,
      containerSelector: null,
      triggerFocusId: closingModal.triggerFocusId,
      closedAt: performance.now(),
    });
    requestFocus('[data-focus-id="runner-footer-end"]');
    render();
    return;
  }

  if (closingModal.kind === 'task-final') {
    run.finalConfirmationAcknowledged = true;
    run.liveStatus = '완료 확인 창을 닫았습니다. 과업이 끝났다고 판단하면 하단의 과업 종료 버튼을 누르십시오.';
    run.currentTaskLogger?.setModalState({
      open: false,
      containerSelector: null,
      triggerFocusId: closingModal.triggerFocusId,
      closedAt: performance.now(),
    });
    requestFocus('[data-focus-id="runner-footer-end"]');
    render();
    return;
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
    run.currentTaskLogger?.note('context-reset', { reason: 'dialog-closed-returned-to-results-heading' });
    requestFocus('#results-heading');
  }
  render();
}

function confirmSlotFromModal() {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !run.modal || run.modal.kind !== 'slot' || !task || run.isWorking) return;

  const closingModal = { ...run.modal };
  const slot = getSlotById(closingModal.slotId);
  if (!slot || !slot.available) {
    closeModal();
    return;
  }

  run.isWorking = true;
  render();

  window.setTimeout(() => {
    const wasCorrect = slot.id === task.targetSlotId;
    if (!wasCorrect) {
      run.currentTaskLogger?.note('wrong-selection', {
        pickedSlotId: slot.id,
        targetSlotId: task.targetSlotId,
      });
    }

    run.booking = {
      slotId: slot.id,
      taskId: task.id,
      at: new Date().toISOString(),
    };
    run.bookingCompletion = {
      slotId: slot.id,
      completedAt: new Date().toISOString(),
    };
    run.isWorking = false;
    run.modal = null;
    run.liveStatus = '예약이 완료되었습니다.';
    run.currentTaskLogger?.note('booking-confirmed', {
      slotId: slot.id,
      correct: wasCorrect,
    });
    run.currentTaskLogger?.setModalState({
      open: false,
      containerSelector: null,
      triggerFocusId: closingModal.triggerFocusId ?? null,
      closedAt: performance.now(),
    });

    requestFocus('#booking-completion-heading');
    render();
  }, 360);
}

function confirmCancelFromModal() {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !run.modal || run.modal.kind !== 'cancel-booking' || run.isWorking) return;

  const closingModal = { ...run.modal };
  run.isWorking = true;
  render();

  window.setTimeout(() => {
    run.booking = null;
    run.bookingCompletion = null;
    run.cancelPerformedThisTask = true;
    run.isWorking = false;
    run.modal = null;
    run.currentTaskLogger?.note('cancel-booking', { taskId: task?.id });
    run.currentTaskLogger?.setModalState({
      open: false,
      containerSelector: null,
      triggerFocusId: closingModal.triggerFocusId ?? null,
      closedAt: performance.now(),
    });

    run.liveStatus = '기존 예약을 취소했습니다. 새 예약 시간을 선택하십시오.';

    if (state.conditionId === 'variantB') {
      requestFocus('#booking-summary');
    } else {
      run.currentTaskLogger?.note('context-reset', { reason: 'variant-a-cancel-confirmed' });
      requestFocus('#results-heading');
    }
    render();
  }, 320);
}

function isTaskSatisfied(task, run) {
  const bookingMatches = run.booking?.slotId === task.targetSlotId;
  const completionScreenReached = run.bookingCompletion?.slotId === run.booking?.slotId;
  if (task.requiresCancellation) {
    return bookingMatches && completionScreenReached && run.cancelPerformedThisTask;
  }
  return bookingMatches && completionScreenReached;
}

function getEndTaskOutcome(task, run) {
  const success = isTaskSatisfied(task, run);
  if (success) {
    return {
      success: true,
      reason: 'participant-ended-after-service-action',
      message: '과업 수행에 성공했습니다.',
    };
  }

  let message = '예약 확정 화면에 진입하지 못했습니다.';
  if (run.booking?.slotId && run.booking.slotId !== task.targetSlotId) {
    message = '요청한 상담 예약 시간과 다른 시간을 예약했습니다.';
  } else if (run.booking?.slotId === task.targetSlotId && task.requiresCancellation && !run.cancelPerformedThisTask) {
    message = '기존 예약 취소가 완료되지 않았습니다.';
  } else if (run.booking?.slotId === task.targetSlotId && run.bookingCompletion?.slotId !== run.booking.slotId) {
    message = '예약 확정 화면에 진입하지 못했습니다.';
  }

  return {
    success: false,
    reason: 'participant-ended-incomplete-or-unable',
    message,
  };
}

function openEndTaskConfirmation() {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  if (!run || !run.currentTaskLogger || state.completed || run.modal) return;

  run.modal = {
    kind: 'task-end-confirm',
    triggerFocusId: 'runner-footer-end',
  };
  run.currentTaskLogger?.setModalState({
    open: true,
    containerSelector: '[data-modal-dialog]',
    triggerFocusId: 'runner-footer-end',
  });
  requestFocus('[data-dialog-primary]');
  render();
}

function confirmEndRunnerTask() {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger || state.completed || run.modal?.kind !== 'task-end-confirm') return;

  const outcome = getEndTaskOutcome(task, run);
  run.modal = null;

  if (!outcome.success) {
    run.currentTaskLogger.note('task-ended-incomplete', {
      taskId: task.id,
      finalConfirmationAcknowledged: run.finalConfirmationAcknowledged,
      outcomeMessage: outcome.message,
    });
  }

  finishRunnerTask(outcome.reason, outcome.success, outcome.message);
}

function endRunnerTask() {
  openEndTaskConfirmation();
}

function finishRunnerTask(reason, success = true, outcomeMessage = '') {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger) return;

  const summary = run.currentTaskLogger.finish({
    success,
    reason,
    notes: [
      `booking=${run.booking?.slotId ?? 'none'}`,
      `cancelPerformed=${run.cancelPerformedThisTask}`,
      `bookingCompletion=${run.bookingCompletion?.slotId ?? 'none'}`,
      `finalConfirmationAcknowledged=${run.finalConfirmationAcknowledged}`,
      outcomeMessage ? `outcome=${outcomeMessage}` : '',
      'measurement=first-input-visible-only',
    ].filter(Boolean),
  });

  run.currentTaskLogger = null;
  run.lastTaskCompletionNote = reason;
  run.lastOutcomeMessage = outcomeMessage;
  run.modal = null;
  state.completed = true;

  postBridgeMessage({
    type: 'task-complete',
    sessionId: state.sessionId,
    launchId: state.launchId,
    conditionId: state.conditionId,
    taskIndex: state.taskIndex,
    summary: {
      ...summary,
      outcomeMessage,
    },
    runSnapshot: serializeRuntimeSnapshot(run),
  });

  requestFocus('[data-completion-confirm]');
  render();
}

function getVisibleSlots(run) {
  return calendarScenario.slots
    .filter((slot) => {
      if (run.filters.serviceType !== 'all' && run.filters.serviceType !== 'counseling') {
        return false;
      }
      if (run.filters.mode !== 'all' && slot.mode !== run.filters.mode) {
        return false;
      }
      if (run.filters.provider !== 'all' && slot.provider !== run.filters.provider) {
        return false;
      }
      if (run.filters.duration !== 'all' && slot.duration !== run.filters.duration) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (DAY_ORDER[left.day] !== DAY_ORDER[right.day]) {
        return DAY_ORDER[left.day] - DAY_ORDER[right.day];
      }
      return left.start.localeCompare(right.start);
    });
}

function getAvailableVisibleSlots(run) {
  return getVisibleSlots(run).filter((slot) => slot.available);
}

function getSlotById(slotId) {
  return calendarScenario.slots.find((slot) => slot.id === slotId) ?? null;
}

function getProviderLabel(providerId) {
  return calendarScenario.providers.find((provider) => provider.id === providerId)?.label ?? providerId;
}

function getModeLabel(modeId) {
  return calendarScenario.modes.find((mode) => mode.id === modeId)?.label ?? modeId;
}

function formatSlotLabel(slot) {
  return `${slot.dayLabel} ${slot.start} · ${getProviderLabel(slot.provider)} · ${getModeLabel(slot.mode)} · ${slot.duration}분`;
}

function formatBookingSummary(booking) {
  if (!booking?.slotId) return '현재 예약 없음';
  const slot = getSlotById(booking.slotId);
  if (!slot) return '현재 예약 없음';
  return formatSlotLabel(slot);
}

function handleGridNavigation(event, currentButton) {
  const run = getCurrentRun();
  if (!run || !currentButton.dataset.slotId) return;
  const availableSlots = getAvailableVisibleSlots(run);
  const currentIndex = availableSlots.findIndex((slot) => slot.id === currentButton.dataset.slotId);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  const columns = 4;

  if (event.key === 'ArrowRight') nextIndex = Math.min(currentIndex + 1, availableSlots.length - 1);
  if (event.key === 'ArrowLeft') nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + columns, availableSlots.length - 1);
  if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - columns, 0);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = availableSlots.length - 1;

  if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    run.currentGridSlotId = availableSlots[nextIndex].id;
    requestFocus(`[data-grid-slot="true"][data-slot-id="${availableSlots[nextIndex].id}"]`);
    render();
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openSlotModal(currentButton.dataset.slotId, currentButton.dataset.focusId, 'select');
  }
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
    return `수행 화면 · ${task?.title ?? '예약 캘린더'}`;
  }
  if (state.view === 'home') return '과도한 키보드 조작 실험';
  if (state.view === 'serviceIntro') return '예약 캘린더 서비스 화면';
  if (state.view === 'taskPrep' || state.view === 'taskRunning') return `과업 준비 · ${getCurrentTask()?.title ?? '예약 캘린더'}`;
  if (state.view === 'taskReview') return '과업 결과 요약';
  if (state.view === 'conditionReview') return '비교안 요약';
  return '예약 캘린더 최종 비교';
}

function renderMainPage() {
  if (state.view === 'home') return renderHomeView();
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
  const visibleSlots = getVisibleSlots(run);
  const availableSlots = visibleSlots.filter((slot) => slot.available);
  const unavailableSlots = visibleSlots.filter((slot) => !slot.available);
  const task = getCurrentTask();

  return `
    <div class="runner-shell">
      <main class="runner-main" aria-label="예약 캘린더 수행 화면" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <h1 class="sr-only" id="runner-title" tabindex="-1">예약 캘린더 수행 화면</h1>
        ${state.showTaskRequestInRunner ? renderRunnerTaskRequestHtml({ goalSummary: task.goalSummary }) : ''}
        ${renderSimulatedHeader(conditionId, run)}
        ${renderFeaturePanel(run)}
        ${renderBookingCompletionCard(run)}
        ${conditionId === 'variantB' ? renderBookingPanel(run, true) : ''}
        ${renderFilters(conditionId, run)}
        ${renderResults(conditionId, run, availableSlots, unavailableSlots)}
        ${conditionId === 'variantA' ? renderBookingPanel(run, false) : ''}
      </main>
      ${state.completed ? '' : renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${state.completed ? '' : renderSiteNoticeHtml(run.siteNotice)}
      ${run.modal ? renderModal(run.modal, run, task) : ''}
      ${state.completed
        ? renderRunnerCompletionDialogHtml({
          title: run.lastOutcomeMessage || '과업 결과를 저장했습니다.',
          description: '기록을 원래 창으로 전달했습니다. 확인 버튼을 누르면 이 탭이 닫힙니다.',
        })
        : ''}
    </div>
  `;
}

function renderHomeView() {
  return `
    <header class="hero card">
      <p class="eyebrow">실험 시작 준비</p>
      <h1 id="page-title" tabindex="-1">서비스 유형 선택</h1>
      <p>
        먼저 실험할 서비스 유형을 고르십시오. 서비스별 진행 상태는 각 카드에서 확인할 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>현재 공개 범위</h2>
          <p>${SERVICE_TYPES.filter((service) => service.available).map((service) => service.label).join(' · ')}</p>
        </section>
        <section>
          <h2>진행 상태 안내</h2>
          <p class="muted">과업 기록은 브라우저에 보존되며, 나중에 설문지 연결 시 한 번에 전달할 수 있도록 서비스별로 저장됩니다.</p>
        </section>
      </div>
    </header>
    <section class="service-grid" aria-label="서비스 유형 목록">
      ${SERVICE_TYPES.map((service) => renderHomeServiceCard(service)).join('')}
    </section>
  `;
}

function renderHomeServiceCard(service) {
  const progress = getServiceProgress(service.id, {
    taskCount: service.taskCount,
    conditionCount: service.conditionCount,
  });
  const progressDetail = progress.status === 'completed'
    ? '모든 과업 기록이 저장되었습니다.'
    : progress.status === 'in-progress'
      ? `${progress.completedTaskCount}개 기록이 저장되었습니다.`
      : '저장된 과업 기록이 없습니다.';
  return `
    <article class="card service-card ${service.available ? 'service-card-available' : 'service-card-pending'}">
      <div class="service-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(service.statusLabel)}</p>
          <h2>${escapeHtml(service.label)}</h2>
        </div>
        <span class="pill ${progress.status === 'completed' ? 'pill-success' : ''}">${escapeHtml(progress.label)}</span>
      </div>
      <p>${escapeHtml(service.summary)}</p>
      <dl class="meta-list compact service-progress-list">
        <div><dt>진행 상태</dt><dd>${escapeHtml(progress.label)}</dd></div>
        <div><dt>저장 상태</dt><dd>${escapeHtml(progressDetail)}</dd></div>
      </dl>
      <div class="button-row">
        <button class="button ${service.available ? 'button-primary' : 'button-secondary'}" data-action="open-service" data-service-id="${service.id}" ${service.available ? '' : 'disabled'}>
          ${service.available ? formatServiceScreenButtonLabel(service.label) : '준비 중'}
        </button>
      </div>
    </article>
  `;
}

function renderServiceIntroView() {
  const service = getSelectedService();
  if (!service) return renderHomeView();
  return renderSharedServiceIntroView({
    serviceLabel: service.label,
    serviceSummary: service.summary,
    introPoints: SERVICE_INTRO_POINTS,
    order: state.order,
    variantMeta: VARIANT_META,
  });
}

function renderLanguageGuideCard() {
  return renderSharedLanguageGuideCard(GLOSSARY_ENTRIES);
}

function renderTaskPreparationView() {
  const task = getCurrentTask();
  const activeLaunch = state.activeLaunch;
  const isRunning = state.view === 'taskRunning';
  const screenIndex = state.currentConditionIndex + 1;

  return `
    <section class="card review-hero">
      <div>
        <p class="eyebrow">수행 준비</p>
        <h1 id="task-prep-heading" tabindex="-1">과업 ${state.currentTaskIndex + 1} 준비</h1>
        <p>아래 요청만 확인한 뒤 새 탭에서 예약 캘린더 화면을 사용하십시오.</p>
      </div>
      <div class="pill-group">
        <span class="pill">화면 ${screenIndex} / ${state.order.length}</span>
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${calendarTasks.length}</span>
      </div>
    </section>

    <section class="review-grid">
      <article class="card">
        <h2>이번 요청</h2>
        <p class="goal">${escapeHtml(task.goalSummary)}</p>
        ${renderTaskRequestVisibilitySwitchHtml({ checked: state.runnerTaskRequestVisible })}
      </article>

      <article class="card">
        <h2>진행 방법</h2>
        <ul>
          <li>수행 화면은 새 탭으로 열립니다. 과업 요청을 다시 확인해야 하면 이 창으로 돌아오십시오.</li>
          <li><strong>과업을 모두 수행했다고 판단하면 수행 탭 하단의 과업 종료 버튼을 누르십시오.</strong></li>
          <li>과업 종료 버튼을 누르면 종료 확인 대화상자가 열립니다. 예를 누르면 기록을 저장하고, 아니요를 누르면 계속 진행합니다.</li>
          <li>수행할 수 없다고 판단해도 최하단의 과업 종료 버튼을 실행하여 다음 단계로 건너뛸 수 있습니다.</li>
          <li>중간 결과는 표시하지 않고, 두 화면을 모두 마친 뒤 한 번에 결과를 보여 줍니다.</li>
        </ul>
        <div class="status-box" role="status" aria-live="polite" aria-atomic="true">
          ${escapeHtml(renderLaunchStatusMessage(activeLaunch, isRunning))}
        </div>
      </article>

      <article class="card">
        <h2>실행</h2>
        <p class="muted">새 탭에서 첫 조작이 들어간 뒤부터 수행 기록이 시작됩니다.</p>
        <div class="button-row">
          <button class="button button-primary" data-action="launch-runner">
            ${isRunning ? '수행 탭 다시 열기' : '새 탭에서 현재 화면 열기'}
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
  const benchmark = benchmarkResultsCalendar.variants[conditionId].tasks[result.benchmarkTaskId];
  const comparison = benchmarkResultsCalendar.comparisons[result.benchmarkTaskId];

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
          <div><dt>목표와 다른 시간 선택</dt><dd>${result.wrongSelections}</dd></div>
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
        <div class="benchmark-delta">
          <h3>비교안 B 예상 개선폭</h3>
          <ul>
            ${Object.entries(comparison).map(([profileId, value]) => `
              <li><strong>${escapeHtml(benchmarkResultsCalendar.overall[profileId].label)}</strong>: ${value.expectedReductionSeconds}초 감소 예상 (${value.expectedReductionPercent}%)</li>
            `).join('')}
          </ul>
        </div>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-task">
        ${state.currentTaskIndex < calendarTasks.length - 1 ? '다음 과업 준비' : '현재 비교안 요약 보기'}
      </button>
      <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
    </div>
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
      <p>${escapeHtml(VARIANT_META[conditionId].title)}의 과업을 모두 마쳤습니다.</p>
    </section>
    <section class="review-grid">
      <article class="card">
        <h2>실제 수행 합계</h2>
        <dl class="meta-list compact">
          <div><dt>총 완료 시간</dt><dd>${formatSeconds(totals.durationSeconds)}</dd></div>
          <div><dt>총 숨김 탭 제외 시간</dt><dd>${formatSeconds(totals.hiddenDurationSeconds)}</dd></div>
          <div><dt>총 키 입력</dt><dd>${totals.totalKeyInputs}</dd></div>
          <div><dt>총 초점 이동</dt><dd>${totals.focusChanges}</dd></div>
          <div><dt>목표와 다른 시간 선택</dt><dd>${totals.wrongSelections}</dd></div>
          <div><dt>위치 다시 찾기</dt><dd>${totals.contextResets}</dd></div>
          <div><dt>예약 취소 횟수</dt><dd>${totals.bookingCancels}</dd></div>
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
        <h2>저장된 과업 기록</h2>
        <ol>
          ${run.taskResults.map((result, index) => `<li><strong>${escapeHtml(calendarTasks[index].title)}</strong> — ${formatSeconds(result.durationSeconds)}, 키 ${result.totalKeyInputs}회, 초점 이동 ${result.focusChanges}회</li>`).join('')}
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
  const surveyUrl = buildSurveyUrl();

  return `
    <section class="card review-hero">
      <p class="eyebrow">예약 캘린더 실험 완료</p>
      <h1 id="final-summary-heading" tabindex="-1">비교안 A/B 최종 비교</h1>
      <p>실제 기록과 사전 계산 기준을 함께 보면서, 다음 서비스 유형으로 확장할 때 다시 쓸 기준점과 키보드 점검 기준을 마련했습니다.</p>
    </section>
    <section class="card toolbar-card">
      <label>
        <span>비교 기준 사용자 유형</span>
        <select name="benchmark-profile">
          ${Object.entries(benchmarkResultsCalendar.overall).map(([profileId, profile]) => `
            <option value="${profileId}" ${profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>
          `).join('')}
        </select>
      </label>
      <p class="muted">결과 파일(JSON)을 내려받아 설문 응답과 함께 보관할 수 있습니다.</p>
      <div class="button-row">
        <a class="button button-secondary" download="reservation-calendar-results.json" href="${exportUrl}">결과 파일(JSON) 내려받기</a>
        ${surveyUrl ? `<a class="button button-primary" href="${surveyUrl}" target="_blank" rel="noreferrer">설문지로 결과 전달</a>` : '<span class="muted">설문지 주소를 설정하면 전달 링크가 나타납니다.</span>'}
      </div>
    </section>
    <section class="comparison-grid">
      ${renderFinalConditionCard('variantA', actualA, selectedProfileId)}
      ${renderFinalConditionCard('variantB', actualB, selectedProfileId)}
    </section>
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
          <tr><th>목표와 다른 시간 선택</th><td>${actualA.wrongSelections}</td><td>${actualB.wrongSelections}</td><td>${formatSigned(actualB.wrongSelections - actualA.wrongSelections)}</td></tr>
          <tr><th>위치 다시 찾기</th><td>${actualA.contextResets}</td><td>${actualB.contextResets}</td><td>${formatSigned(actualB.contextResets - actualA.contextResets)}</td></tr>
          <tr><th>수행 불가능 기록</th><td>${actualA.incompleteCount}</td><td>${actualB.incompleteCount}</td><td>${formatSigned(actualB.incompleteCount - actualA.incompleteCount)}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="card">
      <h2>기록 확인 안내</h2>
      <ul>
        <li>과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</li>
        <li>과업 종료 버튼을 너무 일찍 누른 기록은 수행 불가능 기록으로 표시됩니다.</li>
      </ul>
      <div class="button-row">
        <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
      </div>
    </section>
  `;
}

function renderFinalConditionCard(conditionId, actualTotals, selectedProfileId) {
  return renderSharedFinalConditionCard({
    conditionId,
    actualTotals,
    selectedProfileId,
    benchmarkResults: benchmarkResultsCalendar,
    variantMeta: VARIANT_META,
  });
}

function renderSimulatedHeader(conditionId, run) {
  const links = [
    { label: '처음 화면', featureId: 'home' },
    { label: '상담사 소개', featureId: 'providers' },
    { label: '이용권', featureId: 'passes' },
    { label: '이용 후기', featureId: 'reviews' },
    { label: '가격 안내', featureId: 'pricing' },
    { label: '자주 묻는 질문', featureId: 'faq' },
    { label: '운영 정책', featureId: 'policy' },
    { label: '문의', featureId: 'support' },
  ];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <div class="sim-topbar">
        <a href="#" class="brand-link" data-action="open-feature-panel" data-feature-id="home" data-focus-id="brand-home">온마음 상담</a>
        <form class="sim-search" role="search" aria-label="상담 검색" data-simulated-submit="calendar-search">
          <label class="sr-only" for="calendar-search-input">상담사나 프로그램 검색</label>
          <input id="calendar-search-input" type="search" value="${escapeHtml(run.featurePanel?.query || '심리 상담')}" data-focus-id="calendar-search-input">
          <button class="button button-ghost" type="submit" data-action="open-feature-panel" data-feature-id="search" data-focus-id="calendar-search-submit">검색</button>
        </form>
        <div class="sim-actions">
          <button class="button button-ghost" data-action="open-feature-panel" data-feature-id="notifications" data-focus-id="calendar-notice">알림</button>
          <button class="button button-ghost" data-action="open-feature-panel" data-feature-id="my-counseling" data-focus-id="calendar-my">내 상담</button>
        </div>
      </div>
      <nav aria-label="서비스 보조 내비게이션">
        ${links.map((item, index) => `<a href="#" class="nav-link" data-action="open-feature-panel" data-feature-id="${escapeHtml(item.featureId)}" data-focus-id="nav-${index + 1}">${escapeHtml(item.label)}</a>`).join('')}
      </nav>
    </header>
  `;
}

function getSearchQueryFromPage() {
  const input = document.querySelector('#calendar-search-input');
  return input instanceof HTMLInputElement ? input.value.trim() : '';
}

function openFeaturePanel(featureId, triggerFocusId = '', options = {}) {
  const run = getCurrentRun();
  if (!run || !featureId) return;
  run.featurePanel = {
    featureId,
    triggerFocusId,
    query: options.query || run.featurePanel?.query || '심리 상담',
  };
  run.siteNotice = '';
  requestFocus('#feature-panel-title');
  render();
}

function closeFeaturePanel() {
  const run = getCurrentRun();
  if (!run || !run.featurePanel) return;
  const triggerFocusId = run.featurePanel.triggerFocusId;
  run.featurePanel = null;
  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
}

function setDraftFilter(partialFilters, message) {
  const run = getCurrentRun();
  if (!run) return;
  run.filtersDraft = {
    ...run.filtersDraft,
    ...partialFilters,
  };
  run.siteNotice = message;
  run.liveStatus = message;
  requestFocus('[data-focus-id="apply-criteria"]');
  render();
}

function showFeatureActionNotice(message, focusId = '') {
  const run = getCurrentRun();
  if (!run) return;
  run.siteNotice = message;
  run.liveStatus = message;
  if (focusId) {
    requestFocus(`[data-focus-id="${focusId}"]`);
  }
  render();
}

function selectPass(passId, focusId = '') {
  const run = getCurrentRun();
  if (!run) return;
  run.selectedPass = passId;
  showFeatureActionNotice('이용권을 선택했습니다. 예약 단계에서 선택한 이용권을 사용할 수 있습니다.', focusId);
}

function toggleFeatureSave(itemId, focusId = '') {
  const run = getCurrentRun();
  if (!run) return;
  run.savedFeatureItems[itemId] = !run.savedFeatureItems[itemId];
  showFeatureActionNotice(run.savedFeatureItems[itemId] ? '보관함에 저장했습니다.' : '보관함에서 제거했습니다.', focusId);
}

function toggleReminder(reminderId, focusId = '') {
  const run = getCurrentRun();
  if (!run) return;
  run.reminderSettings[reminderId] = !run.reminderSettings[reminderId];
  const label = reminderId === 'sms' ? '문자 알림' : '이메일 알림';
  showFeatureActionNotice(`${label}을 ${run.reminderSettings[reminderId] ? '켰습니다' : '껐습니다'}.`, focusId);
}

function getNextAvailableSlotForProvider(providerId) {
  return calendarScenario.slots.find((slot) => slot.provider === providerId && slot.available) ?? null;
}

function renderFeaturePanel(run) {
  if (!run.featurePanel) return '';
  const { featureId } = run.featurePanel;
  const content = renderFeaturePanelContent(featureId, run);
  if (!content) return '';
  return `
    <section class="card feature-panel" aria-labelledby="feature-panel-title" data-feature-panel>
      ${content}
      <div class="button-row feature-panel-actions">
        <button class="button button-secondary" data-action="close-feature-panel" data-focus-id="feature-panel-close">이 영역 닫기</button>
      </div>
    </section>
  `;
}

function renderFeaturePanelContent(featureId, run) {
  if (featureId === 'home') return renderHomeFeaturePanel();
  if (featureId === 'providers') return renderProvidersFeaturePanel(run);
  if (featureId === 'passes') return renderPassesFeaturePanel(run);
  if (featureId === 'reviews') return renderReviewsFeaturePanel(run);
  if (featureId === 'pricing') return renderPricingFeaturePanel();
  if (featureId === 'faq') return renderFaqFeaturePanel();
  if (featureId === 'policy' || featureId === 'change-policy') return renderPolicyFeaturePanel(featureId);
  if (featureId === 'support') return renderSupportFeaturePanel();
  if (featureId === 'notifications') return renderNotificationsFeaturePanel(run);
  if (featureId === 'my-counseling') return renderMyCounselingFeaturePanel(run);
  if (featureId === 'usage-guide') return renderUsageGuideFeaturePanel();
  if (featureId === 'search') return renderSearchFeaturePanel(run);
  if (featureId === 'receipt') return renderReceiptFeaturePanel();
  return '';
}

function renderHomeFeaturePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">온마음 상담</p>
      <h2 id="feature-panel-title" tabindex="-1">처음 화면</h2>
      <p class="muted">오늘 운영 시간은 09:00부터 18:00까지입니다. 비대면 상담은 예약 시간 10분 전부터 입장할 수 있습니다.</p>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <h3>최근 공지</h3>
        <ul>
          <li>4월 셋째 주 야간 상담 일부 시간이 추가되었습니다.</li>
          <li>비대면 상담 전 카메라와 마이크 상태를 미리 확인해 주십시오.</li>
        </ul>
      </article>
      <article class="mini-card">
        <h3>빠른 메뉴</h3>
        <div class="button-row compact-row">
          <button class="button button-secondary" data-action="open-feature-panel" data-feature-id="providers" data-focus-id="home-providers">상담사 보기</button>
          <button class="button button-secondary" data-action="open-feature-panel" data-feature-id="faq" data-focus-id="home-faq">자주 묻는 질문</button>
        </div>
      </article>
    </div>
  `;
}

function renderProvidersFeaturePanel(run) {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">상담사 소개</p>
      <h2 id="feature-panel-title" tabindex="-1">상담사별 안내</h2>
      <p class="muted">상담 분야와 다음 예약 가능 시간을 확인할 수 있습니다.</p>
    </div>
    <div class="feature-grid">
      ${calendarScenario.providers.map((provider) => {
        const nextSlot = getNextAvailableSlotForProvider(provider.id);
        const specialties = {
          kim: '불안, 수면, 직장 스트레스',
          lee: '관계, 의사소통, 청년 상담',
          park: '가족, 진로, 심리검사 해석',
        }[provider.id] || '일반 상담';
        return `
          <article class="mini-card">
            <h3>${escapeHtml(provider.label)}</h3>
            <p>${escapeHtml(specialties)}</p>
            <p class="muted">다음 예약 가능 시간: ${nextSlot ? escapeHtml(formatSlotLabel(nextSlot)) : '확인 필요'}</p>
            <div class="button-row compact-row">
              <button class="button button-secondary" data-action="set-provider-filter" data-provider-id="${escapeHtml(provider.id)}" data-focus-id="provider-${escapeHtml(provider.id)}-schedule">이 상담사 일정 보기</button>
              <button class="button button-ghost" data-action="feature-save" data-item-id="provider-${escapeHtml(provider.id)}" data-focus-id="provider-${escapeHtml(provider.id)}-save">${run.savedFeatureItems[`provider-${provider.id}`] ? '보관 해제' : '소개 보관'}</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderPassesFeaturePanel(run) {
  const passes = [
    { id: 'single', title: '1회 상담권', price: '55,000원', description: '처음 상담하거나 일정이 불규칙한 경우에 적합합니다.' },
    { id: 'three', title: '3회 묶음권', price: '156,000원', description: '2주 안에 여러 번 상담할 예정인 경우에 사용할 수 있습니다.' },
    { id: 'student', title: '청년 할인권', price: '42,000원', description: '만 24세 이하 또는 재학 증빙이 있는 이용자 대상입니다.' },
  ];
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">이용권</p>
      <h2 id="feature-panel-title" tabindex="-1">이용권 선택</h2>
      <p class="muted">선택한 이용권은 예약 확인 화면에서 사용할 수 있습니다.</p>
    </div>
    <div class="feature-grid">
      ${passes.map((pass) => `
        <article class="mini-card ${run.selectedPass === pass.id ? 'mini-card-selected' : ''}">
          <h3>${escapeHtml(pass.title)}</h3>
          <p><strong>${escapeHtml(pass.price)}</strong></p>
          <p>${escapeHtml(pass.description)}</p>
          <button class="button ${run.selectedPass === pass.id ? 'button-primary' : 'button-secondary'}" data-action="select-pass" data-pass-id="${escapeHtml(pass.id)}" data-focus-id="pass-${escapeHtml(pass.id)}">
            ${run.selectedPass === pass.id ? '선택됨' : '선택'}
          </button>
        </article>
      `).join('')}
    </div>
  `;
}

function renderReviewsFeaturePanel(run) {
  const reviews = [
    { id: 'review-1', title: '첫 상담 전 긴장이 줄었습니다', body: '예약 전 안내가 자세해서 준비물을 미리 확인할 수 있었습니다.' },
    { id: 'review-2', title: '퇴근 후 비대면 상담이 편했습니다', body: '상담 전 알림과 접속 안내가 같이 와서 늦지 않게 들어갔습니다.' },
    { id: 'review-3', title: '일정 변경이 필요할 때 도움이 됐습니다', body: '가능한 시간이 한눈에 보여서 다른 날짜를 고르기 쉬웠습니다.' },
  ];
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">이용 후기</p>
      <h2 id="feature-panel-title" tabindex="-1">최근 이용 후기</h2>
    </div>
    <div class="feature-list">
      ${reviews.map((review) => `
        <article class="mini-card">
          <h3>${escapeHtml(review.title)}</h3>
          <p>${escapeHtml(review.body)}</p>
          <button class="button button-ghost" data-action="feature-save" data-item-id="${escapeHtml(review.id)}" data-focus-id="${escapeHtml(review.id)}-save">${run.savedFeatureItems[review.id] ? '보관 해제' : '후기 보관'}</button>
        </article>
      `).join('')}
    </div>
  `;
}

function renderPricingFeaturePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">가격 안내</p>
      <h2 id="feature-panel-title" tabindex="-1">상담 비용</h2>
      <p class="muted">실제 결제는 예약 확정 뒤 안내됩니다.</p>
    </div>
    <table class="summary-table compact-table">
      <thead><tr><th>구분</th><th>30분</th><th>45분</th></tr></thead>
      <tbody>
        <tr><th>비대면 상담</th><td>55,000원</td><td>72,000원</td></tr>
        <tr><th>대면 상담</th><td>60,000원</td><td>78,000원</td></tr>
        <tr><th>청년 할인</th><td>42,000원</td><td>58,000원</td></tr>
      </tbody>
    </table>
  `;
}

function renderFaqFeaturePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">자주 묻는 질문</p>
      <h2 id="feature-panel-title" tabindex="-1">예약 전 확인할 내용</h2>
    </div>
    <div class="feature-list">
      <details class="mini-card"><summary>비대면 상담은 어떻게 들어가나요?</summary><p>예약 시간 10분 전부터 내 상담 메뉴에서 입장 버튼이 표시됩니다.</p></details>
      <details class="mini-card"><summary>예약 변경은 언제까지 가능한가요?</summary><p>상담 시작 6시간 전까지 직접 변경할 수 있습니다.</p></details>
      <details class="mini-card"><summary>상담사에게 남길 말을 미리 적을 수 있나요?</summary><p>예약 확정 뒤 내 상담 메뉴에서 상담 전 메모를 남길 수 있습니다.</p></details>
    </div>
  `;
}

function renderPolicyFeaturePanel(featureId) {
  const isChangePolicy = featureId === 'change-policy';
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">${isChangePolicy ? '변경 기준' : '운영 정책'}</p>
      <h2 id="feature-panel-title" tabindex="-1">${isChangePolicy ? '예약 변경과 취소 기준' : '서비스 운영 정책'}</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>변경 가능 시간</h3><p>상담 시작 6시간 전까지 같은 주의 다른 시간으로 변경할 수 있습니다.</p></article>
      <article class="mini-card"><h3>취소와 환불</h3><p>상담 시작 24시간 전 취소는 전액 환불, 이후 취소는 이용권으로 전환됩니다.</p></article>
      <article class="mini-card"><h3>개인정보 보관</h3><p>상담 기록은 법정 보관 기간과 이용자 요청 기준에 따라 분리 보관됩니다.</p></article>
    </div>
  `;
}

function renderSupportFeaturePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">문의</p>
      <h2 id="feature-panel-title" tabindex="-1">고객센터</h2>
      <p class="muted">운영 시간 안에는 평균 20분 안에 답변합니다.</p>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <h3>문의 남기기</h3>
        <label><span>문의 종류</span><select><option>예약 변경</option><option>결제</option><option>상담사 문의</option></select></label>
        <label><span>문의 내용</span><textarea rows="3">예약 전에 확인하고 싶은 내용이 있습니다.</textarea></label>
        <button class="button button-primary" data-action="feature-message" data-notice="문의가 접수되었습니다. 답변은 알림에서 확인할 수 있습니다." data-focus-id="support-submit">문의 접수</button>
      </article>
      <article class="mini-card">
        <h3>빠른 연결</h3>
        <p>전화 상담: 02-0000-1200</p>
        <p>이메일: help@example.test</p>
        <button class="button button-secondary" data-action="site-placeholder" data-notice="실시간 채팅 연결은 현재 점검 중입니다. 문의 접수나 전화 상담을 이용하십시오." data-focus-id="support-chat">실시간 채팅 열기</button>
      </article>
    </div>
  `;
}

function renderNotificationsFeaturePanel(run) {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">알림</p>
      <h2 id="feature-panel-title" tabindex="-1">알림함</h2>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <h3>최근 알림</h3>
        <ul>
          <li>4월 셋째 주 상담 가능 시간이 추가되었습니다.</li>
          <li>비대면 상담 전 준비 안내가 갱신되었습니다.</li>
          <li>이용권 만료 7일 전 알림을 받을 수 있습니다.</li>
        </ul>
      </article>
      <article class="mini-card">
        <h3>알림 받는 방법</h3>
        <div class="button-row compact-row">
          <button class="button ${run.reminderSettings.email ? 'button-primary' : 'button-secondary'}" data-action="toggle-reminder" data-reminder="email" data-focus-id="reminder-email">이메일 ${run.reminderSettings.email ? '켜짐' : '꺼짐'}</button>
          <button class="button ${run.reminderSettings.sms ? 'button-primary' : 'button-secondary'}" data-action="toggle-reminder" data-reminder="sms" data-focus-id="reminder-sms">문자 ${run.reminderSettings.sms ? '켜짐' : '꺼짐'}</button>
        </div>
      </article>
    </div>
  `;
}

function renderMyCounselingFeaturePanel(run) {
  const bookingText = formatBookingSummary(run.booking);
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">내 상담</p>
      <h2 id="feature-panel-title" tabindex="-1">내 상담 현황</h2>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <h3>다가오는 상담</h3>
        <p>${escapeHtml(bookingText)}</p>
        <div class="button-row compact-row">
          <button class="button button-secondary" data-action="open-feature-panel" data-feature-id="usage-guide" data-focus-id="my-guide">상담 전 안내 보기</button>
          <button class="button button-ghost" data-action="open-feature-panel" data-feature-id="receipt" data-focus-id="my-receipt">결제 내역 보기</button>
        </div>
      </article>
      <article class="mini-card">
        <h3>최근 이용 내역</h3>
        <ul>
          <li>3월 28일 비대면 상담 30분 완료</li>
          <li>3월 14일 대면 상담 45분 완료</li>
        </ul>
      </article>
    </div>
  `;
}

function renderUsageGuideFeaturePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">이용 안내</p>
      <h2 id="feature-panel-title" tabindex="-1">상담 전 준비 안내</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>비대면 상담</h3><p>조용한 장소, 이어폰, 안정적인 인터넷 연결을 준비하십시오.</p></article>
      <article class="mini-card"><h3>대면 상담</h3><p>상담 시작 10분 전까지 센터에 도착하면 접수대에서 안내받을 수 있습니다.</p></article>
      <article class="mini-card"><h3>상담 메모</h3><p>최근에 힘들었던 일이나 상담에서 다루고 싶은 주제를 간단히 적어 두면 도움이 됩니다.</p></article>
    </div>
  `;
}

function renderSearchFeaturePanel(run) {
  const query = run.featurePanel?.query || '심리 상담';
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">검색 결과</p>
      <h2 id="feature-panel-title" tabindex="-1">${escapeHtml(query)} 검색 결과</h2>
      <p class="muted">예약 가능한 상담 프로그램과 상담사 정보를 함께 보여 줍니다.</p>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <h3>비대면 심리 상담</h3>
        <p>집이나 직장에서 화상으로 상담을 받을 수 있습니다.</p>
        <button class="button button-secondary" data-action="set-mode-filter" data-mode-id="remote" data-focus-id="search-remote-filter">비대면 조건 입력</button>
      </article>
      <article class="mini-card">
        <h3>대면 심리 상담</h3>
        <p>센터 상담실에서 진행하는 상담입니다.</p>
        <button class="button button-secondary" data-action="set-mode-filter" data-mode-id="clinic" data-focus-id="search-clinic-filter">대면 조건 입력</button>
      </article>
      <article class="mini-card">
        <h3>상담사 이름으로 찾기</h3>
        <p>상담사 소개에서 분야와 가능한 시간을 볼 수 있습니다.</p>
        <button class="button button-ghost" data-action="open-feature-panel" data-feature-id="providers" data-focus-id="search-providers">상담사 소개 보기</button>
      </article>
    </div>
  `;
}

function renderReceiptFeaturePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">결제 내역</p>
      <h2 id="feature-panel-title" tabindex="-1">최근 결제 내역</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>3월 28일 비대면 상담</h3><p>결제 금액 55,000원 · 카드 결제 완료</p><button class="button button-ghost" data-action="feature-message" data-notice="영수증 내려받기를 준비했습니다." data-focus-id="receipt-download">영수증 내려받기</button></article>
      <article class="mini-card"><h3>3월 14일 대면 상담</h3><p>결제 금액 78,000원 · 카드 결제 완료</p></article>
    </div>
  `;
}

function renderFilters(conditionId, run) {
  const providerOptions = ['all', ...calendarScenario.providers.map((provider) => provider.id)];
  const durationOptions = ['all', ...calendarScenario.durations.map((duration) => String(duration))];
  return `
    <section class="card filters-card ${conditionId === 'variantA' ? 'filters-a' : 'filters-b'}">
      <div class="filters-header">
        <div>
          <h2 id="filters-heading">조건 선택</h2>
        </div>
      </div>
      <div class="filters-grid">
        <label>
          <span>서비스 종류</span>
          <select name="serviceType" data-focus-id="filter-service">
            ${calendarScenario.serviceTypes.map((serviceType) => `
              <option value="${serviceType.id}" ${run.filtersDraft.serviceType === serviceType.id ? 'selected' : ''}>${escapeHtml(serviceType.label)}</option>
            `).join('')}
          </select>
        </label>
        <label>
          <span>상담 방식</span>
          <select name="mode" data-focus-id="filter-mode">
            <option value="all" ${run.filtersDraft.mode === 'all' ? 'selected' : ''}>전체</option>
            ${calendarScenario.modes.map((mode) => `
              <option value="${mode.id}" ${run.filtersDraft.mode === mode.id ? 'selected' : ''}>${escapeHtml(mode.label)}</option>
            `).join('')}
          </select>
        </label>
        <label>
          <span>상담사</span>
          <select name="provider" data-focus-id="filter-provider">
            ${providerOptions.map((providerId) => `
              <option value="${providerId}" ${run.filtersDraft.provider === providerId ? 'selected' : ''}>
                ${providerId === 'all' ? '전체 상담사' : escapeHtml(getProviderLabel(providerId))}
              </option>
            `).join('')}
          </select>
        </label>
        <label>
          <span>상담 시간</span>
          <select name="duration" data-focus-id="filter-duration">
            ${durationOptions.map((durationValue) => `
              <option value="${durationValue}" ${String(run.filtersDraft.duration) === String(durationValue) ? 'selected' : ''}>
                ${durationValue === 'all' ? '전체 시간' : `${durationValue}분`}
              </option>
            `).join('')}
          </select>
        </label>
      </div>
      <div class="button-row">
        <a href="#" class="inline-link" data-action="open-feature-panel" data-feature-id="change-policy" data-focus-id="policy-link">변경 기준 보기</a>
        <a href="#" class="inline-link" data-action="open-feature-panel" data-feature-id="usage-guide" data-focus-id="support-link">이용 안내 보기</a>
        <button class="button button-primary" data-action="apply-filters" data-focus-id="apply-criteria" ${run.isApplying ? 'disabled' : ''}>
          ${run.isApplying ? '적용 중…' : '조건 적용'}
        </button>
      </div>
    </section>
  `;
}

function renderResults(conditionId, run, availableSlots, unavailableSlots) {
  return `
    <section class="card results-card">
      <div class="results-header">
        <div>
          <h2 id="results-heading" tabindex="-1">예약 가능 시간</h2>
          <p class="muted">예약 가능한 시간 ${availableSlots.length}개 · 예약할 수 없는 시간 ${unavailableSlots.length}개</p>
        </div>
      </div>
      ${conditionId === 'variantA'
        ? renderVariantAResults(availableSlots, unavailableSlots)
        : renderVariantBResults(run, availableSlots, unavailableSlots)}
    </section>
  `;
}

function renderVariantAResults(availableSlots, unavailableSlots) {
  if (availableSlots.length === 0 && unavailableSlots.length === 0) {
    return '<p class="muted">현재 조건에 맞는 예약 시간이 없습니다.</p>';
  }
  return `
    <ul class="slot-list slot-list-a">
      ${availableSlots.map((slot) => `
        <li class="slot-row">
          <div>
            <strong>${escapeHtml(formatSlotLabel(slot))}</strong>
            <p class="muted">예약 가능한 시간</p>
          </div>
          <div class="button-row compact-row">
            <button class="button button-secondary" data-action="slot-open" data-slot-id="${slot.id}" data-dialog-mode="select" data-focus-id="slot-${slot.id}-select">선택</button>
            <button class="button button-ghost" data-action="slot-open" data-slot-id="${slot.id}" data-dialog-mode="details" data-focus-id="slot-${slot.id}-details">시간 안내 보기</button>
          </div>
        </li>
      `).join('')}
      ${unavailableSlots.map((slot) => `
        <li class="slot-row slot-row-unavailable">
          <div>
            <strong>${escapeHtml(formatSlotLabel(slot))}</strong>
            <p class="muted">지금은 예약할 수 없음</p>
          </div>
          <div class="button-row compact-row">
            <span class="pill pill-warning">예약 마감</span>
            <button class="button button-ghost" data-action="slot-open" data-slot-id="${slot.id}" data-dialog-mode="details" data-focus-id="slot-${slot.id}-details">시간 안내 보기</button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function renderVariantBResults(run, availableSlots, unavailableSlots) {
  if (availableSlots.length === 0 && unavailableSlots.length === 0) {
    return '<p class="muted">현재 조건에 맞는 예약 시간이 없습니다.</p>';
  }
  const rows = chunkArray(availableSlots, 4);
  return `
    ${availableSlots.length === 0 ? '<p class="muted">예약 가능한 시간은 없고, 아래에 예약할 수 없는 시간만 표시됩니다.</p>' : ''}
    <div role="grid" aria-label="예약 가능한 시간표" class="slot-grid" data-grid-root>
      ${rows.map((row) => `
        <div role="row" class="slot-grid-row">
          ${row.map((slot) => `
            <div role="gridcell" class="slot-grid-cell">
              <button
                class="slot-grid-button ${run.currentGridSlotId === slot.id ? 'slot-grid-button-active' : ''}"
                data-action="slot-open"
                data-dialog-mode="select"
                data-grid-slot="true"
                data-slot-id="${slot.id}"
                data-focus-id="grid-slot-${slot.id}"
                tabindex="${run.currentGridSlotId === slot.id ? '0' : '-1'}"
                aria-label="${escapeHtml(formatSlotLabel(slot))}"
              >
                <span class="slot-day">${escapeHtml(slot.dayLabel)}</span>
                <strong>${escapeHtml(slot.start)}</strong>
                <span class="slot-provider">${escapeHtml(getProviderLabel(slot.provider))}</span>
                <span class="slot-mode">${escapeHtml(getModeLabel(slot.mode))} · ${slot.duration}분</span>
              </button>
            </div>
          `).join('')}
          ${Array.from({ length: Math.max(0, 4 - row.length) }).map(() => '<div role="presentation" class="slot-grid-cell slot-grid-cell-empty"></div>').join('')}
        </div>
      `).join('')}
    </div>
    ${unavailableSlots.length > 0 ? `
      <section class="unavailable-card">
        <h3>예약이 마감된 시간</h3>
        <ul class="chip-list">
          ${unavailableSlots.map((slot) => `<li>${escapeHtml(formatSlotLabel(slot))}</li>`).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

function renderBookingCompletionCard(run) {
  if (!run.bookingCompletion?.slotId) return '';
  const slot = getSlotById(run.bookingCompletion.slotId);
  if (!slot) return '';
  return `
    <section class="card booking-completion-card" aria-labelledby="booking-completion-heading">
      <p class="eyebrow">예약 완료</p>
      <h2 id="booking-completion-heading" tabindex="-1">예약이 완료되었습니다</h2>
      <p class="goal">${escapeHtml(formatSlotLabel(slot))}</p>
      <p class="muted">예약 내용은 현재 예약 내용 영역에서 확인할 수 있으며, 필요한 경우 그 영역에서 취소할 수 있습니다.</p>
    </section>
  `;
}

function renderBookingPanel(run, emphasized) {
  return `
    <section class="card booking-card ${emphasized ? 'booking-card-emphasized' : ''}">
      <h2 id="booking-summary" tabindex="-1">현재 예약 내용</h2>
      <p>${escapeHtml(formatBookingSummary(run.booking))}</p>
      <div class="button-row">
        ${run.booking ? `
          <button class="button button-secondary" data-action="open-cancel-modal" data-focus-id="current-booking-cancel">현재 예약 취소</button>
        ` : '<span class="muted">아직 취소할 예약이 없습니다.</span>'}
      </div>
    </section>
  `;
}

function renderModal(modal, run, task) {
  if (modal.kind === 'task-end-confirm') {
    return renderEndTaskConfirmationDialogHtml();
  }

  if (modal.kind === 'task-final') {
    return `
      <div class="modal-backdrop">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
          <h2 id="dialog-title" tabindex="-1">${escapeHtml(modal.title)}</h2>
          <p id="dialog-description">${escapeHtml(modal.description)}</p>
          <div class="button-row">
            <button class="button button-primary" data-action="dialog-close" data-dialog-primary data-focus-id="task-final-confirm">확인</button>
          </div>
        </div>
      </div>
    `;
  }

  if (modal.kind === 'cancel-booking') {
    return `
      <div class="modal-backdrop">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
          <h2 id="dialog-title" tabindex="-1">현재 예약을 취소하시겠습니까?</h2>
          <p id="dialog-description">${escapeHtml(formatBookingSummary(run.booking))}</p>
          <div class="button-row">
            <button class="button button-ghost" data-action="dialog-close" data-focus-id="cancel-dialog-close">닫기</button>
            <button class="button button-primary" data-action="dialog-confirm-cancel" data-dialog-primary data-focus-id="cancel-dialog-confirm">
              ${run.isWorking ? '취소 중…' : '예약 취소'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const slot = getSlotById(modal.slotId);
  if (!slot) return '';
  const actionLabel = run.booking ? '변경 확정' : '예약 확정';
  const modeLabel = modal.dialogMode === 'details' ? '시간 안내' : '예약 확인';
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">${escapeHtml(modeLabel)} · ${escapeHtml(formatSlotLabel(slot))}</h2>
        <p id="dialog-description">${slot.available ? '예약 가능한 시간입니다.' : '지금은 예약할 수 없는 시간입니다.'}</p>
        <div class="button-row">
          <button class="button button-ghost" data-action="dialog-close" data-focus-id="slot-dialog-close">닫기</button>
          ${slot.available ? `
            <button class="button button-primary" data-action="dialog-confirm-slot" data-dialog-primary data-focus-id="slot-dialog-confirm" ${run.isWorking ? 'disabled' : ''}>
              ${run.isWorking ? '저장 중…' : escapeHtml(actionLabel)}
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function aggregateActualCondition(run) {
  const totals = aggregateMetrics(run.taskResults, {
    durationSeconds: 'durationSeconds',
    hiddenDurationSeconds: 'hiddenDurationSeconds',
    totalKeyInputs: 'totalKeyInputs',
    focusChanges: 'focusChanges',
    wrongSelections: 'wrongSelections',
    contextResets: 'contextResets',
    modalEscapes: 'modalEscapes',
    bookingCancels: 'bookingCancels',
  });
  totals.successCount = run.taskResults.filter((result) => result.success).length;
  totals.incompleteCount = run.taskResults.length - totals.successCount;
  return totals;
}

function aggregateBenchmarkCondition(conditionId) {
  return aggregateSharedBenchmarkCondition({
    benchmarkResults: benchmarkResultsCalendar,
    conditionId,
  });
}

function persistCurrentServiceProgress() {
  if (APP_MODE !== 'main') return null;
  return saveServiceRunSnapshot({
    serviceId: SERVICE_ID,
    serviceLabel: SERVICE_LABEL,
    sessionId: state.sessionId,
    order: state.order,
    taskCount: calendarTasks.length,
    conditionCount: state.order.length,
    measurementRules: MEASUREMENT_RULES,
    actualRuns: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmarkResults: benchmarkResultsCalendar,
    aggregateActualCondition,
  });
}

function buildExportPayload() {
  return buildSharedExportPayload({
    serviceId: 'calendar',
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actualRuns: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmarkResults: benchmarkResultsCalendar,
    storedServices: readStoredExperimentResults().services,
  });
}

function buildExportDataUrl() {
  return buildSharedExportDataUrl(buildExportPayload());
}

function buildSurveyUrl() {
  return buildSharedSurveyUrl({
    baseUrl: SURVEY_CONFIG.baseUrl,
    sessionId: state.sessionId,
    serviceId: 'calendar',
    order: state.order,
    actualA: aggregateActualCondition(state.runs.variantA),
    actualB: aggregateActualCondition(state.runs.variantB),
  });
}

function formatSigned(value, suffix = '') {
  return formatSharedSigned(value, suffix);
}
