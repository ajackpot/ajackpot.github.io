import { searchScenario } from './data/search-scenario.js';
import { searchTasks } from './data/tasks-search.js';
import { benchmarkResultsSearch } from './data/benchmark-results-search.js';
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

const APP_MODE = getAppMode();
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-search-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-search-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-search-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-search-channel-fallback';
const SURVEY_CONFIG = {
  baseUrl: '',
};

const MEASUREMENT_RULES = commonMeasurementRules;

const VARIANT_META = {
  variantA: {
    shortLabel: 'A',
    title: '비교안 A · 조작 부담이 큰 구조',
    subtitle: '상단 보조 링크와 자료 조건 선택을 지난 뒤 검색 결과에 도달하고, 자료마다 여러 링크와 버튼을 각각 지나야 하며, 미리보기 대화상자를 닫으면 검색 결과 제목 근처부터 다시 찾아야 하는 구조',
    improvements: [
      '상단 보조 링크와 자료 조건 선택을 지난 뒤 검색 결과에 도달합니다.',
      '자료마다 제목 링크, 갱신 시각, 공유, 저장, 바로 열기, 미리보기가 따로 나뉘어 있어 순차 이동이 길어집니다.',
      '미리보기 대화상자를 닫으면 방금 보던 자료 작업으로 돌아가지 않고 검색 결과 제목 근처부터 다시 찾아야 합니다.',
    ],
  },
  variantB: {
    shortLabel: 'B',
    title: '비교안 B · 개선 구조',
    subtitle: '검색 결과로 바로 이동하고, 자료를 하나의 선택 항목으로 고른 뒤, 선택한 자료 작업을 한곳에서 이어서 수행하는 구조',
    improvements: [
      '검색 결과로 바로 이동해 첫 진입 부담을 줄입니다.',
      '자료는 한 번만 들어간 뒤 방향키로 고르고, 선택한 자료 작업은 한곳에 모아 둡니다.',
      '미리보기 대화상자를 닫으면 방금 사용한 작업 버튼으로 초점이 돌아옵니다.',
    ],
  },
};

const RUNNER_LABELS = {
  quickJump: '검색 결과로 바로 이동',
  footerJump: '검색 결과로 이동',
};

const GLOSSARY_ENTRIES = [
  {
    term: '비교안 A/B',
    description: '같은 과업을 두 가지 다른 화면 구조로 비교하기 위한 화면입니다. 자료 내용은 같고 이동 방식만 다릅니다.',
  },
  {
    term: '사전 계산 기준',
    description: '실제 실험 전에 미리 계산해 둔 예상 조작 부담 값입니다. 실제 기록과 나란히 비교합니다.',
  },
  {
    term: '검색 결과',
    description: '검색어에 맞아 화면에 표시된 자료 목록입니다.',
  },
  {
    term: '미리보기',
    description: '자료를 바로 열기 전에 핵심 내용만 잠깐 확인하는 작은 창입니다.',
  },
  {
    term: '저장',
    description: '나중에 다시 보려고 자료를 보관 목록에 넣는 기능입니다.',
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
  const task = searchTasks[taskIndex] ?? searchTasks[0];
  runtime.modal = null;
  runtime.isApplying = false;
  runtime.isWorking = false;
  runtime.liveStatus = '정렬 기준과 자료 범위를 맞춘 뒤 원하는 자료를 찾으십시오.';
  ensureCurrentResultVisible(runtime);
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
    sort: 'relevance',
    sortDraft: 'relevance',
    type: 'all',
    typeDraft: 'all',
    savedByResultId: {},
    openedResultId: null,
    currentResultId: searchScenario.results[0]?.id ?? null,
    previewVisitedThisTask: {},
    modal: null,
    liveStatus: '정렬 기준을 바꾸면 검색 결과 목록이 갱신됩니다.',
    taskResults: [],
    currentTaskLogger: null,
    isApplying: false,
    isWorking: false,
    lastTaskCompletionNote: '',
  };
}

function getOrCreateSessionId() {
  return getSharedSessionId({
    storageKey: STORAGE_KEY_SESSION,
    idPrefix: 'search-session',
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
  if (APP_MODE === 'runner') return searchTasks[state.taskIndex] ?? null;
  return searchTasks[state.currentTaskIndex] ?? null;
}

function hydrateConditionRuntime(variantId, snapshot = {}) {
  const runtime = createConditionRuntime(variantId);
  runtime.sort = snapshot.sort ?? runtime.sort;
  runtime.sortDraft = snapshot.sortDraft ?? runtime.sortDraft;
  runtime.type = snapshot.type ?? runtime.type;
  runtime.typeDraft = snapshot.typeDraft ?? runtime.typeDraft;
  runtime.savedByResultId = deepClone(snapshot.savedByResultId ?? runtime.savedByResultId);
  runtime.openedResultId = snapshot.openedResultId ?? null;
  runtime.currentResultId = snapshot.currentResultId ?? runtime.currentResultId;
  runtime.previewVisitedThisTask = deepClone(snapshot.previewVisitedThisTask ?? runtime.previewVisitedThisTask);
  runtime.lastTaskCompletionNote = snapshot.lastTaskCompletionNote ?? '';
  runtime.liveStatus = snapshot.liveStatus ?? runtime.liveStatus;
  ensureCurrentResultVisible(runtime);
  return runtime;
}

function serializeRuntimeSnapshot(run) {
  return {
    variantId: run.variantId,
    sort: run.sort,
    sortDraft: run.sortDraft,
    type: run.type,
    typeDraft: run.typeDraft,
    savedByResultId: deepClone(run.savedByResultId),
    openedResultId: run.openedResultId,
    currentResultId: run.currentResultId,
    previewVisitedThisTask: deepClone(run.previewVisitedThisTask),
    lastTaskCompletionNote: run.lastTaskCompletionNote,
    liveStatus: run.liveStatus,
  };
}

function applyRuntimeSnapshot(targetRun, snapshot) {
  const hydrated = hydrateConditionRuntime(targetRun.variantId, snapshot);
  targetRun.sort = hydrated.sort;
  targetRun.sortDraft = hydrated.sortDraft;
  targetRun.type = hydrated.type;
  targetRun.typeDraft = hydrated.typeDraft;
  targetRun.savedByResultId = hydrated.savedByResultId;
  targetRun.openedResultId = hydrated.openedResultId;
  targetRun.currentResultId = hydrated.currentResultId;
  targetRun.previewVisitedThisTask = hydrated.previewVisitedThisTask;
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
  run.isApplying = false;
  run.isWorking = false;
  run.previewVisitedThisTask = {};
  run.openedResultId = null;
  run.liveStatus = '과업 내용은 이 창에서 확인하고, 실제 수행은 새 탭에서 진행합니다.';
  ensureCurrentResultVisible(run);
  state.activeLaunch = null;
}

function continueAfterTask() {
  if (APP_MODE === 'runner') return;
  if (state.currentTaskIndex < searchTasks.length - 1) {
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

  const launchId = uniqueId('search-launch');
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
    targetResultId: task.targetResultId,
    openedResultIdAfterTask: run.openedResultId,
    savedByResultIdAfterTask: deepClone(run.savedByResultId),
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
    return;
  }

  if (action === 'apply-result-filters') {
    event.preventDefault();
    applyResultFilters();
    return;
  }

  if (action === 'select-result') {
    event.preventDefault();
    selectResult(actionTarget.dataset.resultId);
    return;
  }

  if (action === 'open-result-preview') {
    event.preventDefault();
    openResultPreview(actionTarget.dataset.resultId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'save-result') {
    event.preventDefault();
    saveResult(actionTarget.dataset.resultId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'open-result') {
    event.preventDefault();
    openResult(actionTarget.dataset.resultId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'dialog-close') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (action === 'jump-results') {
    event.preventDefault();
    focusElementNow('#search-heading');
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
    if (element.name === 'benchmark-profile') {
      state.benchmarkProfileFocus = element.value;
      render();
    }
    return;
  }

  const run = getCurrentRun();
  if (!run) return;
  if (element.name === 'sort') run.sortDraft = element.value;
  if (element.name === 'type') run.typeDraft = element.value;
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
    const resultOption = event.target.closest('[data-result-option="true"]');
    if (resultOption instanceof HTMLElement) {
      handleResultOptionNavigation(event, resultOption);
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

function getResultById(resultId) {
  return searchScenario.results.find((result) => result.id === resultId) ?? null;
}

function getSortLabel(sortId) {
  return searchScenario.sortOptions.find((option) => option.id === sortId)?.label ?? sortId;
}

function getTypeLabel(typeId) {
  return searchScenario.typeOptions.find((option) => option.id === typeId)?.label ?? typeId;
}

function getEffectiveSaveCount(result, run) {
  return result.saveCount + (run.savedByResultId[result.id] ? 1 : 0);
}

function getVisibleSearch(run) {
  const filtered = searchScenario.results.filter((result) => {
    if (run.type === 'all') return true;
    return result.type === run.type;
  });

  const sorted = filtered.slice().sort((left, right) => {
    if (run.sort === 'newest') {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    if (run.sort === 'title') {
      return left.title.localeCompare(right.title, 'ko');
    }
    return left.relevanceRank - right.relevanceRank;
  });

  return sorted;
}

function ensureCurrentResultVisible(run) {
  const visibleSearch = getVisibleSearch(run);
  run.currentResultId = visibleSearch.find((result) => result.id === run.currentResultId)?.id ?? visibleSearch[0]?.id ?? null;
}

function getSelectedVisibleResult(run) {
  ensureCurrentResultVisible(run);
  return getResultById(run.currentResultId);
}

function formatResultLabel(result, run) {
  return `${result.title} · ${result.badge} · ${result.timeLabel} · 저장 ${getEffectiveSaveCount(result, run)}`;
}

function formatRunStateSummary(run) {
  const openedResult = run.openedResultId ? getResultById(run.openedResultId) : null;
  const savedResults = Object.keys(run.savedByResultId)
    .filter((resultId) => run.savedByResultId[resultId])
    .map((resultId) => getResultById(resultId)?.title)
    .filter(Boolean);

  return [
    `정렬 기준 ${getSortLabel(run.sort)}`,
    `자료 범위 ${getTypeLabel(run.type)}`,
    openedResult ? `최근 바로 열기 ${openedResult.title}` : '최근 바로 열기 없음',
    savedResults.length > 0 ? `저장한 자료 ${savedResults.join(', ')}` : '저장한 자료 없음',
  ].join(' / ');
}

function buildResultSelector(resultId) {
  return `[data-result-option="true"][data-result-id="${resultId}"]`;
}

function selectResult(resultId) {
  const run = getCurrentRun();
  if (!run || !resultId) return;
  run.currentResultId = resultId;
  requestFocus(buildResultSelector(resultId));
  render();
}

function applyResultFilters() {
  const run = getCurrentRun();
  if (!run || run.isApplying || run.isWorking) return;

  run.isApplying = true;
  run.liveStatus = '정렬 기준과 자료 범위를 적용하는 중입니다…';
  render();

  window.setTimeout(() => {
    run.isApplying = false;
    run.sort = run.sortDraft;
    run.type = run.typeDraft;
    ensureCurrentResultVisible(run);
    const visibleSearch = getVisibleSearch(run);
    run.liveStatus = `현재 ${visibleSearch.length}개의 자료가 표시되었습니다.`;

    if (state.conditionId === 'variantB') {
      requestFocus('#search-heading');
    } else {
      requestFocus('[data-focus-id="apply-result-filters"]');
    }
    render();
  }, 280);
}

function noteWrongResultAction(resultId, actionType, extra = {}) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !resultId) return;

  const relevantActions = {
    closePreview: ['open-preview'],
    save: ['save-result'],
    open: ['open-preview', 'open-result'],
  };

  const isTarget = resultId === task.targetResultId;
  const actionRelevant = relevantActions[task.completion]?.includes(actionType);

  if ((!actionRelevant || isTarget) && !extra.previewMissing) return;

  run.currentTaskLogger?.note('wrong-selection', {
    actionType,
    resultId,
    targetResultId: task.targetResultId,
    ...extra,
  });
}

function openResultPreview(resultId, triggerFocusId) {
  const run = getCurrentRun();
  if (!run || run.isWorking) return;
  const result = getResultById(resultId);
  if (!result) return;

  noteWrongResultAction(resultId, 'open-preview');
  run.modal = {
    kind: 'result-preview',
    resultId,
    triggerFocusId,
  };
  run.currentTaskLogger?.note('open-result-preview', { resultId });
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
  const task = getCurrentTask();
  if (!run || !run.modal) return;
  const closingModal = run.modal;
  run.modal = null;

  if (closingModal.kind === 'result-preview' && closingModal.resultId) {
    run.previewVisitedThisTask = {
      ...run.previewVisitedThisTask,
      [closingModal.resultId]: true,
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
    run.currentTaskLogger?.note('context-reset', { reason: 'dialog-closed-returned-to-search-heading' });
    requestFocus('#search-heading');
  }

  if (task && isTaskSatisfied(task, run) && task.completion === 'closePreview' && closingModal.resultId === task.targetResultId) {
    finishRunnerTask('target-preview-closed');
    return;
  }

  render();
}

function saveResult(resultId, triggerFocusId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || run.isWorking) return;
  const result = getResultById(resultId);
  if (!result) return;

  noteWrongResultAction(resultId, 'save-result');
  const alreadySaved = Boolean(run.savedByResultId[resultId]);
  run.savedByResultId = {
    ...run.savedByResultId,
    [resultId]: true,
  };
  run.currentTaskLogger?.note('save-result', {
    resultId,
    alreadySaved,
  });

  if (isTaskSatisfied(task, run)) {
    finishRunnerTask('target-result-saved');
    return;
  }

  run.liveStatus = alreadySaved
    ? `${result.title} 자료는 이미 저장되어 있습니다.`
    : `${result.title} 자료를 저장했습니다.`;

  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
}

function openResult(resultId, triggerFocusId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || run.isWorking) return;
  const result = getResultById(resultId);
  if (!result) return;

  if (task.requiresPreviewVisit && resultId === task.targetResultId && !run.previewVisitedThisTask[resultId]) {
    noteWrongResultAction(resultId, 'open-result', { previewMissing: true });
  } else {
    noteWrongResultAction(resultId, 'open-result');
  }

  run.openedResultId = resultId;
  run.currentTaskLogger?.note('open-result', { resultId });

  if (isTaskSatisfied(task, run)) {
    finishRunnerTask('target-result-opened');
    return;
  }

  run.liveStatus = `${result.title} 자료를 바로 열었습니다.`;

  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
}

function isTaskSatisfied(task, run) {
  if (!task || !run) return false;
  if (task.requiredSort && run.sort !== task.requiredSort) return false;
  if (task.requiredType && run.type !== task.requiredType) return false;

  const previewDone = task.requiresPreviewVisit
    ? Boolean(run.previewVisitedThisTask[task.targetResultId])
    : true;

  if (task.completion === 'closePreview') {
    return previewDone;
  }

  if (task.completion === 'save') {
    return previewDone && Boolean(run.savedByResultId[task.targetResultId]);
  }

  if (task.completion === 'open') {
    return previewDone && run.openedResultId === task.targetResultId;
  }

  return false;
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
      `openedResult=${run.openedResultId ?? 'none'}`,
      `saved=${Object.keys(run.savedByResultId).filter((resultId) => run.savedByResultId[resultId]).join(',') || 'none'}`,
      `previewVisited=${Object.keys(run.previewVisitedThisTask).filter((resultId) => run.previewVisitedThisTask[resultId]).join(',') || 'none'}`,
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

function handleResultOptionNavigation(event, currentButton) {
  const run = getCurrentRun();
  if (!run || !currentButton.dataset.resultId) return;
  const visibleSearch = getVisibleSearch(run);
  const currentIndex = visibleSearch.findIndex((result) => result.id === currentButton.dataset.resultId);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, visibleSearch.length - 1);
  if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = visibleSearch.length - 1;

  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    run.currentResultId = visibleSearch[nextIndex].id;
    requestFocus(buildResultSelector(visibleSearch[nextIndex].id));
    render();
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
    return `수행 화면 · ${task?.title ?? '검색 결과 목록'}`;
  }
  if (state.view === 'serviceIntro') return '검색 결과 목록 서비스 화면';
  if (state.view === 'taskPrep' || state.view === 'taskRunning') return `과업 준비 · ${getCurrentTask()?.title ?? '검색 결과 목록'}`;
  if (state.view === 'taskReview') return '과업 결과 요약';
  if (state.view === 'conditionReview') return '비교안 요약';
  return '검색 결과 목록 최종 비교';
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
  const visibleSearch = getVisibleSearch(run);
  const task = getCurrentTask();

  return `
    <div class="runner-shell">
      ${conditionId === 'variantB' && !state.completed ? `<a class="skip-link" href="#search-heading" data-action="jump-results" data-focus-id="runner-skip-search">${RUNNER_LABELS.quickJump}</a>` : ''}
      <main class="runner-main" aria-label="검색 결과 목록 수행 화면" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <h1 class="sr-only" id="runner-title" tabindex="-1">${escapeHtml(task.title)} · ${escapeHtml(VARIANT_META[conditionId].title)}</h1>
        ${renderSearchHeader(conditionId)}
        ${renderResultControls(conditionId, run)}
        ${renderSearchSection(conditionId, run, visibleSearch)}
      </main>
      ${state.completed ? '' : `<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="live-status-region">${escapeHtml(run.liveStatus)}</div>`}
      ${state.completed ? '' : renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${run.modal ? renderResultModal(run.modal, run) : ''}
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
      <h1 id="service-heading" tabindex="-1">검색 결과 목록</h1>
      <p>
        같은 검색 결과를 두 가지 다른 이동 구조로 보여 주는 실험 화면입니다.
        이 화면에서 과업 준비 단계로 들어가거나, 다시 서비스 선택 화면으로 돌아갈 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번에 확인하는 것</h2>
          <ul>
            <li>자료마다 따로 흩어진 작업 버튼이 순차 탐색 부담을 얼마나 키우는지</li>
            <li>자료를 하나의 선택 항목으로 묶고 작업을 한곳에 모았을 때 부담이 얼마나 줄어드는지</li>
            <li>미리보기 대화상자를 닫은 뒤 같은 자료 작업으로 돌아오는 구조가 실제 기록에 어떤 차이를 만드는지</li>
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
  const benchmark = benchmarkResultsSearch.variants[conditionId].tasks[task.benchmarkTaskId];
  const activeLaunch = state.activeLaunch;
  const isRunning = state.view === 'taskRunning';
  const targetResult = getResultById(task.targetResultId);

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
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${searchTasks.length}</span>
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
          <div><dt>현재 검색 상태</dt><dd>${escapeHtml(formatRunStateSummary(run))}</dd></div>
          <div><dt>목표 자료</dt><dd>${escapeHtml(targetResult ? formatResultLabel(targetResult, run) : '없음')}</dd></div>
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
  return renderSharedLaunchStatusMessage(activeLaunch, isRunning);
}

function renderTaskReviewView() {
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const task = getCurrentTask();
  const result = run.taskResults.at(-1);
  const benchmark = benchmarkResultsSearch.variants[conditionId].tasks[result.benchmarkTaskId];
  const comparison = benchmarkResultsSearch.comparisons[result.benchmarkTaskId];

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
          <div><dt>목표와 다른 자료에서 동작</dt><dd>${result.wrongSelections}</dd></div>
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
              <li><strong>${escapeHtml(benchmarkResultsSearch.overall[profileId].label)}</strong>: ${value.expectedReductionSeconds}초 감소 예상 (${value.expectedReductionPercent}%)</li>
            `).join('')}
          </ul>
        </div>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-task">
        ${state.currentTaskIndex < searchTasks.length - 1 ? '다음 과업 준비' : '현재 비교안 요약 보기'}
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
          <div><dt>목표와 다른 자료에서 동작</dt><dd>${totals.wrongSelections}</dd></div>
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
          ${run.taskResults.map((result, index) => `<li><strong>${escapeHtml(searchTasks[index].title)}</strong> — ${formatSeconds(result.durationSeconds)}, 키 ${result.totalKeyInputs}회, 초점 이동 ${result.focusChanges}회</li>`).join('')}
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
      <p class="eyebrow">검색 결과 목록 실험 완료</p>
      <h1 id="final-summary-heading" tabindex="-1">비교안 A/B 최종 비교</h1>
      <p>실제 기록과 사전 계산 기준을 함께 보면서, 다음 서비스 유형으로 확장할 때 다시 쓸 기준점과 점검 기준을 마련했습니다.</p>
    </section>
    <section class="card toolbar-card">
      <label>
        <span>비교 기준 사용자 유형</span>
        <select name="benchmark-profile">
          ${Object.entries(benchmarkResultsSearch.overall).map(([profileId, profile]) => `
            <option value="${profileId}" ${profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>
          `).join('')}
        </select>
      </label>
      <div class="button-row">
        <a class="button button-secondary" download="search-results-${escapeHtml(state.sessionId)}.json" href="${exportUrl}">결과 파일(JSON) 내려받기</a>
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
          <tr><th>목표와 다른 자료에서 동작</th><td>${actualA.wrongSelections}</td><td>${actualB.wrongSelections}</td><td>${formatSigned(actualB.wrongSelections - actualA.wrongSelections)}</td></tr>
          <tr><th>위치 다시 찾기</th><td>${actualA.contextResets}</td><td>${actualB.contextResets}</td><td>${formatSigned(actualB.contextResets - actualA.contextResets)}</td></tr>
        </tbody>
      </table>
      <p class="muted">과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</p>
    </section>
    <section class="card">
      <h2>다음 단계에 바로 쓸 수 있는 포인트</h2>
      <ul>
        <li>검색 결과 목록도 메인 창과 수행 탭을 분리해 같은 운영 방식으로 확장했습니다.</li>
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
    benchmarkResults: benchmarkResultsSearch,
    variantMeta: VARIANT_META,
  });
}

function renderSearchHeader(conditionId) {
  const links = ['홈', '통합 검색 도움말', '검색 기록', '저장한 자료', '자료 요청', '이용 안내', '문의'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <nav aria-label="검색 보조 내비게이션">
        ${links.map((label, index) => `<a href="#" class="nav-link" data-focus-id="search-nav-${index + 1}" data-inert-link="true">${escapeHtml(label)}</a>`).join('')}
      </nav>
    </header>
  `;
}

function renderResultControls(conditionId, run) {
  return `
    <section class="card filters-card ${conditionId === 'variantA' ? 'filters-a' : 'filters-b'}">
      <div class="filters-header">
        <div>
          <h2 id="filters-heading">정렬과 자료 범위 선택</h2>
        </div>
      </div>
      <div class="filters-grid">
        <label>
          <span>정렬 기준</span>
          <select name="sort" data-focus-id="result-sort">
            ${searchScenario.sortOptions.map((option) => `<option value="${option.id}" ${run.sortDraft === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>자료 범위</span>
          <select name="type" data-focus-id="result-type">
            ${searchScenario.typeOptions.map((option) => `<option value="${option.id}" ${run.typeDraft === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="button-row">
        <a href="#" class="inline-link" data-focus-id="result-policy-link" data-inert-link="true">검색 도움말 보기</a>
        <a href="#" class="inline-link" data-focus-id="result-help-link" data-inert-link="true">자료 범위 설명 보기</a>
        <button class="button button-primary" data-action="apply-result-filters" data-focus-id="apply-result-filters" ${run.isApplying ? 'disabled' : ''}>
          ${run.isApplying ? '적용 중…' : '조건 적용'}
        </button>
      </div>
    </section>
  `;
}

function renderSearchSection(conditionId, run, visibleSearch) {
  return `
    <section class="card results-card">
      <div class="results-header">
        <div>
          <h2 id="search-heading" tabindex="-1">검색 결과</h2>
          <p class="muted">검색어 ${escapeHtml(searchScenario.queryLabel)} · 표시된 자료 ${visibleSearch.length}개</p>
        </div>
        ${conditionId === 'variantB' ? '<p class="keyboard-tip">방향키로 자료를 고르고 탭 키로 선택한 자료 작업으로 이동</p>' : '<p class="keyboard-tip">탭 키와 Shift+탭 키로 자료와 자료 작업을 차례대로 이동</p>'}
      </div>
      ${conditionId === 'variantA'
        ? renderVariantAResultList(run, visibleSearch)
        : renderVariantBResultList(run, visibleSearch)}
    </section>
  `;
}

function renderVariantAResultList(run, visibleSearch) {
  if (visibleSearch.length === 0) {
    return '<p class="muted">현재 조건에 맞는 자료가 없습니다.</p>';
  }

  return `
    <ul class="result-list result-list-a">
      ${visibleSearch.map((result) => `
        <li class="result-card ${run.openedResultId === result.id ? 'result-card-expanded' : ''}">
          <div class="result-card-head">
            <div class="result-head-links">
              <a href="#" class="inline-link" data-focus-id="result-title-${result.id}" data-inert-link="true">${escapeHtml(result.title)}</a>
              <span class="pill ${result.type === 'form' ? 'pill-warning' : ''}">${escapeHtml(result.badge)}</span>
              <a href="#" class="inline-link" data-focus-id="result-time-${result.id}" data-inert-link="true">${escapeHtml(result.timeLabel)}</a>
            </div>
            <a href="#" class="inline-link" data-focus-id="result-share-${result.id}" data-inert-link="true">공유</a>
          </div>
          <p class="result-summary"><strong>${escapeHtml(result.summary)}</strong></p>
          <p class="muted">${escapeHtml(result.body)}</p>
          ${renderKeywordList(result)}
          <div class="result-metrics muted">저장 ${getEffectiveSaveCount(result, run)} · 자료 유형 ${escapeHtml(result.badge)}</div>
          <div class="button-row result-action-row">
            <button class="button button-secondary" data-action="save-result" data-result-id="${result.id}" data-focus-id="result-save-${result.id}">저장</button>
            <button class="button button-ghost" data-action="open-result" data-result-id="${result.id}" data-focus-id="result-open-${result.id}">바로 열기</button>
            <button class="button button-ghost" data-action="open-result-preview" data-result-id="${result.id}" data-focus-id="result-preview-${result.id}">미리보기</button>
          </div>
          ${run.openedResultId === result.id ? renderOpenedResultStatus(result) : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function renderVariantBResultList(run, visibleSearch) {
  if (visibleSearch.length === 0) {
    return '<p class="muted">현재 조건에 맞는 자료가 없습니다.</p>';
  }
  ensureCurrentResultVisible(run);
  const selectedResult = getSelectedVisibleResult(run);
  const openedResult = run.openedResultId ? getResultById(run.openedResultId) : null;

  return `
    <div class="result-composite-layout">
      <div role="listbox" aria-label="검색 결과 목록" class="result-option-list">
        ${visibleSearch.map((result) => `
          <button
            role="option"
            class="result-option-button ${run.currentResultId === result.id ? 'result-option-button-active' : ''}"
            aria-selected="${run.currentResultId === result.id ? 'true' : 'false'}"
            data-action="select-result"
            data-result-option="true"
            data-result-id="${result.id}"
            data-focus-id="result-option-${result.id}"
            tabindex="${run.currentResultId === result.id ? '0' : '-1'}"
            aria-label="${escapeHtml(formatResultLabel(result, run))}"
          >
            <span class="result-option-top">
              <strong>${escapeHtml(result.title)}</strong>
              <span class="pill ${result.type === 'form' ? 'pill-warning' : ''}">${escapeHtml(result.badge)}</span>
            </span>
            <span class="muted">${escapeHtml(result.timeLabel)}</span>
            <span>${escapeHtml(result.summary)}</span>
            <span class="muted">저장 ${getEffectiveSaveCount(result, run)}</span>
          </button>
        `).join('')}
      </div>
      <section class="card selected-result-card">
        <h3 id="selected-result-heading">선택한 자료 작업</h3>
        ${selectedResult ? `
          <p class="goal">${escapeHtml(selectedResult.title)} · ${escapeHtml(selectedResult.badge)}</p>
          <p class="muted">${escapeHtml(selectedResult.summary)}</p>
          ${renderKeywordList(selectedResult)}
          <div class="button-row">
            <button class="button button-secondary" data-action="open-result-preview" data-result-id="${selectedResult.id}" data-focus-id="selected-preview-${selectedResult.id}">미리보기</button>
            <button class="button button-ghost" data-action="save-result" data-result-id="${selectedResult.id}" data-focus-id="selected-save-${selectedResult.id}">저장</button>
            <button class="button button-ghost" data-action="open-result" data-result-id="${selectedResult.id}" data-focus-id="selected-open-${selectedResult.id}">바로 열기</button>
          </div>
        ` : '<p class="muted">선택된 자료가 없습니다.</p>'}
      </section>
    </div>
    ${openedResult ? renderOpenedResultStatus(openedResult) : ''}
  `;
}

function renderKeywordList(result) {
  return `
    <ul class="chip-list result-keyword-list" aria-label="${escapeHtml(result.title)} 관련 낱말">
      ${result.keywords.map((keyword) => `<li>${escapeHtml(keyword)}</li>`).join('')}
    </ul>
  `;
}

function renderOpenedResultStatus(result) {
  return `
    <section class="result-status-card" aria-label="${escapeHtml(result.title)} 자료 상태">
      <h3>${escapeHtml(result.title)} 자료를 바로 열었습니다.</h3>
      <p class="muted">실험용 화면에서는 실제 새 페이지로 이동하지 않고, 이 자료를 열었다는 상태만 표시합니다.</p>
    </section>
  `;
}

function renderResultModal(modal, run) {
  const result = getResultById(modal.resultId);
  if (!result) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">미리보기 · ${escapeHtml(result.title)}</h2>
        <p id="dialog-description">${escapeHtml(result.summary)}</p>
        <dl class="meta-list compact">
          <div><dt>자료 유형</dt><dd>${escapeHtml(result.badge)}</dd></div>
          <div><dt>갱신 시각</dt><dd>${escapeHtml(result.timeLabel)}</dd></div>
          <div><dt>저장 수</dt><dd>${getEffectiveSaveCount(result, run)}</dd></div>
          <div><dt>관련 낱말</dt><dd>${escapeHtml(result.keywords.join(', '))}</dd></div>
        </dl>
        <p class="muted">${escapeHtml(result.body)}</p>
        <div class="button-row">
          <button class="button button-primary" data-action="dialog-close" data-dialog-close data-focus-id="result-dialog-close">닫기</button>
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
    benchmarkResults: benchmarkResultsSearch,
    conditionId,
  });
}

function buildExportPayload() {
  return buildSharedExportPayload({
    serviceId: 'search',
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actualRuns: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmarkResults: benchmarkResultsSearch,
  });
}

function buildExportDataUrl() {
  return buildSharedExportDataUrl(buildExportPayload());
}

function buildSurveyUrl() {
  return buildSharedSurveyUrl({
    baseUrl: SURVEY_CONFIG.baseUrl,
    sessionId: state.sessionId,
    serviceId: 'search',
    order: state.order,
    actualA: aggregateActualCondition(state.runs.variantA),
    actualB: aggregateActualCondition(state.runs.variantB),
  });
}

function formatSigned(value, suffix = '') {
  return formatSharedSigned(value, suffix);
}
