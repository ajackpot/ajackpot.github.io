import { commentsScenario } from './data/comments-scenario.js';
import { commentsTasks } from './data/tasks-comments.js';
import { benchmarkResultsComments } from './data/benchmark-results-comments.js';
import { createTaskLogger } from './lib/logger.js';
import {
  uniqueId,
  formatSeconds,
  escapeHtml,
  deepClone,
  getDefaultConditionOrder,
  renderRunnerFooterHtml,
  renderRunnerCompletionDialogHtml,
  renderSiteNoticeHtml,
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
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-comments-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-comments-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-comments-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-comments-channel-fallback';
const SURVEY_CONFIG = {
  baseUrl: '',
};

const MEASUREMENT_RULES = commonMeasurementRules;

const VARIANT_META = {
  variantA: {
    shortLabel: 'A',
    title: '비교안 A · 조작 부담이 큰 구조',
    subtitle: '댓글마다 여러 링크와 버튼을 지나야 하고, 댓글 정보 대화상자를 닫으면 댓글 목록 제목 근처부터 다시 찾아야 하는 구조',
    improvements: [
      '상단 링크와 정렬·범위 선택 뒤에 댓글 목록이 나옵니다.',
      '댓글마다 작성자, 작성 시각, 도움이 돼요, 답글 보기, 댓글 정보 보기 등이 따로 나뉘어 있어 순차 이동이 길어집니다.',
      '댓글 정보 대화상자를 닫으면 방금 보던 댓글 작업으로 돌아가지 않고 댓글 목록 제목 근처부터 다시 찾아야 합니다.',
    ],
  },
  variantB: {
    shortLabel: 'B',
    title: '비교안 B · 개선 구조',
    subtitle: '댓글 목록으로 바로 이동하고, 댓글을 하나의 선택 항목으로 고른 뒤, 댓글 작업을 한곳에서 이어서 수행하는 구조',
    improvements: [
      '댓글 목록으로 바로 이동해 첫 진입 부담을 줄입니다.',
      '댓글은 한 번만 들어간 뒤 방향키로 고르고, 댓글 작업은 한곳에 모아 둡니다.',
      '댓글 정보 대화상자를 닫으면 방금 사용한 작업 버튼으로 초점이 돌아옵니다.',
    ],
  },
};

const RUNNER_LABELS = {
  quickJump: '댓글 목록으로 바로 이동',
  footerJump: '댓글 목록으로 이동',
};

const GLOSSARY_ENTRIES = [
  {
    term: '비교안 A/B',
    description: '같은 과업을 두 가지 다른 화면 구조로 비교하기 위한 화면입니다. 댓글 내용은 같고 이동 방식만 다릅니다.',
  },
  {
    term: '초점',
    description: '키보드로 현재 선택되어 있는 위치입니다. 탭 키를 누를 때 초점이 다음 요소로 이동합니다.',
  },
  {
    term: '대화상자',
    description: '댓글 정보 확인처럼 잠깐 열리는 작은 창입니다.',
  },
  {
    term: '답글',
    description: '기존 댓글 아래에 이어지는 댓글입니다. 댓글 아래쪽에 묶여서 표시됩니다.',
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
  const task = commentsTasks[taskIndex] ?? commentsTasks[0];
  runtime.modal = null;
  runtime.isApplying = false;
  runtime.isWorking = false;
  runtime.liveStatus = '정렬 기준과 댓글 범위를 맞춘 뒤 원하는 댓글을 찾으십시오.';
  ensureCurrentCommentVisible(runtime);
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
    sort: 'popular',
    sortDraft: 'popular',
    category: 'all',
    categoryDraft: 'all',
    helpfulByCommentId: {},
    expandedCommentId: null,
    currentCommentId: commentsScenario.comments[0]?.id ?? null,
    detailVisitedThisTask: {},
    modal: null,
    liveStatus: '정렬 기준을 바꾸면 댓글 목록이 갱신됩니다.',
    taskResults: [],
    currentTaskLogger: null,
    isApplying: false,
    isWorking: false,
    lastTaskCompletionNote: '',
    finalConfirmationAcknowledged: false,
    siteNotice: '',
  };
}

function getOrCreateSessionId() {
  return getSharedSessionId({
    storageKey: STORAGE_KEY_SESSION,
    idPrefix: 'comments-session',
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
  if (APP_MODE === 'runner') return commentsTasks[state.taskIndex] ?? null;
  return commentsTasks[state.currentTaskIndex] ?? null;
}

function hydrateConditionRuntime(variantId, snapshot = {}) {
  const runtime = createConditionRuntime(variantId);
  runtime.sort = snapshot.sort ?? runtime.sort;
  runtime.sortDraft = snapshot.sortDraft ?? runtime.sortDraft;
  runtime.category = snapshot.category ?? runtime.category;
  runtime.categoryDraft = snapshot.categoryDraft ?? runtime.categoryDraft;
  runtime.helpfulByCommentId = deepClone(snapshot.helpfulByCommentId ?? runtime.helpfulByCommentId);
  runtime.expandedCommentId = snapshot.expandedCommentId ?? null;
  runtime.currentCommentId = snapshot.currentCommentId ?? runtime.currentCommentId;
  runtime.detailVisitedThisTask = deepClone(snapshot.detailVisitedThisTask ?? runtime.detailVisitedThisTask);
  runtime.lastTaskCompletionNote = snapshot.lastTaskCompletionNote ?? '';
  runtime.finalConfirmationAcknowledged = Boolean(snapshot.finalConfirmationAcknowledged);
  runtime.siteNotice = snapshot.siteNotice ?? '';
  runtime.liveStatus = snapshot.liveStatus ?? runtime.liveStatus;
  ensureCurrentCommentVisible(runtime);
  return runtime;
}

function serializeRuntimeSnapshot(run) {
  return {
    variantId: run.variantId,
    sort: run.sort,
    sortDraft: run.sortDraft,
    category: run.category,
    categoryDraft: run.categoryDraft,
    helpfulByCommentId: deepClone(run.helpfulByCommentId),
    expandedCommentId: run.expandedCommentId,
    currentCommentId: run.currentCommentId,
    detailVisitedThisTask: deepClone(run.detailVisitedThisTask),
    lastTaskCompletionNote: run.lastTaskCompletionNote,
    finalConfirmationAcknowledged: run.finalConfirmationAcknowledged,
    siteNotice: run.siteNotice,
    liveStatus: run.liveStatus,
  };
}

function applyRuntimeSnapshot(targetRun, snapshot) {
  const hydrated = hydrateConditionRuntime(targetRun.variantId, snapshot);
  targetRun.sort = hydrated.sort;
  targetRun.sortDraft = hydrated.sortDraft;
  targetRun.category = hydrated.category;
  targetRun.categoryDraft = hydrated.categoryDraft;
  targetRun.helpfulByCommentId = hydrated.helpfulByCommentId;
  targetRun.expandedCommentId = hydrated.expandedCommentId;
  targetRun.currentCommentId = hydrated.currentCommentId;
  targetRun.detailVisitedThisTask = hydrated.detailVisitedThisTask;
  targetRun.lastTaskCompletionNote = hydrated.lastTaskCompletionNote;
  targetRun.finalConfirmationAcknowledged = hydrated.finalConfirmationAcknowledged;
  targetRun.siteNotice = hydrated.siteNotice;
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
  run.detailVisitedThisTask = {};
  run.finalConfirmationAcknowledged = false;
  run.siteNotice = '';
  run.liveStatus = '과업 내용은 이 창에서 확인하고, 실제 수행은 새 탭에서 진행합니다.';
  ensureCurrentCommentVisible(run);
  state.activeLaunch = null;
}

function continueAfterTask() {
  if (APP_MODE === 'runner') return;
  if (state.currentTaskIndex < commentsTasks.length - 1) {
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

  const launchId = uniqueId('comments-launch');
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
    targetCommentId: task.targetCommentId,
    expandedCommentIdAfterTask: run.expandedCommentId,
    helpfulByCommentIdAfterTask: deepClone(run.helpfulByCommentId),
    conditionId,
  });

  if (state.activeLaunch) {
    state.activeLaunch.status = 'completed';
    state.activeLaunch.lastMessage = '결과를 전달받았습니다.';
    clearLaunchSnapshot(state.activeLaunch.launchId);
  }

  advanceAfterRunnerCompletion();
}

function advanceAfterRunnerCompletion() {
  state.activeLaunch = null;

  if (state.currentTaskIndex < commentsTasks.length - 1) {
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
    if (APP_MODE === 'runner') {
      const label = inertLink.textContent?.trim() || '해당';
      showSiteNotice(`${label} 기능은 현재 점검 중입니다. 이 화면 안에서 계속 진행하십시오.`);
      return;
    }
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

  if (action === 'site-placeholder') {
    event.preventDefault();
    showSiteNotice(actionTarget.dataset.notice || '해당 기능은 현재 점검 중입니다. 이 화면 안에서 계속 진행하십시오.');
    return;
  }

  if (action === 'end-task') {
    event.preventDefault();
    endRunnerTask();
    return;
  }

  if (action === 'apply-comment-filters') {
    event.preventDefault();
    applyCommentFilters();
    return;
  }

  if (action === 'select-comment') {
    event.preventDefault();
    selectComment(actionTarget.dataset.commentId);
    return;
  }

  if (action === 'toggle-replies') {
    event.preventDefault();
    toggleReplies(actionTarget.dataset.commentId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'open-comment-detail') {
    event.preventDefault();
    openCommentDetail(actionTarget.dataset.commentId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'mark-helpful') {
    event.preventDefault();
    markHelpful(actionTarget.dataset.commentId, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'dialog-close') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (action === 'jump-results') {
    event.preventDefault();
    focusElementNow('#comments-heading');
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
  if (element.name === 'category') run.categoryDraft = element.value;
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
    const commentOption = event.target.closest('[data-comment-option="true"]');
    if (commentOption instanceof HTMLElement) {
      handleCommentOptionNavigation(event, commentOption);
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

function getCommentById(commentId) {
  return commentsScenario.comments.find((comment) => comment.id === commentId) ?? null;
}

function getSortLabel(sortId) {
  return commentsScenario.sortOptions.find((option) => option.id === sortId)?.label ?? sortId;
}

function getCategoryLabel(categoryId) {
  return commentsScenario.categoryOptions.find((option) => option.id === categoryId)?.label ?? categoryId;
}

function getEffectiveHelpfulCount(comment, run) {
  return comment.helpfulCount + (run.helpfulByCommentId[comment.id] ? 1 : 0);
}

function getVisibleComments(run) {
  const filtered = commentsScenario.comments.filter((comment) => {
    if (run.category === 'all') return true;
    return comment.category === run.category;
  });

  const sorted = filtered.slice().sort((left, right) => {
    if (run.sort === 'newest') {
      return right.createdAt.localeCompare(left.createdAt);
    }
    if (run.sort === 'oldest') {
      return left.createdAt.localeCompare(right.createdAt);
    }
    const helpfulGap = getEffectiveHelpfulCount(right, run) - getEffectiveHelpfulCount(left, run);
    if (helpfulGap !== 0) return helpfulGap;
    return right.createdAt.localeCompare(left.createdAt);
  });

  return sorted;
}

function ensureCurrentCommentVisible(run) {
  const visibleComments = getVisibleComments(run);
  run.currentCommentId = visibleComments.find((comment) => comment.id === run.currentCommentId)?.id ?? visibleComments[0]?.id ?? null;
}

function getSelectedVisibleComment(run) {
  ensureCurrentCommentVisible(run);
  return getCommentById(run.currentCommentId);
}

function formatCommentLabel(comment, run) {
  return `${comment.author} · ${comment.badge} · ${comment.timeLabel} · 도움이 ${getEffectiveHelpfulCount(comment, run)} · 답글 ${comment.replyCount}`;
}

function formatRunStateSummary(run) {
  const expandedComment = run.expandedCommentId ? getCommentById(run.expandedCommentId) : null;
  const helpfulComments = Object.keys(run.helpfulByCommentId)
    .filter((commentId) => run.helpfulByCommentId[commentId])
    .map((commentId) => getCommentById(commentId)?.author)
    .filter(Boolean);
  return [
    `정렬 기준 ${getSortLabel(run.sort)}`,
    `댓글 범위 ${getCategoryLabel(run.category)}`,
    expandedComment ? `열린 답글 ${expandedComment.author} 댓글` : '열린 답글 없음',
    helpfulComments.length > 0 ? `도움이 돼요 표시 ${helpfulComments.join(', ')}` : '도움이 돼요 표시 없음',
  ].join(' / ');
}

function buildCommentSelector(commentId) {
  return `[data-comment-option="true"][data-comment-id="${commentId}"]`;
}

function selectComment(commentId) {
  const run = getCurrentRun();
  if (!run || !commentId) return;
  run.currentCommentId = commentId;
  requestFocus(buildCommentSelector(commentId));
  render();
}

function applyCommentFilters() {
  const run = getCurrentRun();
  if (!run || run.isApplying || run.isWorking) return;

  run.isApplying = true;
  run.liveStatus = '정렬 기준과 댓글 범위를 적용하는 중입니다…';
  render();

  window.setTimeout(() => {
    run.isApplying = false;
    run.sort = run.sortDraft;
    run.category = run.categoryDraft;
    ensureCurrentCommentVisible(run);
    const visibleComments = getVisibleComments(run);
    run.liveStatus = `현재 ${visibleComments.length}개의 댓글이 표시되었습니다.`;

    if (state.conditionId === 'variantB') {
      requestFocus('#comments-heading');
    } else {
      requestFocus('[data-focus-id="apply-comment-filters"]');
    }
    render();
  }, 280);
}

function noteWrongCommentAction(commentId, actionType) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !commentId || commentId === task.targetCommentId) return;
  const relevantActions = {
    expandReplies: ['toggle-replies'],
    helpful: ['open-detail', 'mark-helpful'],
  };
  if (!relevantActions[task.completion]?.includes(actionType)) return;
  run.currentTaskLogger?.note('wrong-selection', {
    actionType,
    commentId,
    targetCommentId: task.targetCommentId,
  });
}

function openCommentDetail(commentId, triggerFocusId) {
  const run = getCurrentRun();
  if (!run || run.isWorking) return;
  const comment = getCommentById(commentId);
  if (!comment) return;
  noteWrongCommentAction(commentId, 'open-detail');
  run.modal = {
    kind: 'comment-detail',
    commentId,
    triggerFocusId,
  };
  run.currentTaskLogger?.note('open-comment-detail', { commentId });
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

  if (closingModal.kind === 'comment-detail' && closingModal.commentId) {
    run.detailVisitedThisTask = {
      ...run.detailVisitedThisTask,
      [closingModal.commentId]: true,
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
    run.currentTaskLogger?.note('context-reset', { reason: 'dialog-closed-returned-to-comments-heading' });
    requestFocus('#comments-heading');
  }
  render();
}

function toggleReplies(commentId, triggerFocusId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || run.isWorking) return;
  const comment = getCommentById(commentId);
  if (!comment) return;
  noteWrongCommentAction(commentId, 'toggle-replies');

  const expanding = run.expandedCommentId !== commentId;
  run.expandedCommentId = expanding ? commentId : null;
  run.currentTaskLogger?.note('toggle-replies', {
    commentId,
    expanded: expanding,
  });

  if (isTaskSatisfied(task, run)) {
    openTaskFinalModal({
      title: '답글을 표시했습니다.',
      description: '요청한 댓글의 답글이 화면에 열렸습니다. 확인한 뒤 과업 종료 버튼을 누르십시오.',
    });
    return;
  }

  run.liveStatus = expanding
    ? `${comment.author} 댓글의 답글 ${comment.replyCount}개를 펼쳤습니다.`
    : `${comment.author} 댓글의 답글을 접었습니다.`;

  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
}

function markHelpful(commentId, triggerFocusId) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || run.isWorking) return;
  const comment = getCommentById(commentId);
  if (!comment) return;
  noteWrongCommentAction(commentId, 'mark-helpful');

  const alreadyHelpful = Boolean(run.helpfulByCommentId[commentId]);
  run.helpfulByCommentId = {
    ...run.helpfulByCommentId,
    [commentId]: true,
  };
  run.currentTaskLogger?.note('mark-helpful', {
    commentId,
    alreadyHelpful,
  });

  if (isTaskSatisfied(task, run)) {
    openTaskFinalModal({
      title: '의견이 반영되었습니다.',
      description: '도움이 돼요 표시가 반영되었습니다. 확인한 뒤 과업 종료 버튼을 누르십시오.',
    });
    return;
  }

  run.liveStatus = alreadyHelpful
    ? `${comment.author} 댓글에는 이미 도움이 돼요가 표시되어 있습니다.`
    : `${comment.author} 댓글에 도움이 돼요를 표시했습니다.`;
  if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
}

function isTaskSatisfied(task, run) {
  if (!task || !run) return false;
  if (task.requiredSort && run.sort !== task.requiredSort) return false;
  if (task.requiredCategory && run.category !== task.requiredCategory) return false;

  if (task.completion === 'expandReplies') {
    return run.expandedCommentId === task.targetCommentId;
  }

  if (task.completion === 'helpful') {
    const helpfulDone = Boolean(run.helpfulByCommentId[task.targetCommentId]);
    const detailDone = task.requiresDetailVisit ? Boolean(run.detailVisitedThisTask[task.targetCommentId]) : true;
    return helpfulDone && detailDone;
  }

  return false;
}

function endRunnerTask() {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger || state.completed) return;

  const success = isTaskSatisfied(task, run) && run.finalConfirmationAcknowledged;
  const reason = success ? 'participant-ended-after-final-confirmation' : 'participant-ended-incomplete-or-unable';
  if (!success) {
    run.currentTaskLogger.note('task-ended-incomplete', {
      taskId: task.id,
      finalConfirmationAcknowledged: run.finalConfirmationAcknowledged,
    });
  }
  finishRunnerTask(reason, success);
}

function finishRunnerTask(reason, success = true) {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger) return;

  const summary = run.currentTaskLogger.finish({
    success,
    reason,
    notes: [
      `expandedComment=${run.expandedCommentId ?? 'none'}`,
      `helpful=${Object.keys(run.helpfulByCommentId).filter((commentId) => run.helpfulByCommentId[commentId]).join(',') || 'none'}`,
      `finalConfirmationAcknowledged=${run.finalConfirmationAcknowledged}`,
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

function handleCommentOptionNavigation(event, currentButton) {
  const run = getCurrentRun();
  if (!run || !currentButton.dataset.commentId) return;
  const visibleComments = getVisibleComments(run);
  const currentIndex = visibleComments.findIndex((comment) => comment.id === currentButton.dataset.commentId);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, visibleComments.length - 1);
  if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = visibleComments.length - 1;

  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    run.currentCommentId = visibleComments[nextIndex].id;
    requestFocus(buildCommentSelector(visibleComments[nextIndex].id));
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
    return `수행 화면 · ${task?.title ?? '댓글 목록'}`;
  }
  if (state.view === 'serviceIntro') return '댓글 목록 서비스 화면';
  if (state.view === 'taskPrep' || state.view === 'taskRunning') return `과업 준비 · ${getCurrentTask()?.title ?? '댓글 목록'}`;
  if (state.view === 'taskReview') return '과업 결과 요약';
  if (state.view === 'conditionReview') return '비교안 요약';
  return '댓글 목록 최종 비교';
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
  const visibleComments = getVisibleComments(run);
  const task = getCurrentTask();

  return `
    <div class="runner-shell">
      <main class="runner-main" aria-label="댓글 목록 수행 화면" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <h1 class="sr-only" id="runner-title" tabindex="-1">${escapeHtml(task.title)} · 댓글 목록 수행 화면</h1>
        ${renderCommentsHeader(conditionId)}
        ${renderCommentControls(conditionId, run)}
        ${renderCommentsSection(conditionId, run, visibleComments)}
      </main>
      ${state.completed ? '' : `<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="live-status-region">${escapeHtml(run.liveStatus)}</div>`}
      ${state.completed ? '' : renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${state.completed ? '' : renderSiteNoticeHtml(run.siteNotice)}
      ${run.modal ? renderCommentModal(run.modal, run) : ''}
      ${state.completed
        ? renderRunnerCompletionDialogHtml({
          description: `${task.title} 기록을 원래 창으로 전달했습니다. 확인 버튼을 누르면 이 탭이 닫힙니다.`,
        })
        : ''}
    </div>
  `;
}

function renderServiceIntroView() {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">댓글 목록</h1>
      <p>게시글의 댓글 목록에서 필요한 댓글 작업을 수행합니다. 과업 수행은 별도 탭에서 진행하며, 이 창에는 과업 요청이 남아 있습니다.</p>
      <div class="hero-grid">
        <section>
          <h2>진행 방법</h2>
          <ul>
            <li>두 개의 화면은 자동으로 섞인 순서로 열립니다.</li>
            <li>각 화면에서 같은 과업 묶음을 수행합니다.</li>
            <li>수행 탭에서 과업이 끝났다고 판단하면 하단의 과업 종료 버튼을 누릅니다.</li>
          </ul>
        </section>
        <section>
          <h2>주의할 점</h2>
          <ul>
            <li>과업 요청은 이 창에서 다시 확인할 수 있습니다.</li>
            <li>수행할 수 없다고 판단해도 수행 탭의 과업 종료 버튼으로 다음 단계로 넘어갑니다.</li>
            <li>모든 결과는 두 화면을 모두 수행한 뒤 한 번에 표시됩니다.</li>
          </ul>
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
  const task = getCurrentTask();
  const activeLaunch = state.activeLaunch;
  const isRunning = state.view === 'taskRunning';
  const screenIndex = state.currentConditionIndex + 1;

  return `
    <section class="card review-hero">
      <div>
        <p class="eyebrow">수행 준비</p>
        <h1 id="task-prep-heading" tabindex="-1">과업 ${state.currentTaskIndex + 1} 준비</h1>
        <p>아래 요청만 확인한 뒤 새 탭에서 댓글 목록 화면을 사용하십시오.</p>
      </div>
      <div class="pill-group">
        <span class="pill">실험 번호 ${escapeHtml(state.sessionId)}</span>
        <span class="pill">화면 ${screenIndex} / ${state.order.length}</span>
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${commentsTasks.length}</span>
      </div>
    </section>

    <section class="review-grid">
      <article class="card">
        <h2>이번 요청</h2>
        <p class="goal">${escapeHtml(task.goalSummary)}</p>
      </article>

      <article class="card">
        <h2>진행 방법</h2>
        <ul>
          <li>수행 화면은 새 탭으로 열립니다. 과업 요청을 다시 확인해야 하면 이 창으로 돌아오십시오.</li>
          <li><strong>과업을 모두 수행했다고 판단하면 수행 탭 하단의 과업 종료 버튼을 누르십시오.</strong></li>
          <li>수행할 수 없다고 판단해도 과업 종료 버튼을 누르면 다음 단계로 넘어갑니다.</li>
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
  const benchmark = benchmarkResultsComments.variants[conditionId].tasks[result.benchmarkTaskId];
  const comparison = benchmarkResultsComments.comparisons[result.benchmarkTaskId];

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
          <div><dt>목표와 다른 댓글에서 동작</dt><dd>${result.wrongSelections}</dd></div>
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
              <li><strong>${escapeHtml(benchmarkResultsComments.overall[profileId].label)}</strong>: ${value.expectedReductionSeconds}초 감소 예상 (${value.expectedReductionPercent}%)</li>
            `).join('')}
          </ul>
        </div>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-task">
        ${state.currentTaskIndex < commentsTasks.length - 1 ? '다음 과업 준비' : '현재 비교안 요약 보기'}
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
          <div><dt>목표와 다른 댓글에서 동작</dt><dd>${totals.wrongSelections}</dd></div>
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
          ${run.taskResults.map((result, index) => `<li><strong>${escapeHtml(commentsTasks[index].title)}</strong> — ${formatSeconds(result.durationSeconds)}, 키 ${result.totalKeyInputs}회, 초점 이동 ${result.focusChanges}회</li>`).join('')}
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
      <p class="eyebrow">댓글 목록 실험 완료</p>
      <h1 id="final-summary-heading" tabindex="-1">비교안 A/B 최종 비교</h1>
      <p>실제 기록과 사전 계산 기준을 함께 보면서, 다음 서비스 유형으로 확장할 때 다시 쓸 기준점과 점검 기준을 마련했습니다.</p>
    </section>
    <section class="card toolbar-card">
      <label>
        <span>비교 기준 사용자 유형</span>
        <select name="benchmark-profile">
          ${Object.entries(benchmarkResultsComments.overall).map(([profileId, profile]) => `
            <option value="${profileId}" ${profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>
          `).join('')}
        </select>
      </label>
      <div class="button-row">
        <a class="button button-secondary" download="comments-list-${escapeHtml(state.sessionId)}.json" href="${exportUrl}">결과 파일(JSON) 내려받기</a>
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
          <tr><th>목표와 다른 댓글에서 동작</th><td>${actualA.wrongSelections}</td><td>${actualB.wrongSelections}</td><td>${formatSigned(actualB.wrongSelections - actualA.wrongSelections)}</td></tr>
          <tr><th>위치 다시 찾기</th><td>${actualA.contextResets}</td><td>${actualB.contextResets}</td><td>${formatSigned(actualB.contextResets - actualA.contextResets)}</td></tr>
          <tr><th>수행 불가능 기록</th><td>${actualA.incompleteCount}</td><td>${actualB.incompleteCount}</td><td>${formatSigned(actualB.incompleteCount - actualA.incompleteCount)}</td></tr>
        </tbody>
      </table>
      <p class="muted">과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</p>
    </section>
    <section class="card">
      <h2>기록 확인 안내</h2>
      <ul>
        <li>댓글 목록도 메인 창과 수행 탭을 분리해 같은 운영 방식으로 확장했습니다.</li>
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
    benchmarkResults: benchmarkResultsComments,
    variantMeta: VARIANT_META,
  });
}

function renderCommentsHeader(conditionId) {
  const links = ['게시글 목록', '인기 글', '이용 안내', '새 글 쓰기', '알림', '내 댓글', '커뮤니티 규칙', '문의'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <div class="sim-topbar">
        <a href="#" class="brand-link" data-focus-id="community-home" data-inert-link="true">마음돌봄 커뮤니티</a>
        <div class="sim-post-summary" aria-label="현재 게시글">
          <strong>${escapeHtml(commentsScenario.postTitle)}</strong>
          <span class="muted">댓글 ${commentsScenario.comments.length}개 · 조회 1,284</span>
        </div>
        <div class="sim-actions">
          <button class="button button-ghost" data-action="site-placeholder" data-focus-id="post-bookmark" data-notice="게시글 보관 기능은 현재 점검 중입니다.">게시글 보관</button>
          <button class="button button-ghost" data-action="site-placeholder" data-focus-id="post-report" data-notice="신고 접수 화면은 현재 점검 중입니다.">신고</button>
        </div>
      </div>
      <nav aria-label="커뮤니티 보조 내비게이션">
        ${links.map((label, index) => `<a href="#" class="nav-link" data-focus-id="community-nav-${index + 1}" data-inert-link="true">${escapeHtml(label)}</a>`).join('')}
      </nav>
    </header>
  `;
}

function renderCommentControls(conditionId, run) {
  return `
    <section class="card filters-card ${conditionId === 'variantA' ? 'filters-a' : 'filters-b'}">
      <div class="filters-header">
        <div>
          <h2 id="filters-heading">정렬과 범위 선택</h2>
        </div>
      </div>
      <div class="filters-grid">
        <label>
          <span>정렬 기준</span>
          <select name="sort" data-focus-id="comment-sort">
            ${commentsScenario.sortOptions.map((option) => `<option value="${option.id}" ${run.sortDraft === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>댓글 범위</span>
          <select name="category" data-focus-id="comment-category">
            ${commentsScenario.categoryOptions.map((option) => `<option value="${option.id}" ${run.categoryDraft === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="button-row">
        <a href="#" class="inline-link" data-focus-id="comment-policy-link" data-inert-link="true">댓글 운영 기준 보기</a>
        <a href="#" class="inline-link" data-focus-id="comment-help-link" data-inert-link="true">작성 안내 보기</a>
        <button class="button button-primary" data-action="apply-comment-filters" data-focus-id="apply-comment-filters" ${run.isApplying ? 'disabled' : ''}>
          ${run.isApplying ? '적용 중…' : '조건 적용'}
        </button>
      </div>
    </section>
  `;
}

function renderCommentsSection(conditionId, run, visibleComments) {
  return `
    <section class="card results-card">
      <div class="results-header">
        <div>
          <h2 id="comments-heading" tabindex="-1">댓글 목록</h2>
          <p class="muted">표시된 댓글 ${visibleComments.length}개 · 게시글 제목 ${escapeHtml(commentsScenario.postTitle)}</p>
        </div>
        ${conditionId === 'variantB' ? '<p class="keyboard-tip">방향키로 댓글을 고르고 탭 키로 댓글 작업으로 이동</p>' : '<p class="keyboard-tip">탭 키와 Shift+탭 키로 댓글과 댓글 작업을 차례대로 이동</p>'}
      </div>
      ${conditionId === 'variantA'
        ? renderVariantACommentList(run, visibleComments)
        : renderVariantBCommentList(run, visibleComments)}
    </section>
  `;
}

function renderVariantACommentList(run, visibleComments) {
  if (visibleComments.length === 0) {
    return '<p class="muted">현재 조건에 맞는 댓글이 없습니다.</p>';
  }

  return `
    <ul class="comment-list comment-list-a">
      ${visibleComments.map((comment) => `
        <li class="comment-card ${run.expandedCommentId === comment.id ? 'comment-card-expanded' : ''}">
          <div class="comment-card-head">
            <div class="comment-head-links">
              <a href="#" class="inline-link" data-focus-id="comment-author-${comment.id}" data-inert-link="true">${escapeHtml(comment.author)}</a>
              <span class="pill ${comment.category === 'notice' ? 'pill-warning' : ''}">${escapeHtml(comment.badge)}</span>
              <a href="#" class="inline-link" data-focus-id="comment-time-${comment.id}" data-inert-link="true">${escapeHtml(comment.timeLabel)}</a>
            </div>
            <a href="#" class="inline-link" data-focus-id="comment-share-${comment.id}" data-inert-link="true">공유</a>
          </div>
          <p class="comment-summary"><strong>${escapeHtml(comment.summary)}</strong></p>
          <p class="muted">${escapeHtml(comment.body)}</p>
          <div class="comment-metrics muted">도움이 ${getEffectiveHelpfulCount(comment, run)} · 답글 ${comment.replyCount}</div>
          <div class="button-row comment-action-row">
            <button class="button button-secondary" data-action="mark-helpful" data-comment-id="${comment.id}" data-focus-id="comment-helpful-${comment.id}">도움이 돼요</button>
            <button class="button button-ghost" data-action="toggle-replies" data-comment-id="${comment.id}" data-focus-id="comment-replies-${comment.id}">${run.expandedCommentId === comment.id ? `답글 ${comment.replyCount}개 닫기` : `답글 ${comment.replyCount}개 보기`}</button>
            <button class="button button-ghost" data-action="open-comment-detail" data-comment-id="${comment.id}" data-focus-id="comment-detail-${comment.id}">댓글 정보 보기</button>
          </div>
          ${run.expandedCommentId === comment.id ? renderReplyList(comment) : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function renderVariantBCommentList(run, visibleComments) {
  if (visibleComments.length === 0) {
    return '<p class="muted">현재 조건에 맞는 댓글이 없습니다.</p>';
  }
  ensureCurrentCommentVisible(run);
  const selectedComment = getSelectedVisibleComment(run);
  const expandedComment = run.expandedCommentId ? getCommentById(run.expandedCommentId) : null;

  return `
    <div class="comment-composite-layout">
      <div role="listbox" aria-label="댓글 목록" class="comment-option-list">
        ${visibleComments.map((comment) => `
          <button
            role="option"
            class="comment-option-button ${run.currentCommentId === comment.id ? 'comment-option-button-active' : ''}"
            aria-selected="${run.currentCommentId === comment.id ? 'true' : 'false'}"
            data-action="select-comment"
            data-comment-option="true"
            data-comment-id="${comment.id}"
            data-focus-id="comment-option-${comment.id}"
            tabindex="${run.currentCommentId === comment.id ? '0' : '-1'}"
            aria-label="${escapeHtml(formatCommentLabel(comment, run))}"
          >
            <span class="comment-option-top">
              <strong>${escapeHtml(comment.author)}</strong>
              <span class="pill ${comment.category === 'notice' ? 'pill-warning' : ''}">${escapeHtml(comment.badge)}</span>
            </span>
            <span class="muted">${escapeHtml(comment.timeLabel)}</span>
            <span>${escapeHtml(comment.summary)}</span>
            <span class="muted">도움이 ${getEffectiveHelpfulCount(comment, run)} · 답글 ${comment.replyCount}</span>
          </button>
        `).join('')}
      </div>
      <section class="card selected-comment-card">
        <h3 id="selected-comment-heading">선택한 댓글 작업</h3>
        ${selectedComment ? `
          <p class="goal">${escapeHtml(selectedComment.author)} · ${escapeHtml(selectedComment.badge)}</p>
          <p class="muted">${escapeHtml(selectedComment.summary)}</p>
          <div class="button-row">
            <button class="button button-secondary" data-action="toggle-replies" data-comment-id="${selectedComment.id}" data-focus-id="selected-replies-${selectedComment.id}">${run.expandedCommentId === selectedComment.id ? `답글 ${selectedComment.replyCount}개 닫기` : `답글 ${selectedComment.replyCount}개 보기`}</button>
            <button class="button button-ghost" data-action="open-comment-detail" data-comment-id="${selectedComment.id}" data-focus-id="selected-detail-${selectedComment.id}">댓글 정보 보기</button>
            <button class="button button-ghost" data-action="mark-helpful" data-comment-id="${selectedComment.id}" data-focus-id="selected-helpful-${selectedComment.id}">도움이 돼요</button>
          </div>
        ` : '<p class="muted">선택된 댓글이 없습니다.</p>'}
      </section>
    </div>
    ${expandedComment ? renderReplyList(expandedComment) : ''}
  `;
}

function renderReplyList(comment) {
  return `
    <section class="reply-card" aria-label="${escapeHtml(comment.author)} 댓글의 답글 목록">
      <h3>${escapeHtml(comment.author)} 댓글의 답글 ${comment.replyCount}개</h3>
      <ul class="reply-list">
        ${comment.replies.map((reply) => `<li><strong>${escapeHtml(reply.author)}</strong> · ${escapeHtml(reply.text)}</li>`).join('')}
      </ul>
    </section>
  `;
}

function renderCommentModal(modal, run) {
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

  const comment = getCommentById(modal.commentId);
  if (!comment) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">댓글 정보 보기 · ${escapeHtml(comment.author)}</h2>
        <p id="dialog-description">${escapeHtml(comment.summary)}</p>
        <dl class="meta-list compact">
          <div><dt>댓글 범위</dt><dd>${escapeHtml(comment.badge)}</dd></div>
          <div><dt>작성 시각</dt><dd>${escapeHtml(comment.timeLabel)}</dd></div>
          <div><dt>도움이 수</dt><dd>${getEffectiveHelpfulCount(comment, run)}</dd></div>
          <div><dt>답글 수</dt><dd>${comment.replyCount}</dd></div>
        </dl>
        <p class="muted">${escapeHtml(comment.body)}</p>
        <div class="button-row">
          <button class="button button-primary" data-action="dialog-close" data-dialog-close data-focus-id="comment-dialog-close">닫기</button>
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
  });
  totals.successCount = run.taskResults.filter((result) => result.success).length;
  totals.incompleteCount = run.taskResults.length - totals.successCount;
  return totals;
}

function aggregateBenchmarkCondition(conditionId) {
  return aggregateSharedBenchmarkCondition({
    benchmarkResults: benchmarkResultsComments,
    conditionId,
  });
}

function buildExportPayload() {
  return buildSharedExportPayload({
    serviceId: 'comments',
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actualRuns: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmarkResults: benchmarkResultsComments,
  });
}

function buildExportDataUrl() {
  return buildSharedExportDataUrl(buildExportPayload());
}

function buildSurveyUrl() {
  return buildSharedSurveyUrl({
    baseUrl: SURVEY_CONFIG.baseUrl,
    sessionId: state.sessionId,
    serviceId: 'comments',
    order: state.order,
    actualA: aggregateActualCondition(state.runs.variantA),
    actualB: aggregateActualCondition(state.runs.variantB),
  });
}

function formatSigned(value, suffix = '') {
  return formatSharedSigned(value, suffix);
}
