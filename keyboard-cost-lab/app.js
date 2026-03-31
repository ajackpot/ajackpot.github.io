import { calendarScenario } from './data/calendar-scenario.js';
import { calendarTasks } from './data/tasks-calendar.js';
import { benchmarkResultsCalendar } from './data/benchmark-results-calendar.js';
import { createTaskLogger } from './lib/logger.js';
import { hashString, uniqueId, formatSeconds, escapeHtml, deepClone, toQueryString, formatServiceScreenButtonLabel, renderRunnerFooterHtml } from './lib/utils.js';

const APP_MODE = new URL(window.location.href).searchParams.get('mode') === 'runner' ? 'runner' : 'main';
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

const MEASUREMENT_RULES = [
  '실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.',
  '수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.',
  '수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다.',
];

const SERVICE_TYPES = [
  {
    id: 'calendar',
    label: '예약 캘린더',
    summary: '상담 예약 화면에서 조건을 맞추고 원하는 예약 시간을 찾는 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'comments',
    label: '댓글 목록',
    summary: '댓글 정렬·답글 보기·댓글 정보 확인 과업으로 탐색 부담을 비교합니다.',
    statusLabel: '구현 완료',
    available: true,
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'product',
    label: '상품 옵션 선택',
    summary: '상품 상세 화면에서 색상, 크기, 추가 구성을 맞추고 장바구니에 담는 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
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
    term: '사전 계산 기준',
    description: '실제 실험 전에 미리 계산해 둔 예상 조작 부담 값입니다. 실제 기록과 나란히 비교합니다.',
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
  const channelName = `${CHANNEL_PREFIX}-${sessionId}`;
  const fallbackKey = `${CHANNEL_FALLBACK_STORAGE_PREFIX}-${sessionId}`;
  const bridgeState = {
    sessionId,
    channel: null,
    fallbackKey,
  };

  if ('BroadcastChannel' in window) {
    bridgeState.channel = new BroadcastChannel(channelName);
    bridgeState.channel.addEventListener('message', (event) => {
      handleBridgeMessage(event.data);
    });
  } else {
    window.addEventListener('storage', (event) => {
      if (event.key !== fallbackKey || !event.newValue) return;
      try {
        handleBridgeMessage(JSON.parse(event.newValue));
      } catch {
        // noop
      }
    });
  }

  return bridgeState;
}

function postBridgeMessage(message) {
  if (!bridge || !message) return;
  const payload = {
    ...message,
    emittedAt: Date.now(),
    nonce: uniqueId('msg'),
  };

  if (bridge.channel) {
    bridge.channel.postMessage(payload);
    return;
  }

  window.localStorage.setItem(bridge.fallbackKey, JSON.stringify(payload));
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
  const order = hashString(sessionId) % 2 === 0 ? ['variantA', 'variantB'] : ['variantB', 'variantA'];
  return {
    sessionId,
    order,
    currentConditionIndex: 0,
    currentTaskIndex: 0,
    selectedServiceId: null,
    view: 'home',
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
  const serviceId = params.get('service') || 'calendar';
  const launchPayload = launchId ? readLaunchSnapshot(launchId) : null;

  if (!launchPayload) {
    return {
      sessionId,
      conditionId,
      taskIndex,
      launchId,
      serviceId,
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
    modal: null,
    liveStatus: '필터를 적용하면 결과 수가 갱신됩니다.',
    taskResults: [],
    currentTaskLogger: null,
    currentGridSlotId: null,
    cancelPerformedThisTask: false,
    isApplying: false,
    isWorking: false,
    lastTaskCompletionNote: '',
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
  const stored = window.localStorage.getItem(STORAGE_KEY_SESSION);
  if (stored) return stored;
  const generated = uniqueId('session');
  window.localStorage.setItem(STORAGE_KEY_SESSION, generated);
  return generated;
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
  runtime.currentGridSlotId = snapshot.currentGridSlotId ?? null;
  runtime.cancelPerformedThisTask = Boolean(snapshot.cancelPerformedThisTask);
  runtime.lastTaskCompletionNote = snapshot.lastTaskCompletionNote ?? '';
  runtime.liveStatus = snapshot.liveStatus ?? runtime.liveStatus;
  return runtime;
}

function serializeRuntimeSnapshot(run) {
  return {
    variantId: run.variantId,
    filters: deepClone(run.filters),
    filtersDraft: deepClone(run.filtersDraft),
    booking: run.booking ? deepClone(run.booking) : null,
    currentGridSlotId: run.currentGridSlotId,
    cancelPerformedThisTask: run.cancelPerformedThisTask,
    lastTaskCompletionNote: run.lastTaskCompletionNote,
    liveStatus: run.liveStatus,
  };
}

function applyRuntimeSnapshot(targetRun, snapshot) {
  const hydrated = hydrateConditionRuntime(targetRun.variantId, snapshot);
  targetRun.filters = hydrated.filters;
  targetRun.filtersDraft = hydrated.filtersDraft;
  targetRun.booking = hydrated.booking;
  targetRun.currentGridSlotId = hydrated.currentGridSlotId;
  targetRun.cancelPerformedThisTask = hydrated.cancelPerformedThisTask;
  targetRun.lastTaskCompletionNote = hydrated.lastTaskCompletionNote;
  targetRun.liveStatus = hydrated.liveStatus;
  targetRun.modal = null;
  targetRun.isApplying = false;
  targetRun.isWorking = false;
}

function resetExperimentState() {
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  state.activeLaunch = null;
  state.runs.variantA = createConditionRuntime('variantA');
  state.runs.variantB = createConditionRuntime('variantB');
}

function getSelectedService() {
  if (APP_MODE === 'runner') return SERVICE_TYPES.find((service) => service.id === state.serviceId) ?? null;
  return SERVICE_TYPES.find((service) => service.id === state.selectedServiceId) ?? null;
}

function openService(serviceId) {
  if (APP_MODE === 'runner') return;
  const service = SERVICE_TYPES.find((item) => item.id === serviceId);
  if (!service || !service.available) return;
  if (service.id === 'comments') {
    window.location.href = './comments.html';
    return;
  }
  if (service.id === 'product') {
    window.location.href = './product.html';
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
  return `${LAUNCH_STORAGE_PREFIX}:${launchId}`;
}

function saveLaunchSnapshot(launchId, payload) {
  window.localStorage.setItem(buildLaunchStorageKey(launchId), JSON.stringify(payload));
}

function readLaunchSnapshot(launchId) {
  const raw = window.localStorage.getItem(buildLaunchStorageKey(launchId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLaunchSnapshot(launchId) {
  window.localStorage.removeItem(buildLaunchStorageKey(launchId));
}

function buildRunnerUrl({ launchId, conditionId, taskIndex, serviceId, sessionId }) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('mode', 'runner');
  url.searchParams.set('sessionId', sessionId);
  url.searchParams.set('service', serviceId);
  url.searchParams.set('condition', conditionId);
  url.searchParams.set('taskIndex', String(taskIndex));
  url.searchParams.set('launchId', launchId);
  return url.toString();
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
  postBridgeMessage({
    type: 'runner-closed',
    sessionId: state.sessionId,
    launchId: state.launchId,
    completed: state.completed,
  });
  const fallbackUrl = new URL(window.location.href);
  fallbackUrl.search = '';
  window.close();
  window.setTimeout(() => {
    if (!window.closed) {
      window.location.href = fallbackUrl.toString();
    }
  }, 80);
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
  }
}

function handleRootChange(event) {
  const element = event.target;
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;

  if (APP_MODE === 'main') {
    if (element.name === 'benchmark-profile') {
      state.benchmarkProfileFocus = element.value;
      render();
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

function closeModal() {
  const run = getCurrentRun();
  if (!run || !run.modal) return;
  const closingModal = run.modal;
  run.modal = null;
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
    run.isWorking = false;
    run.modal = null;
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

    if (isTaskSatisfied(task, run)) {
      finishRunnerTask(wasCorrect ? 'target-slot-confirmed' : 'task-satisfied-after-reselection');
      return;
    }

    run.liveStatus = wasCorrect
      ? '예약이 반영되었습니다. 과업의 완료 조건을 다시 확인하십시오.'
      : '예약은 되었지만 목표 예약 시간과 일치하지 않습니다. 다시 시도하십시오.';

    if (state.conditionId === 'variantB') {
      requestFocus('#booking-summary');
    } else {
      run.currentTaskLogger?.note('context-reset', { reason: 'variant-a-booking-confirmed' });
      requestFocus('#results-heading');
    }
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
  if (task.requiresCancellation) {
    return bookingMatches && run.cancelPerformedThisTask;
  }
  return bookingMatches;
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
      `booking=${run.booking?.slotId ?? 'none'}`,
      `cancelPerformed=${run.cancelPerformedThisTask}`,
      'measurement=first-input-visible-only',
    ],
  });

  run.currentTaskLogger = null;
  run.lastTaskCompletionNote = reason;
  state.completed = true;
  run.liveStatus = '과업 결과를 원래 실험 창으로 전달했습니다.';

  postBridgeMessage({
    type: 'task-complete',
    sessionId: state.sessionId,
    launchId: state.launchId,
    conditionId: state.conditionId,
    taskIndex: state.taskIndex,
    summary,
    runSnapshot: serializeRuntimeSnapshot(run),
  });

  requestFocus('[data-action="close-runner"]');
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
  const focusables = Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hasAttribute('disabled'));
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (!focusables.includes(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
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
      ${conditionId === 'variantB' ? `<a class="skip-link" href="#results-heading" data-action="jump-results" data-focus-id="runner-skip-results">${RUNNER_LABELS.quickJump}</a>` : ''}
      <main class="runner-main" aria-label="예약 캘린더 수행 화면">
        <h1 class="sr-only" id="runner-title" tabindex="-1">${escapeHtml(task.title)} · ${escapeHtml(VARIANT_META[conditionId].title)}</h1>
        ${renderSimulatedHeader(conditionId)}
        ${conditionId === 'variantB' ? renderBookingPanel(run, true) : ''}
        ${renderFilters(conditionId, run)}
        ${renderResults(conditionId, run, availableSlots, unavailableSlots)}
        ${conditionId === 'variantA' ? renderBookingPanel(run, false) : ''}
      </main>
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="live-status-region">${escapeHtml(run.liveStatus)}</div>
      ${renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${run.modal ? renderModal(run.modal, run, task) : ''}
    </div>
  `;
}

function renderHomeView() {
  return `
    <header class="hero card">
      <p class="eyebrow">실험 시작 준비</p>
      <h1 id="page-title" tabindex="-1">서비스 유형 선택</h1>
      <p>
        먼저 실험할 서비스 유형을 고르십시오. 현재는 예약 캘린더, 댓글 목록, 상품 옵션 선택이 준비되어 있으며,
        이후 다른 서비스 유형도 같은 방식으로 하나씩 추가할 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번 단계 목표</h2>
          <ul>
            <li>서비스 유형을 먼저 고르고 해당 서비스 화면에서 과업을 준비합니다.</li>
            <li>과업 내용은 메인 창에서 먼저 읽고, 실제 수행은 새 탭에서 분리해 진행합니다.</li>
            <li>실제 기록과 사전 계산 기준을 함께 남겨 후속 서비스 유형에 재사용합니다.</li>
          </ul>
        </section>
        <section>
          <h2>실험 정보</h2>
          <dl class="meta-list">
            <div><dt>실험 번호</dt><dd><code>${escapeHtml(state.sessionId)}</code></dd></div>
            <div><dt>비교안 순서</dt><dd>${state.order.map((variantId) => VARIANT_META[variantId].shortLabel).join(' → ')}</dd></div>
            <div><dt>현재 공개 범위</dt><dd>${SERVICE_TYPES.filter((service) => service.available).map((service) => service.label).join(' · ')}</dd></div>
          </dl>
        </section>
      </div>
    </header>
    <section class="service-grid" aria-label="서비스 유형 목록">
      ${SERVICE_TYPES.map((service) => renderHomeServiceCard(service)).join('')}
    </section>
  `;
}

function renderHomeServiceCard(service) {
  return `
    <article class="card service-card ${service.available ? 'service-card-available' : 'service-card-pending'}">
      <div class="service-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(service.statusLabel)}</p>
          <h2>${escapeHtml(service.label)}</h2>
        </div>
        <span class="pill ${service.available ? '' : 'pill-warning'}">${escapeHtml(service.statusLabel)}</span>
      </div>
      <p>${escapeHtml(service.summary)}</p>
      <ul>
        ${service.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
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
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">${escapeHtml(service.label)}</h1>
      <p>
        ${escapeHtml(service.summary)}
        이 화면에서 과업 준비 단계로 들어가거나, 다시 서비스 선택 화면으로 돌아갈 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번에 바로 확인하는 것</h2>
          <ul>
            <li>예약 시간 탐색 구조에 따라 키보드 조작 부담이 얼마나 달라지는지</li>
            <li>실제 수행 기록과 사전 계산 기준이 비슷한 방향으로 움직이는지</li>
            <li>같은 실험 틀을 다른 서비스 유형에도 그대로 확장할 수 있는지</li>
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
  return `
    <details class="card glossary-card">
      <summary>용어 설명 보기</summary>
      <p class="muted">이 실험은 사용자가 낯선 영어 표현을 학습하지 않아도 이해할 수 있도록 자주 쓰는 한국어를 우선 사용합니다.</p>
      <dl class="glossary-list">
        ${GLOSSARY_ENTRIES.map((entry) => `
          <div>
            <dt>${escapeHtml(entry.term)}</dt>
            <dd>${escapeHtml(entry.description)}</dd>
          </div>
        `).join('')}
      </dl>
    </details>
  `;
}

function renderTaskPreparationView() {
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const task = getCurrentTask();
  const benchmark = benchmarkResultsCalendar.variants[conditionId].tasks[task.benchmarkTaskId];
  const activeLaunch = state.activeLaunch;
  const isRunning = state.view === 'taskRunning';

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
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${calendarTasks.length}</span>
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
          <div><dt>현재 예약</dt><dd>${escapeHtml(formatBookingSummary(run.booking))}</dd></div>
          <div><dt>목표 예약 시간</dt><dd>${escapeHtml(formatSlotLabel(getSlotById(task.targetSlotId)))}</dd></div>
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
  if (!activeLaunch) {
    return '아직 수행 탭을 열지 않았습니다. 과업 내용을 충분히 읽은 뒤 시작하십시오.';
  }
  if (activeLaunch.status === 'blocked') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'opening') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'ready') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'started') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'closed') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'completed') return activeLaunch.lastMessage;
  return isRunning ? '수행 탭이 열려 있습니다.' : '과업 준비가 완료되었습니다.';
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
  return `
    <table class="summary-table">
      <thead>
        <tr>
          <th>사용자 유형</th>
          <th>낮은 예상</th>
          <th>기준 예상</th>
          <th>높은 예상</th>
        </tr>
      </thead>
      <tbody>
        ${Object.values(benchmark.profiles).map((profile) => `
          <tr>
            <th>${escapeHtml(profile.label)}</th>
            <td>${formatSeconds(profile.ranges.lower.seconds)}</td>
            <td>${formatSeconds(profile.ranges.expected.seconds)}</td>
            <td>${formatSeconds(profile.ranges.upper.seconds)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
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
      <div class="button-row">
        <a class="button button-secondary" download="reservation-calendar-${escapeHtml(state.sessionId)}.json" href="${exportUrl}">결과 파일(JSON) 내려받기</a>
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
        </tbody>
      </table>
      <p class="muted">과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</p>
    </section>
    <section class="card">
      <h2>다음 단계에 바로 쓸 수 있는 포인트</h2>
      <ul>
        <li>이번 구현에서 메인 창과 수행 탭을 분리했으므로, 다음 서비스 유형도 같은 운영 방식으로 확장할 수 있습니다.</li>
        <li>사전 계산 엔진은 과업 그래프만 추가하면 같은 형식으로 결과를 생성할 수 있습니다.</li>
        <li>docs 폴더의 단계 보고서에 현재 결정 사항과 후속 작업 항목을 기록해 두었습니다.</li>
      </ul>
      <div class="button-row">
        <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
      </div>
    </section>
  `;
}

function renderFinalConditionCard(conditionId, actualTotals, selectedProfileId) {
  const benchmarkOverall = benchmarkResultsCalendar.overall[selectedProfileId];
  const expectedSeconds = conditionId === 'variantA'
    ? benchmarkOverall.variantAExpectedSeconds
    : benchmarkOverall.variantBExpectedSeconds;

  return `
    <article class="card final-condition-card">
      <h2>${escapeHtml(VARIANT_META[conditionId].title)}</h2>
      <p class="muted">${escapeHtml(VARIANT_META[conditionId].subtitle)}</p>
      <dl class="meta-list compact">
        <div><dt>실제 완료 시간</dt><dd>${formatSeconds(actualTotals.durationSeconds)}</dd></div>
        <div><dt>총 키 입력</dt><dd>${actualTotals.totalKeyInputs}</dd></div>
        <div><dt>총 초점 이동</dt><dd>${actualTotals.focusChanges}</dd></div>
        <div><dt>${escapeHtml(benchmarkOverall.label)} 기준 예상 시간</dt><dd>${formatSeconds(expectedSeconds)}</dd></div>
      </dl>
    </article>
  `;
}

function renderSimulatedHeader(conditionId) {
  const links = ['처음 화면', '상담사 소개', '이용권', '이용 후기', '가격 안내', '자주 묻는 질문', '운영 정책', '문의'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <nav aria-label="서비스 보조 내비게이션">
        ${links.map((label, index) => `<a href="#" class="nav-link" data-focus-id="nav-${index + 1}" data-inert-link="true">${escapeHtml(label)}</a>`).join('')}
      </nav>
    </header>
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
        <a href="#" class="inline-link" data-focus-id="policy-link" data-inert-link="true">변경 기준 보기</a>
        <a href="#" class="inline-link" data-focus-id="support-link" data-inert-link="true">이용 안내 보기</a>
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
        ${conditionId === 'variantB' ? '<p class="keyboard-tip">방향키로 이동하고 엔터 키나 스페이스바로 열기</p>' : '<p class="keyboard-tip">탭 키와 Shift+탭 키로 예약 시간을 차례대로 이동</p>'}
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
  const isTarget = slot.id === task.targetSlotId;
  const actionLabel = run.booking ? '변경 확정' : '예약 확정';
  const modeLabel = modal.dialogMode === 'details' ? '시간 안내' : '예약 확인';
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">${escapeHtml(modeLabel)} · ${escapeHtml(formatSlotLabel(slot))}</h2>
        <p id="dialog-description">${slot.available ? '예약 가능한 시간입니다.' : '지금은 예약할 수 없는 시간입니다.'}</p>
        <p class="muted">현재 과업에서 찾아야 하는 예약 시간과 ${isTarget ? '일치합니다' : '일치하지 않습니다'}.</p>
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
  return run.taskResults.reduce(
    (totals, result) => {
      totals.durationSeconds += result.durationSeconds;
      totals.hiddenDurationSeconds += result.hiddenDurationSeconds ?? 0;
      totals.totalKeyInputs += result.totalKeyInputs;
      totals.focusChanges += result.focusChanges;
      totals.wrongSelections += result.wrongSelections;
      totals.contextResets += result.contextResets ?? 0;
      totals.modalEscapes += result.modalEscapes;
      totals.bookingCancels += result.bookingCancels;
      return totals;
    },
    {
      durationSeconds: 0,
      hiddenDurationSeconds: 0,
      totalKeyInputs: 0,
      focusChanges: 0,
      wrongSelections: 0,
      contextResets: 0,
      modalEscapes: 0,
      bookingCancels: 0,
    }
  );
}

function aggregateBenchmarkCondition(conditionId) {
  const variantResults = benchmarkResultsCalendar.variants[conditionId].tasks;
  const totals = {};
  for (const [profileId, overall] of Object.entries(benchmarkResultsCalendar.overall)) {
    const expectedSeconds = Object.values(variantResults).reduce((sum, taskResult) => sum + taskResult.profiles[profileId].ranges.expected.seconds, 0);
    totals[profileId] = {
      label: overall.label,
      expectedSeconds: Number(expectedSeconds.toFixed(1)),
      variantReductionHint: `${overall.expectedReductionSeconds}초 (${overall.expectedReductionPercent}%)`,
    };
  }
  return totals;
}

function buildExportPayload() {
  return {
    exportedAt: new Date().toISOString(),
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actual: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmark: benchmarkResultsCalendar,
  };
}

function buildExportDataUrl() {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(buildExportPayload(), null, 2))}`;
}

function buildSurveyUrl() {
  if (!SURVEY_CONFIG.baseUrl) return '';
  const params = {
    sessionId: state.sessionId,
    order: state.order.join(','),
    actualA: aggregateActualCondition(state.runs.variantA),
    actualB: aggregateActualCondition(state.runs.variantB),
  };
  return `${SURVEY_CONFIG.baseUrl}?${toQueryString(params)}`;
}

function formatSigned(value, suffix = '') {
  const prefix = value > 0 ? '+' : '';
  const normalized = typeof value === 'number' ? Number(value.toFixed(1)) : Number(value);
  return `${prefix}${normalized}${suffix}`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
