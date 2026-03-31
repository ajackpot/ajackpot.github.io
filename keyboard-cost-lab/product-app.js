import { productScenario } from './data/product-scenario.js';
import { productTasks } from './data/tasks-product.js';
import { benchmarkResultsProduct } from './data/benchmark-results-product.js';
import { createTaskLogger } from './lib/logger.js';
import { hashString, uniqueId, formatSeconds, escapeHtml, deepClone, toQueryString, renderRunnerFooterHtml } from './lib/utils.js';

const APP_MODE = new URL(window.location.href).searchParams.get('mode') === 'runner' ? 'runner' : 'main';
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-product-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-product-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-product-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-product-channel-fallback';
const SURVEY_CONFIG = {
  baseUrl: '',
};

const MEASUREMENT_RULES = [
  '실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.',
  '수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.',
  '수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에 포함하지 않습니다.',
];

const VARIANT_META = {
  variantA: {
    shortLabel: 'A',
    title: '비교안 A · 조작 부담이 큰 구조',
    subtitle: '상단 링크와 안내를 지나 각 옵션 줄의 버튼을 하나씩 찾아야 하고, 설명 대화상자를 닫으면 옵션 선택 제목 근처부터 다시 찾아야 하는 구조',
    improvements: [
      '옵션 묶음에 도달하기 전에 상단 링크와 상품 안내 링크를 먼저 지나게 됩니다.',
      '각 옵션 줄마다 선택 버튼과 설명 보기 버튼이 따로 있어 원하는 조합을 맞출 때 반복 이동이 길어집니다.',
      '설명 대화상자를 닫으면 방금 보던 옵션 버튼으로 돌아가지 않고 옵션 선택 제목 근처부터 다시 찾아야 합니다.',
    ],
  },
  variantB: {
    shortLabel: 'B',
    title: '비교안 B · 개선 구조',
    subtitle: '옵션 선택으로 바로 이동하고, 각 옵션 묶음에 한 번만 들어간 뒤 방향키로 고르며, 설명 보기와 장바구니를 현재 선택 가까이에 모은 구조',
    improvements: [
      '옵션 선택으로 바로 이동해 첫 진입 부담을 줄입니다.',
      '색상, 크기, 추가 구성은 각 묶음에 한 번만 들어간 뒤 방향키로 고릅니다.',
      '설명 대화상자를 닫으면 방금 사용한 설명 보기 버튼으로 초점이 돌아옵니다.',
    ],
  },
};

const RUNNER_LABELS = {
  quickJump: '옵션 선택으로 바로 이동',
  footerJump: '옵션 선택으로 이동',
};

const GLOSSARY_ENTRIES = [
  {
    term: '비교안 A/B',
    description: '같은 상품과 같은 과업을 두 가지 다른 이동 구조로 비교하는 화면입니다. 상품 정보는 같고 이동 방식만 다릅니다.',
  },
  {
    term: '옵션 묶음',
    description: '색상, 크기, 추가 구성처럼 같은 종류의 선택지를 한곳에 모아 둔 영역입니다.',
  },
  {
    term: '장바구니',
    description: '바로 결제하지 않고 고른 상품을 임시로 담아 두는 곳입니다.',
  },
  {
    term: '초점',
    description: '키보드로 현재 선택되어 있는 위치입니다. 탭 키를 누르면 초점이 다음 요소로 이동합니다.',
  },
  {
    term: '대화상자',
    description: '옵션 설명처럼 잠깐 열렸다가 닫히는 작은 창입니다.',
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
  const task = productTasks[taskIndex] ?? productTasks[0];
  runtime.modal = null;
  runtime.isWorking = false;
  runtime.liveStatus = '원하는 옵션을 고른 뒤 장바구니에 담으십시오.';
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
    selections: deepClone(productScenario.defaultSelections),
    groupFocus: {
      color: productScenario.defaultSelections.color,
      size: productScenario.defaultSelections.size,
      bundle: productScenario.defaultSelections.bundle,
    },
    cartCount: 0,
    lastCartItem: null,
    detailVisitedThisTask: {},
    modal: null,
    liveStatus: '원하는 옵션을 고르고 장바구니에 담을 수 있습니다.',
    taskResults: [],
    currentTaskLogger: null,
    isWorking: false,
    lastTaskCompletionNote: '',
  };
}

function getOrCreateSessionId() {
  const stored = window.localStorage.getItem(STORAGE_KEY_SESSION);
  if (stored) return stored;
  const generated = uniqueId('product-session');
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
  if (APP_MODE === 'runner') return productTasks[state.taskIndex] ?? null;
  return productTasks[state.currentTaskIndex] ?? null;
}

function hydrateConditionRuntime(variantId, snapshot = {}) {
  const runtime = createConditionRuntime(variantId);
  runtime.selections = {
    ...runtime.selections,
    ...deepClone(snapshot.selections ?? {}),
  };
  runtime.groupFocus = {
    ...runtime.groupFocus,
    ...deepClone(snapshot.groupFocus ?? {}),
  };
  runtime.cartCount = snapshot.cartCount ?? runtime.cartCount;
  runtime.lastCartItem = deepClone(snapshot.lastCartItem ?? runtime.lastCartItem);
  runtime.detailVisitedThisTask = deepClone(snapshot.detailVisitedThisTask ?? runtime.detailVisitedThisTask);
  runtime.lastTaskCompletionNote = snapshot.lastTaskCompletionNote ?? '';
  runtime.liveStatus = snapshot.liveStatus ?? runtime.liveStatus;
  ensureGroupFocusValid(runtime);
  return runtime;
}

function serializeRuntimeSnapshot(run) {
  return {
    variantId: run.variantId,
    selections: deepClone(run.selections),
    groupFocus: deepClone(run.groupFocus),
    cartCount: run.cartCount,
    lastCartItem: deepClone(run.lastCartItem),
    detailVisitedThisTask: deepClone(run.detailVisitedThisTask),
    lastTaskCompletionNote: run.lastTaskCompletionNote,
    liveStatus: run.liveStatus,
  };
}

function applyRuntimeSnapshot(targetRun, snapshot) {
  const hydrated = hydrateConditionRuntime(targetRun.variantId, snapshot);
  targetRun.selections = hydrated.selections;
  targetRun.groupFocus = hydrated.groupFocus;
  targetRun.cartCount = hydrated.cartCount;
  targetRun.lastCartItem = hydrated.lastCartItem;
  targetRun.detailVisitedThisTask = hydrated.detailVisitedThisTask;
  targetRun.lastTaskCompletionNote = hydrated.lastTaskCompletionNote;
  targetRun.liveStatus = hydrated.liveStatus;
  targetRun.modal = null;
  targetRun.isWorking = false;
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
  run.isWorking = false;
  run.detailVisitedThisTask = {};
  run.liveStatus = '과업 내용은 이 창에서 확인하고, 실제 수행은 새 탭에서 진행합니다.';
  ensureGroupFocusValid(run);
  state.activeLaunch = null;
}

function continueAfterTask() {
  if (APP_MODE === 'runner') return;
  if (state.currentTaskIndex < productTasks.length - 1) {
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

function buildRunnerUrl({ launchId, conditionId, taskIndex, sessionId }) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('mode', 'runner');
  url.searchParams.set('sessionId', sessionId);
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

  const launchId = uniqueId('product-launch');
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
    lastMessage: '새 탭을 열고 있습니다. 열리지 않으면 브라우저의 팝업 차단 설정을 확인하십시오.',
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
    conditionId,
    selectionsAfterTask: deepClone(run.selections),
    cartCountAfterTask: run.cartCount,
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

  if (action === 'select-option') {
    event.preventDefault();
    selectOption(actionTarget.dataset.groupId, actionTarget.dataset.optionId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'open-option-detail') {
    event.preventDefault();
    openOptionDetail(actionTarget.dataset.groupId, actionTarget.dataset.optionId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'add-to-cart') {
    event.preventDefault();
    addToCart(actionTarget.dataset.focusId);
    return;
  }

  if (action === 'dialog-close') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (action === 'jump-results') {
    event.preventDefault();
    focusElementNow('#options-heading');
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

  if (element.name === 'quantity') {
    setQuantity(Number.parseInt(element.value, 10) || 1);
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
    const optionButton = event.target.closest('[data-option-item="true"]');
    if (optionButton instanceof HTMLElement) {
      handleOptionGroupNavigation(event, optionButton);
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

function getOptionGroup(groupId) {
  return productScenario.optionGroups.find((group) => group.id === groupId) ?? null;
}

function getOption(groupId, optionId) {
  return getOptionGroup(groupId)?.options.find((option) => option.id === optionId) ?? null;
}

function getOptionLabel(groupId, optionId) {
  return getOption(groupId, optionId)?.label ?? optionId;
}

function buildDetailKey(groupId, optionId) {
  return `${groupId}:${optionId}`;
}

function getSelectedOption(run, groupId) {
  if (!run) return null;
  return getOption(groupId, run.selections[groupId]);
}

function ensureGroupFocusValid(run) {
  for (const group of productScenario.optionGroups) {
    const availableIds = group.options.map((option) => option.id);
    const selectedId = run.selections[group.id];
    if (!availableIds.includes(run.groupFocus[group.id])) {
      run.groupFocus[group.id] = selectedId;
    }
    if (!availableIds.includes(run.selections[group.id])) {
      run.selections[group.id] = group.options[0]?.id ?? '';
      run.groupFocus[group.id] = run.selections[group.id];
    }
  }
}

function calculateUnitPrice(run) {
  return productScenario.basePrice + productScenario.optionGroups.reduce((sum, group) => {
    const option = getSelectedOption(run, group.id);
    return sum + (option?.priceDelta ?? 0);
  }, 0);
}

function calculateTotalPrice(run) {
  return calculateUnitPrice(run) * run.selections.quantity;
}

function formatPrice(value) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatSelectionSummary(run) {
  return [
    `색상 ${getOptionLabel('color', run.selections.color)}`,
    `크기 ${getOptionLabel('size', run.selections.size)}`,
    `추가 구성 ${getOptionLabel('bundle', run.selections.bundle)}`,
    `수량 ${run.selections.quantity}개`,
  ].join(' / ');
}

function formatRunStateSummary(run) {
  return [
    formatSelectionSummary(run),
    `장바구니 담은 횟수 ${run.cartCount}회`,
    run.lastCartItem ? `최근 담은 구성 ${formatSelectionSummary({ selections: run.lastCartItem })}` : '최근 담은 구성 없음',
  ].join(' / ');
}

function buildOptionButtonSelector(groupId, optionId) {
  return `[data-option-item="true"][data-group-id="${groupId}"][data-option-id="${optionId}"]`;
}

function formatListboxOptionLabel(group, option) {
  return `${group.label} ${option.label} · ${option.summary}${option.priceDelta ? ` · 추가 금액 ${formatPrice(option.priceDelta)}` : ''}`;
}

function selectOption(groupId, optionId, triggerFocusId = '') {
  const run = getCurrentRun();
  if (!run || !groupId || !optionId || run.isWorking) return;
  const group = getOptionGroup(groupId);
  const option = getOption(groupId, optionId);
  if (!group || !option) return;

  run.selections[groupId] = optionId;
  run.groupFocus[groupId] = optionId;
  run.liveStatus = `${group.label}을(를) ${option.label}으로 바꿨습니다.`;

  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  } else if (state.conditionId === 'variantB') {
    requestFocus(buildOptionButtonSelector(groupId, optionId));
  }
  render();
}

function noteWrongDetailSelection(groupId, optionId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !task.requiredDetailKey) return;
  const detailKey = buildDetailKey(groupId, optionId);
  if (detailKey === task.requiredDetailKey) return;
  run.currentTaskLogger?.note('wrong-selection', {
    actionType: 'open-detail',
    selectedDetailKey: detailKey,
    targetDetailKey: task.requiredDetailKey,
  });
}

function openOptionDetail(groupId, optionId, triggerFocusId) {
  const run = getCurrentRun();
  if (!run || !groupId || !optionId || run.isWorking) return;
  const option = getOption(groupId, optionId);
  const group = getOptionGroup(groupId);
  if (!option || !group) return;

  noteWrongDetailSelection(groupId, optionId);
  run.modal = {
    kind: 'option-detail',
    groupId,
    optionId,
    triggerFocusId,
  };
  run.currentTaskLogger?.note('open-option-detail', {
    groupId,
    optionId,
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
  run.modal = null;
  if (closingModal.groupId && closingModal.optionId) {
    run.detailVisitedThisTask = {
      ...run.detailVisitedThisTask,
      [buildDetailKey(closingModal.groupId, closingModal.optionId)]: true,
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
    run.currentTaskLogger?.note('context-reset', { reason: 'dialog-closed-returned-to-options-heading' });
    requestFocus('#options-heading');
  }
  render();
}

function setQuantity(quantity) {
  const run = getCurrentRun();
  if (!run || run.isWorking) return;
  const safeQuantity = productScenario.quantityOptions.includes(quantity) ? quantity : productScenario.quantityOptions[0];
  run.selections.quantity = safeQuantity;
  run.liveStatus = `수량을 ${safeQuantity}개로 바꿨습니다.`;
  requestFocus('[data-focus-id="quantity-select"]');
  render();
}

function selectionsMatch(task, run) {
  return Object.entries(task.requiredSelections).every(([key, value]) => run.selections[key] === value);
}

function isTaskSatisfied(task, run) {
  if (!task || !run) return false;
  const selectionsDone = selectionsMatch(task, run);
  const detailDone = task.requiredDetailKey ? Boolean(run.detailVisitedThisTask[task.requiredDetailKey]) : true;
  return selectionsDone && detailDone;
}

function noteWrongCartAttempt(run, task) {
  if (!run || !task) return;
  const expected = task.requiredSelections;
  const mismatches = Object.keys(expected)
    .filter((key) => run.selections[key] !== expected[key])
    .map((key) => `${key}:${run.selections[key]}→${expected[key]}`);
  run.currentTaskLogger?.note('wrong-selection', {
    actionType: 'add-to-cart',
    mismatches,
    detailMissing: task.requiredDetailKey && !run.detailVisitedThisTask[task.requiredDetailKey],
  });
}

function addToCart(triggerFocusId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || run.isWorking) return;

  if (!isTaskSatisfied(task, run)) {
    noteWrongCartAttempt(run, task);
  }

  run.cartCount += 1;
  run.lastCartItem = deepClone(run.selections);
  run.currentTaskLogger?.note('add-to-cart', {
    selections: deepClone(run.selections),
    cartCount: run.cartCount,
  });

  if (isTaskSatisfied(task, run)) {
    finishRunnerTask('target-cart-added');
    return;
  }

  run.liveStatus = `현재 선택을 장바구니에 담았습니다. 선택 내용은 ${formatSelectionSummary(run)}입니다.`;
  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
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
      `selections=${formatSelectionSummary(run)}`,
      `cartCount=${run.cartCount}`,
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

function handleOptionGroupNavigation(event, currentButton) {
  const run = getCurrentRun();
  if (!run || !currentButton.dataset.groupId || !currentButton.dataset.optionId) return;
  const group = getOptionGroup(currentButton.dataset.groupId);
  if (!group) return;
  const currentIndex = group.options.findIndex((option) => option.id === currentButton.dataset.optionId);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, group.options.length - 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = group.options.length - 1;

  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const nextOption = group.options[nextIndex];
    run.selections[group.id] = nextOption.id;
    run.groupFocus[group.id] = nextOption.id;
    run.liveStatus = `${group.label}을(를) ${nextOption.label}으로 바꿨습니다.`;
    requestFocus(buildOptionButtonSelector(group.id, nextOption.id));
    render();
    return;
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
    return `수행 화면 · ${task?.title ?? '상품 옵션 선택'}`;
  }
  if (state.view === 'serviceIntro') return '상품 옵션 선택 서비스 화면';
  if (state.view === 'taskPrep' || state.view === 'taskRunning') return `과업 준비 · ${getCurrentTask()?.title ?? '상품 옵션 선택'}`;
  if (state.view === 'taskReview') return '과업 결과 요약';
  if (state.view === 'conditionReview') return '비교안 요약';
  return '상품 옵션 선택 최종 비교';
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
      ${conditionId === 'variantB' ? `<a class="skip-link" href="#options-heading" data-action="jump-results" data-focus-id="runner-skip-options">${RUNNER_LABELS.quickJump}</a>` : ''}
      <main class="runner-main" aria-label="상품 옵션 선택 수행 화면">
        <h1 class="sr-only" id="runner-title" tabindex="-1">${escapeHtml(task.title)} · ${escapeHtml(VARIANT_META[conditionId].title)}</h1>
        ${renderProductHeader(conditionId)}
        ${renderProductHeroCard(run)}
        ${renderProductOptionSection(conditionId, run)}
      </main>
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="live-status-region">${escapeHtml(run.liveStatus)}</div>
      ${renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${run.modal ? renderProductModal(run.modal) : ''}
    </div>
  `;
}

function renderServiceIntroView() {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">상품 옵션 선택</h1>
      <p>
        같은 상품 정보를 두 가지 다른 옵션 선택 구조로 보여 주는 실험 화면입니다.
        이 화면에서 과업 준비 단계로 들어가거나, 다시 서비스 선택 화면으로 돌아갈 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번에 확인하는 것</h2>
          <ul>
            <li>옵션마다 흩어진 버튼이 순차 이동 부담을 얼마나 키우는지</li>
            <li>옵션 묶음에 한 번만 들어가 방향키로 고르는 구조가 부담을 얼마나 줄이는지</li>
            <li>옵션 설명 대화상자를 닫은 뒤 같은 위치로 돌아오는 구조가 실제 기록에 어떤 차이를 만드는지</li>
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
  const benchmark = benchmarkResultsProduct.variants[conditionId].tasks[task.benchmarkTaskId];
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
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${productTasks.length}</span>
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
          <div><dt>현재 선택 상태</dt><dd>${escapeHtml(formatRunStateSummary(run))}</dd></div>
          <div><dt>목표 옵션 조합</dt><dd>${escapeHtml(formatTaskTargetSummary(task))}</dd></div>
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
  const benchmark = benchmarkResultsProduct.variants[conditionId].tasks[result.benchmarkTaskId];
  const comparison = benchmarkResultsProduct.comparisons[result.benchmarkTaskId];

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
          <div><dt>목표와 다른 옵션 조합으로 담기</dt><dd>${result.wrongSelections}</dd></div>
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
              <li><strong>${escapeHtml(benchmarkResultsProduct.overall[profileId].label)}</strong>: ${value.expectedReductionSeconds}초 감소 예상 (${value.expectedReductionPercent}%)</li>
            `).join('')}
          </ul>
        </div>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-task">
        ${state.currentTaskIndex < productTasks.length - 1 ? '다음 과업 준비' : '현재 비교안 요약 보기'}
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
          <div><dt>목표와 다른 옵션 조합으로 담기</dt><dd>${totals.wrongSelections}</dd></div>
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
        <h2>저장된 과업 기록</h2>
        <ol>
          ${run.taskResults.map((result, index) => `<li><strong>${escapeHtml(productTasks[index].title)}</strong> — ${formatSeconds(result.durationSeconds)}, 키 ${result.totalKeyInputs}회, 초점 이동 ${result.focusChanges}회</li>`).join('')}
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
      <p class="eyebrow">상품 옵션 선택 실험 완료</p>
      <h1 id="final-summary-heading" tabindex="-1">비교안 A/B 최종 비교</h1>
      <p>실제 기록과 사전 계산 기준을 함께 보면서, 다음 서비스 유형으로 확장할 때 다시 쓸 기준점과 점검 기준을 마련했습니다.</p>
    </section>
    <section class="card toolbar-card">
      <label>
        <span>비교 기준 사용자 유형</span>
        <select name="benchmark-profile">
          ${Object.entries(benchmarkResultsProduct.overall).map(([profileId, profile]) => `
            <option value="${profileId}" ${profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>
          `).join('')}
        </select>
      </label>
      <div class="button-row">
        <a class="button button-secondary" download="product-options-${escapeHtml(state.sessionId)}.json" href="${exportUrl}">결과 파일(JSON) 내려받기</a>
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
          <tr><th>목표와 다른 옵션 조합으로 담기</th><td>${actualA.wrongSelections}</td><td>${actualB.wrongSelections}</td><td>${formatSigned(actualB.wrongSelections - actualA.wrongSelections)}</td></tr>
          <tr><th>위치 다시 찾기</th><td>${actualA.contextResets}</td><td>${actualB.contextResets}</td><td>${formatSigned(actualB.contextResets - actualA.contextResets)}</td></tr>
        </tbody>
      </table>
      <p class="muted">과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</p>
    </section>
    <section class="card">
      <h2>다음 단계에 바로 쓸 수 있는 포인트</h2>
      <ul>
        <li>상품 옵션 선택도 메인 창과 수행 탭을 분리해 같은 운영 방식으로 확장했습니다.</li>
        <li>서비스별 사전 계산 그래프와 결과 파일을 별도로 두어 후속 서비스 유형을 독립적으로 추가할 수 있습니다.</li>
        <li>옵션 묶음 이동, 설명 대화상자 복귀, 장바구니 요약 배치 같은 차이를 서비스 유형별로 누적 비교할 수 있습니다.</li>
      </ul>
      <div class="button-row">
        <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
        <button class="button button-secondary" data-action="go-home">서비스 선택으로 돌아가기</button>
      </div>
    </section>
  `;
}

function renderFinalConditionCard(conditionId, actualTotals, selectedProfileId) {
  const benchmarkOverall = benchmarkResultsProduct.overall[selectedProfileId];
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

function renderProductHeader(conditionId) {
  const links = ['기획전', '신상품', '베스트', '할인 쿠폰', '배송 안내', '교환 안내', '찜한 상품', '문의'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <nav aria-label="상품 보조 내비게이션">
        ${links.map((label, index) => `<a href="#" class="nav-link" data-focus-id="product-nav-${index + 1}" data-inert-link="true">${escapeHtml(label)}</a>`).join('')}
      </nav>
    </header>
  `;
}

function renderProductHeroCard(run) {
  return `
    <section class="card">
      <div class="results-header">
        <div>
          <h2>${escapeHtml(productScenario.productTitle)}</h2>
          <p class="muted">${escapeHtml(productScenario.productSummary)}</p>
        </div>
        <div class="pill-group">
          <span class="pill">기본 금액 ${formatPrice(productScenario.basePrice)}</span>
          <span class="pill">현재 총액 ${formatPrice(calculateTotalPrice(run))}</span>
        </div>
      </div>
      <ul class="chip-list">
        ${productScenario.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}
      </ul>
      <p class="muted">현재 선택: ${escapeHtml(formatSelectionSummary(run))}</p>
    </section>
  `;
}

function renderProductOptionSection(conditionId, run) {
  return conditionId === 'variantA'
    ? renderVariantAOptionSection(run)
    : renderVariantBOptionSection(run);
}

function renderVariantAOptionSection(run) {
  return `
    <section class="card results-card">
      <div class="results-header">
        <div>
          <h2 id="options-heading" tabindex="-1">옵션 선택</h2>
        </div>
      </div>
      <div class="option-selector-grid">
        ${productScenario.optionGroups.map((group) => renderVariantAOptionGroup(run, group)).join('')}
      </div>
      <section class="card muted-card product-summary-card">
        <div class="results-header">
          <div>
            <h3>현재 선택과 장바구니</h3>
            <p class="muted">옵션을 모두 고른 뒤 장바구니 버튼까지 다시 이동해야 합니다.</p>
          </div>
          <span class="pill">총액 ${formatPrice(calculateTotalPrice(run))}</span>
        </div>
        <div class="filters-grid">
          <label>
            <span>수량</span>
            <select name="quantity" data-focus-id="quantity-select">
              ${productScenario.quantityOptions.map((quantity) => `<option value="${quantity}" ${run.selections.quantity === quantity ? 'selected' : ''}>${quantity}개</option>`).join('')}
            </select>
          </label>
          <div>
            <span class="sr-only">장바구니 상태</span>
            <dl class="meta-list compact">
              <div><dt>현재 선택</dt><dd>${escapeHtml(formatSelectionSummary(run))}</dd></div>
              <div><dt>장바구니 담은 횟수</dt><dd>${run.cartCount}회</dd></div>
              <div><dt>최근 담은 구성</dt><dd>${escapeHtml(run.lastCartItem ? formatSelectionSummary({ selections: run.lastCartItem }) : '없음')}</dd></div>
            </dl>
          </div>
        </div>
        <div class="button-row">
          <a href="#" class="inline-link" data-focus-id="shipping-guide-link" data-inert-link="true">배송 안내 보기</a>
          <a href="#" class="inline-link" data-focus-id="exchange-guide-link" data-inert-link="true">교환 안내 보기</a>
          <button class="button button-primary" data-action="add-to-cart" data-focus-id="add-cart-a">장바구니에 담기</button>
        </div>
      </section>
    </section>
  `;
}

function renderVariantAOptionGroup(run, group) {
  return `
    <section class="card muted-card option-selector-card">
      <div class="results-header">
        <div>
          <h3>${escapeHtml(group.label)}</h3>
          <p class="muted">현재 선택 ${escapeHtml(getOptionLabel(group.id, run.selections[group.id]))}</p>
        </div>
        <a href="#" class="inline-link" data-focus-id="guide-${group.id}" data-inert-link="true">${escapeHtml(group.label)} 안내 보기</a>
      </div>
      <ul class="product-option-list">
        ${group.options.map((option) => `
          <li class="product-option-card ${run.selections[group.id] === option.id ? 'product-option-card-active' : ''}">
            <div class="product-option-card-head">
              <div>
                <p class="goal">${escapeHtml(option.label)}</p>
                <p class="muted">${escapeHtml(option.summary)}</p>
              </div>
              <span class="pill">${option.priceDelta ? `추가 ${formatPrice(option.priceDelta)}` : '추가 금액 없음'}</span>
            </div>
            <div class="button-row">
              <button class="button button-secondary" data-action="select-option" data-group-id="${group.id}" data-option-id="${option.id}" data-focus-id="select-${group.id}-${option.id}">선택</button>
              <button class="button button-ghost" data-action="open-option-detail" data-group-id="${group.id}" data-option-id="${option.id}" data-focus-id="detail-${group.id}-${option.id}">옵션 설명 보기</button>
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderVariantBOptionSection(run) {
  return `
    <section class="card results-card">
      <div class="results-header">
        <div>
          <h2 id="options-heading" tabindex="-1">옵션 선택</h2>
        </div>
        <span class="pill">현재 총액 ${formatPrice(calculateTotalPrice(run))}</span>
      </div>
      <div class="product-composite-layout">
        <div class="option-selector-grid">
          ${productScenario.optionGroups.map((group) => renderVariantBOptionGroup(run, group)).join('')}
        </div>
        ${renderSelectedSummaryCard(run)}
      </div>
    </section>
  `;
}

function renderVariantBOptionGroup(run, group) {
  const selectedOption = getSelectedOption(run, group.id);
  const focusedOptionId = run.groupFocus[group.id] ?? selectedOption?.id;
  return `
    <section class="card option-selector-card">
      <div class="results-header">
        <div>
          <h3>${escapeHtml(group.label)}</h3>
          <p class="muted">현재 선택 ${escapeHtml(selectedOption?.label ?? '')}</p>
        </div>
        <span class="pill">${selectedOption?.priceDelta ? `추가 ${formatPrice(selectedOption.priceDelta)}` : '추가 금액 없음'}</span>
      </div>
      <div role="listbox" aria-label="${escapeHtml(group.label)} 선택" class="product-listbox">
        ${group.options.map((option) => `
          <button
            role="option"
            class="product-option-button ${run.selections[group.id] === option.id ? 'product-option-button-active' : ''}"
            aria-selected="${run.selections[group.id] === option.id ? 'true' : 'false'}"
            data-action="select-option"
            data-option-item="true"
            data-group-id="${group.id}"
            data-option-id="${option.id}"
            data-focus-id="option-${group.id}-${option.id}"
            tabindex="${focusedOptionId === option.id ? '0' : '-1'}"
            aria-label="${escapeHtml(formatListboxOptionLabel(group, option))}"
          >
            <span class="comment-option-top">
              <strong>${escapeHtml(option.label)}</strong>
              <span class="pill">${option.priceDelta ? `추가 ${formatPrice(option.priceDelta)}` : '추가 금액 없음'}</span>
            </span>
            <span class="muted">${escapeHtml(option.summary)}</span>
          </button>
        `).join('')}
      </div>
      <div class="button-row compact-row">
        <button class="button button-ghost" data-action="open-option-detail" data-group-id="${group.id}" data-option-id="${selectedOption?.id ?? ''}" data-focus-id="detail-selected-${group.id}">${escapeHtml(group.detailButtonLabel)}</button>
      </div>
    </section>
  `;
}

function renderSelectedSummaryCard(run) {
  return `
    <section class="card selected-option-card">
      <h3>현재 선택과 장바구니</h3>
      <dl class="meta-list compact">
        <div><dt>색상</dt><dd>${escapeHtml(getOptionLabel('color', run.selections.color))}</dd></div>
        <div><dt>크기</dt><dd>${escapeHtml(getOptionLabel('size', run.selections.size))}</dd></div>
        <div><dt>추가 구성</dt><dd>${escapeHtml(getOptionLabel('bundle', run.selections.bundle))}</dd></div>
        <div><dt>개당 금액</dt><dd>${formatPrice(calculateUnitPrice(run))}</dd></div>
      </dl>
      <label>
        <span>수량</span>
        <select name="quantity" data-focus-id="quantity-select">
          ${productScenario.quantityOptions.map((quantity) => `<option value="${quantity}" ${run.selections.quantity === quantity ? 'selected' : ''}>${quantity}개</option>`).join('')}
        </select>
      </label>
      <dl class="meta-list compact selected-option-meta">
        <div><dt>총액</dt><dd>${formatPrice(calculateTotalPrice(run))}</dd></div>
        <div><dt>장바구니 담은 횟수</dt><dd>${run.cartCount}회</dd></div>
        <div><dt>최근 담은 구성</dt><dd>${escapeHtml(run.lastCartItem ? formatSelectionSummary({ selections: run.lastCartItem }) : '없음')}</dd></div>
      </dl>
      <div class="button-row">
        <button class="button button-primary" data-action="add-to-cart" data-focus-id="add-cart-b">장바구니에 담기</button>
      </div>
    </section>
  `;
}

function renderProductModal(modal) {
  const group = getOptionGroup(modal.groupId);
  const option = getOption(modal.groupId, modal.optionId);
  if (!group || !option) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">${escapeHtml(group.label)} 설명 · ${escapeHtml(option.label)}</h2>
        <p id="dialog-description">${escapeHtml(option.summary)}</p>
        <dl class="meta-list compact">
          <div><dt>옵션 묶음</dt><dd>${escapeHtml(group.label)}</dd></div>
          <div><dt>추가 금액</dt><dd>${option.priceDelta ? formatPrice(option.priceDelta) : '없음'}</dd></div>
        </dl>
        <p class="muted">${escapeHtml(option.detail)}</p>
        <div class="button-row">
          <button class="button button-primary" data-action="dialog-close" data-dialog-close data-focus-id="product-dialog-close">닫기</button>
        </div>
      </div>
    </div>
  `;
}

function formatTaskTargetSummary(task) {
  return [
    `색상 ${getOptionLabel('color', task.requiredSelections.color)}`,
    `크기 ${getOptionLabel('size', task.requiredSelections.size)}`,
    `추가 구성 ${getOptionLabel('bundle', task.requiredSelections.bundle)}`,
    `수량 ${task.requiredSelections.quantity}개`,
    task.requiredDetailKey ? `필수 설명 확인 ${formatRequiredDetailLabel(task.requiredDetailKey)}` : '필수 설명 확인 없음',
  ].join(' / ');
}

function formatRequiredDetailLabel(detailKey) {
  const [groupId, optionId] = detailKey.split(':');
  return `${getOptionGroup(groupId)?.label ?? groupId} ${getOptionLabel(groupId, optionId)}`;
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
    }
  );
}

function aggregateBenchmarkCondition(conditionId) {
  const variantResults = benchmarkResultsProduct.variants[conditionId].tasks;
  const totals = {};
  for (const [profileId, overall] of Object.entries(benchmarkResultsProduct.overall)) {
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
    serviceId: 'product',
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actual: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmark: benchmarkResultsProduct,
  };
}

function buildExportDataUrl() {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(buildExportPayload(), null, 2))}`;
}

function buildSurveyUrl() {
  if (!SURVEY_CONFIG.baseUrl) return '';
  const params = {
    sessionId: state.sessionId,
    serviceId: 'product',
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
