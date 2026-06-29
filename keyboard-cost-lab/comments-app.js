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
  renderRunnerTaskRequestHtml,
  renderRunnerFooterHtml,
  renderRunnerCompletionDialogHtml,
  renderEndTaskConfirmationDialogHtml,
  renderTaskRequestVisibilitySwitchHtml,
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
  renderProfileBenchmarkTable as renderSharedProfileBenchmarkTable,
  renderLaunchStatusMessage as renderSharedLaunchStatusMessage,
  renderFinalConditionCard as renderSharedFinalConditionCard,
  aggregateBenchmarkCondition as aggregateSharedBenchmarkCondition,
  buildExportPayload as buildSharedExportPayload,
  buildExportDataUrl as buildSharedExportDataUrl,
  formatSigned as formatSharedSigned,
  aggregateMetrics,
} from './lib/service-shell.js';
import {
  readStoredExperimentResults,
  saveServiceRunSnapshot,
} from './lib/experiment-store.js';
import {
  renderSurveyTransferPanel,
} from './lib/survey-link.js';

const APP_MODE = getAppMode();
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-comments-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-comments-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-comments-channel-fallback';
const MEASUREMENT_RULES = commonMeasurementRules;

const SERVICE_ID = 'comments';
const SERVICE_LABEL = '댓글 목록';

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

const REPLY_AUTHOR_NAME_POOL = [
  '보라', '승민', '민석', '태경', '지원팀', '다은', '윤아', '해솔',
  '나래', '도윤', '서연', '정우', '가온', '유진', '민재', '하린',
  '지우', '현우', '수아', '예준', '서진', '다온', '연우', '지민',
];
const REPLY_QUESTION_OPTION_COUNT = 5;

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
    state.activeLaunch.lastMessage = '과업 수행 페이지가 열렸습니다. 이 창에 과업 안내가 그대로 남아 있습니다.';
    render();
    return;
  }

  if (message.type === 'runner-started') {
    state.activeLaunch.status = 'started';
    state.activeLaunch.lastMessage = '과업 수행 페이지에서 첫 조작이 들어가 실제 계측이 시작되었습니다.';
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
      state.activeLaunch.lastMessage = '과업 수행 페이지가 닫혔습니다. 필요하면 새 탭을 다시 열 수 있습니다.';
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
  const launchPayload = launchId ? readLaunchSnapshot(launchId) : null;

  if (!launchPayload) {
    return {
      sessionId,
      conditionId,
      taskIndex,
      launchId,
      showTaskRequestInRunner: false,
      focusRequest: null,
      completed: false,
      run: createConditionRuntime(conditionId),
      error: '수행에 필요한 시작 정보가 없습니다. 원래 테스트 창에서 과업을 다시 여십시오.',
    };
  }

  const runtime = hydrateConditionRuntime(conditionId, launchPayload.runSnapshot);
  const task = commentsTasks[taskIndex] ?? commentsTasks[0];
  ensureReplyAuthorAssignmentForTask(runtime, task);
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
    sort: 'popular',
    sortDraft: 'popular',
    category: 'all',
    categoryDraft: 'all',
    helpfulByCommentId: {},
    featurePanel: null,
    savedFeatureItems: {},
    expandedCommentId: null,
    replyListVisitedThisTask: {},
    replyAnswerDrafts: {},
    submittedReplyAnswers: {},
    replyAuthorAssignments: {},
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
  runtime.featurePanel = snapshot.featurePanel ? deepClone(snapshot.featurePanel) : null;
  runtime.savedFeatureItems = deepClone(snapshot.savedFeatureItems ?? runtime.savedFeatureItems);
  runtime.expandedCommentId = snapshot.expandedCommentId ?? null;
  runtime.replyListVisitedThisTask = deepClone(snapshot.replyListVisitedThisTask ?? runtime.replyListVisitedThisTask);
  runtime.replyAnswerDrafts = deepClone(snapshot.replyAnswerDrafts ?? runtime.replyAnswerDrafts);
  runtime.submittedReplyAnswers = deepClone(snapshot.submittedReplyAnswers ?? runtime.submittedReplyAnswers);
  runtime.replyAuthorAssignments = deepClone(snapshot.replyAuthorAssignments ?? runtime.replyAuthorAssignments);
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
    featurePanel: run.featurePanel ? deepClone(run.featurePanel) : null,
    savedFeatureItems: deepClone(run.savedFeatureItems),
    expandedCommentId: run.expandedCommentId,
    replyListVisitedThisTask: deepClone(run.replyListVisitedThisTask),
    replyAnswerDrafts: deepClone(run.replyAnswerDrafts),
    submittedReplyAnswers: deepClone(run.submittedReplyAnswers),
    replyAuthorAssignments: deepClone(run.replyAuthorAssignments),
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
  targetRun.featurePanel = hydrated.featurePanel;
  targetRun.savedFeatureItems = hydrated.savedFeatureItems;
  targetRun.expandedCommentId = hydrated.expandedCommentId;
  targetRun.replyListVisitedThisTask = hydrated.replyListVisitedThisTask;
  targetRun.replyAnswerDrafts = hydrated.replyAnswerDrafts;
  targetRun.submittedReplyAnswers = hydrated.submittedReplyAnswers;
  targetRun.replyAuthorAssignments = hydrated.replyAuthorAssignments;
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
  state.runnerTaskRequestVisible = false;
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
  run.featurePanel = null;
  run.replyListVisitedThisTask = {};
  run.replyAnswerDrafts = {};
  run.submittedReplyAnswers = {};
  ensureReplyAuthorAssignmentForTask(run, task, { avoidCorrectValue: getOtherConditionReplyCorrectValue(task, run.variantId) });
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
    submittedReplyAnswersAfterTask: deepClone(run.submittedReplyAnswers),
    replyAuthorAssignmentsAfterTask: deepClone(run.replyAuthorAssignments),
    helpfulByCommentIdAfterTask: deepClone(run.helpfulByCommentId),
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

  if (action === 'open-community-panel') {
    event.preventDefault();
    openCommunityPanel(actionTarget.dataset.featureId, actionTarget.dataset.focusId, {
      commentId: actionTarget.dataset.commentId,
    });
    return;
  }

  if (action === 'close-community-panel') {
    event.preventDefault();
    closeCommunityPanel();
    return;
  }

  if (action === 'community-save') {
    event.preventDefault();
    toggleCommunitySavedItem(actionTarget.dataset.itemId, actionTarget.dataset.notice, actionTarget.dataset.focusId);
    return;
  }

  if (action === 'community-message') {
    event.preventDefault();
    const run = getCurrentRun();
    if (run) {
      run.siteNotice = actionTarget.dataset.notice || '처리했습니다.';
      run.liveStatus = run.siteNotice;
      if (actionTarget.dataset.focusId) requestFocus(`[data-focus-id="${actionTarget.dataset.focusId}"]`);
      render();
    }
    return;
  }

  if (action === 'set-comment-draft') {
    event.preventDefault();
    setCommentDraft(actionTarget.dataset.fieldName, actionTarget.dataset.fieldValue, actionTarget.dataset.focusId);
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
  if (element.name === 'sort') run.sortDraft = element.value;
  if (element.name === 'category') run.categoryDraft = element.value;
  if (element.name === 'runner-reply-answer') {
    const task = getCurrentTask();
    const commentId = task?.targetCommentId;
    if (commentId) {
      run.replyAnswerDrafts = {
        ...run.replyAnswerDrafts,
        [commentId]: element.value,
      };
    }
    return;
  }

  if (element.name?.startsWith('reply-answer-')) {
    const commentId = element.dataset.commentId;
    if (commentId) {
      run.replyAnswerDrafts = {
        ...run.replyAnswerDrafts,
        [commentId]: element.value,
      };
    }
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


function openCommunityPanel(featureId, triggerFocusId = '', options = {}) {
  const run = getCurrentRun();
  if (!run || !featureId) return;
  run.featurePanel = {
    featureId,
    triggerFocusId,
    commentId: options.commentId || null,
  };
  requestFocus('#community-feature-title');
  render();
}

function closeCommunityPanel() {
  const run = getCurrentRun();
  if (!run || !run.featurePanel) return;
  const triggerFocusId = run.featurePanel.triggerFocusId;
  run.featurePanel = null;
  if (triggerFocusId) requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  render();
}

function toggleCommunitySavedItem(itemId, notice, triggerFocusId) {
  const run = getCurrentRun();
  if (!run || !itemId) return;
  const nextValue = !run.savedFeatureItems[itemId];
  run.savedFeatureItems = {
    ...run.savedFeatureItems,
    [itemId]: nextValue,
  };
  run.siteNotice = notice || (nextValue ? '보관함에 넣었습니다.' : '보관함에서 뺐습니다.');
  run.liveStatus = run.siteNotice;
  if (triggerFocusId) requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  render();
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

function setCommentDraft(fieldName, fieldValue, focusId = '') {
  const run = getCurrentRun();
  if (!run || !fieldName) return;
  if (fieldName === 'sort') run.sortDraft = fieldValue;
  if (fieldName === 'category') run.categoryDraft = fieldValue;
  if (focusId) requestFocus(`[data-focus-id="${focusId}"]`);
  render();
}

function renderPseudoCommentCombo({ fieldName, label, options, selected }) {
  const selectedLabel = options.find((option) => option.id === selected)?.label ?? '선택 안 됨';
  return `
    <div class="pseudo-combo pseudo-combo-a" role="group" aria-label="${escapeHtml(label)}">
      <p class="pseudo-combo-label">${escapeHtml(label)}</p>
      <button class="button button-secondary pseudo-combo-selected" type="button" data-action="community-message" data-notice="아래 선택지에서 값을 고르십시오." data-focus-id="comment-${escapeHtml(fieldName)}-selected">
        선택됨: ${escapeHtml(selectedLabel)}
      </button>
      <div class="pseudo-combo-options visually-collapsed-options">
        ${options.map((option) => `
          <button
            class="button ${selected === option.id ? 'button-primary' : 'button-ghost'}"
            type="button"
            data-action="set-comment-draft"
            data-field-name="${escapeHtml(fieldName)}"
            data-field-value="${escapeHtml(option.id)}"
            data-focus-id="comment-${escapeHtml(fieldName)}-${escapeHtml(option.id)}"
          >${escapeHtml(option.label)}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderNativeCommentSelect({ fieldName, label, options, selected }) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(fieldName)}" data-focus-id="comment-${escapeHtml(fieldName)}">
        ${options.map((option) => `<option value="${option.id}" ${selected === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
    </label>
  `;
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
    run.currentCommentId = null;
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
    replyQuestion: ['toggle-replies'],
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
  if (expanding) {
    run.replyListVisitedThisTask = {
      ...run.replyListVisitedThisTask,
      [commentId]: true,
    };
  }
  run.currentTaskLogger?.note('toggle-replies', {
    commentId,
    expanded: expanding,
  });

  run.liveStatus = expanding ? '답글 목록이 표시되었습니다.' : '답글 목록을 닫았습니다.';
  if (expanding) {
    requestFocus(`[data-focus-id="reply-heading-${commentId}"]`);
  } else if (triggerFocusId) {
    requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  }
  render();
}

function getReplyQuestionForCurrentTask() {
  const task = getCurrentTask();
  if (!task || task.completion !== 'replyQuestion') return null;
  return task.replyQuestion ?? null;
}

function randomIndex(maxExclusive) {
  if (maxExclusive <= 0) return 0;
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function shuffledValues(values) {
  const copy = values.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getAllReplyAuthors() {
  return uniqueValues(commentsScenario.comments.flatMap((comment) => comment.replies.map((reply) => reply.author)));
}

function buildReplyAuthorPool(task) {
  return uniqueValues([
    ...(task?.replyQuestion?.options ?? []),
    ...getAllReplyAuthors(),
    ...REPLY_AUTHOR_NAME_POOL,
  ]);
}

function buildReplyAuthorAssignment(task, { avoidCorrectValue = '' } = {}) {
  if (!task || task.completion !== 'replyQuestion' || !task.replyQuestion) return null;
  const targetComment = getCommentById(task.targetCommentId);
  if (!targetComment || targetComment.replies.length === 0) return null;
  const replyIndex = Math.max(0, Number(task.replyQuestion.replyIndex ?? 1) - 1);
  const targetReply = targetComment.replies[replyIndex] ?? targetComment.replies[0];
  const basePool = buildReplyAuthorPool(task);
  const replyAuthors = {};

  for (const comment of commentsScenario.comments) {
    if (!comment.replies.length) continue;
    const assignableNames = shuffledValues(basePool.filter((name) => name !== comment.author));
    const usedNames = new Set();
    comment.replies.forEach((reply, index) => {
      const nextName = assignableNames.find((name) => !usedNames.has(name))
        ?? assignableNames[index % assignableNames.length]
        ?? reply.author;
      replyAuthors[reply.id] = nextName;
      usedNames.add(nextName);
    });
  }

  if (avoidCorrectValue && replyAuthors[targetReply.id] === avoidCorrectValue) {
    const targetPool = shuffledValues(basePool.filter((name) => name !== targetComment.author));
    const replacement = targetPool.find((name) => name !== avoidCorrectValue && !Object.values(replyAuthors).includes(name))
      ?? targetPool.find((name) => name !== avoidCorrectValue)
      ?? replyAuthors[targetReply.id];
    replyAuthors[targetReply.id] = replacement;
  }

  const correctValue = replyAuthors[targetReply.id] ?? targetReply.author;
  const distractors = shuffledValues(basePool.filter((name) => name !== correctValue)).slice(0, REPLY_QUESTION_OPTION_COUNT - 1);
  return {
    taskId: task.id,
    commentId: task.targetCommentId,
    replyIndex: replyIndex + 1,
    replyAuthors,
    correctValue,
    options: shuffledValues(uniqueValues([correctValue, ...distractors])).slice(0, REPLY_QUESTION_OPTION_COUNT),
  };
}

function ensureReplyAuthorAssignmentForTask(run, task, options = {}) {
  if (!run || !task || task.completion !== 'replyQuestion') return null;
  const existing = run.replyAuthorAssignments?.[task.id];
  if (existing && (!options.avoidCorrectValue || existing.correctValue !== options.avoidCorrectValue)) {
    return existing;
  }
  const assignment = buildReplyAuthorAssignment(task, options);
  if (!assignment) return null;
  run.replyAuthorAssignments = {
    ...(run.replyAuthorAssignments ?? {}),
    [task.id]: assignment,
  };
  return assignment;
}

function getOtherConditionReplyCorrectValue(task, currentConditionId) {
  if (APP_MODE === 'runner' || !task || task.completion !== 'replyQuestion') return '';
  const otherConditionId = ['variantA', 'variantB'].find((conditionId) => conditionId !== currentConditionId);
  return state.runs[otherConditionId]?.replyAuthorAssignments?.[task.id]?.correctValue ?? '';
}

function getReplyAuthorAssignmentForTask(run, task) {
  return ensureReplyAuthorAssignmentForTask(run, task, {
    avoidCorrectValue: getOtherConditionReplyCorrectValue(task, run?.variantId),
  });
}

function getRenderedReplyAuthor(run, comment, reply) {
  const task = getCurrentTask();
  if (!task || task.completion !== 'replyQuestion') return reply.author;
  const assignment = getReplyAuthorAssignmentForTask(run, task);
  return assignment?.replyAuthors?.[reply.id] ?? reply.author;
}

function getCurrentReplyQuestionCorrectValue(run, task) {
  return getReplyAuthorAssignmentForTask(run, task)?.correctValue ?? task?.replyQuestion?.correctValue ?? '';
}

function getCurrentReplyQuestionOptions(run, task) {
  return getReplyAuthorAssignmentForTask(run, task)?.options ?? task?.replyQuestion?.options ?? [];
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

  run.siteNotice = alreadyHelpful ? '이미 도움이 돼요가 표시되어 있습니다.' : '도움이 돼요를 표시했습니다.';
  run.liveStatus = run.siteNotice;
  if (triggerFocusId) requestFocus(`[data-focus-id="${triggerFocusId}"]`);
  render();
}

function isTaskSatisfied(task, run) {
  if (!task || !run) return false;
  if (task.requiredSort && run.sort !== task.requiredSort) return false;
  if (task.requiredCategory && run.category !== task.requiredCategory) return false;

  if (task.completion === 'replyQuestion') {
    const submitted = run.submittedReplyAnswers[task.targetCommentId];
    const otherAnswered = Object.keys(run.submittedReplyAnswers).some((commentId) => commentId !== task.targetCommentId);
    return Boolean(run.replyListVisitedThisTask[task.targetCommentId])
      && Boolean(submitted)
      && submitted.value === getCurrentReplyQuestionCorrectValue(run, task)
      && !otherAnswered;
  }

  if (task.completion === 'helpful') {
    const helpfulDone = Boolean(run.helpfulByCommentId[task.targetCommentId]);
    const detailDone = task.requiresDetailVisit ? Boolean(run.detailVisitedThisTask[task.targetCommentId]) : true;
    return helpfulDone && detailDone;
  }

  return false;
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

  let message = '요청한 댓글 동작을 완료하지 못했습니다.';
  if (task.completion === 'replyQuestion') {
    const targetAnswer = run.submittedReplyAnswers[task.targetCommentId];
    const otherAnswered = Object.keys(run.submittedReplyAnswers).some((commentId) => commentId !== task.targetCommentId);
    if (otherAnswered) {
      message = '요청한 댓글과 다른 댓글의 답글 질문에 답을 제출했습니다.';
    } else if (run.expandedCommentId && run.expandedCommentId !== task.targetCommentId && !run.replyListVisitedThisTask[task.targetCommentId]) {
      message = '요청한 댓글과 다른 댓글의 답글 목록에 진입했습니다.';
    } else if (!run.replyListVisitedThisTask[task.targetCommentId]) {
      message = '요청한 댓글의 답글 목록에 진입하지 못했습니다.';
    } else if (!targetAnswer) {
      message = '답글 목록 질문에 답을 제출하지 않았습니다.';
    } else if (targetAnswer.value !== getCurrentReplyQuestionCorrectValue(run, task)) {
      message = '답글 목록 질문에 요청과 다른 답을 제출했습니다.';
    }
  } else if (task.completion === 'helpful') {
    const helpfulIds = Object.keys(run.helpfulByCommentId).filter((commentId) => run.helpfulByCommentId[commentId]);
    if (helpfulIds.some((commentId) => commentId !== task.targetCommentId)) {
      message = '요청한 댓글과 다른 댓글에 도움이 돼요를 표시했습니다.';
    } else if (run.helpfulByCommentId[task.targetCommentId] && task.requiresDetailVisit && !run.detailVisitedThisTask[task.targetCommentId]) {
      message = '요청한 댓글의 댓글 정보 보기를 확인하지 않았습니다.';
    }
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

function captureEndAreaReplyAnswer(task, run) {
  if (!task || !run || task.completion !== 'replyQuestion') return;
  const commentId = task.targetCommentId;
  const value = run.replyAnswerDrafts[commentId] || '';
  if (!value) return;
  run.submittedReplyAnswers = {
    ...run.submittedReplyAnswers,
    [commentId]: {
      taskId: task.id,
      value,
      submittedAt: new Date().toISOString(),
      source: 'end-task-area',
    },
  };
  run.currentTaskLogger?.note('submit-reply-answer-at-end', {
    commentId,
    value,
  });
}

function confirmEndRunnerTask() {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger || state.completed || run.modal?.kind !== 'task-end-confirm') return;

  captureEndAreaReplyAnswer(task, run);
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
      `expandedComment=${run.expandedCommentId ?? 'none'}`,
      `visitedReplies=${Object.keys(run.replyListVisitedThisTask).join(',') || 'none'}`,
      `helpful=${Object.keys(run.helpfulByCommentId).filter((commentId) => run.helpfulByCommentId[commentId]).join(',') || 'none'}`,
      `replyAnswers=${Object.entries(run.submittedReplyAnswers).map(([commentId, answer]) => `${commentId}:${answer.value}`).join(',') || 'none'}`,
      task.completion === 'replyQuestion' ? `replyQuestionCorrect=${getCurrentReplyQuestionCorrectValue(run, task) || 'none'}` : '',
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
        <h1 class="sr-only" id="runner-title" tabindex="-1">댓글 목록 수행 화면</h1>
        ${state.showTaskRequestInRunner ? renderRunnerTaskRequestHtml({ goalSummary: task.goalSummary }) : ''}
        ${renderCommentsHeader(conditionId)}
        ${renderCommunityFeaturePanel(run)}
        ${renderCommentControls(conditionId, run)}
        ${renderCommentsSection(conditionId, run, visibleComments)}
      </main>
      ${state.completed ? '' : renderRunnerFooterHtml({
        jumpLabel: RUNNER_LABELS.footerJump,
        endLabel: task?.completion === 'replyQuestion' ? '답변 제출하고 과업 종료하기' : '과업 종료',
        beforeEndHtml: renderEndAreaReplyQuestion(run, task),
      })}
      ${state.completed ? '' : renderSiteNoticeHtml(run.siteNotice)}
      ${run.modal ? renderCommentModal(run.modal, run) : ''}
      ${state.completed
        ? renderRunnerCompletionDialogHtml({
          title: run.lastOutcomeMessage || '과업 결과를 저장했습니다.',
          description: '기록을 원래 창으로 전달했습니다. 확인 버튼을 누르면 이 탭이 닫힙니다.',
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
            <li>내용이 동일하고 이동 방식이 다른 두 개의 화면을 무작위 순서로 테스트 및 비교합니다.</li>
            <li>각 화면에서 같은 과업 묶음을 수행합니다.</li>
            <li>과업 수행 페이지에서 과업이 끝났다고 판단하면 하단의 과업 종료 버튼을 누릅니다.</li>
          </ul>
        </section>
        <section>
          <h2>주의할 점</h2>
          <ul>
            <li>과업 요청은 이 창에서 다시 확인할 수 있습니다.</li>
            <li>수행할 수 없다고 판단해도 최하단의 과업 종료 버튼을 실행하여 다음 단계로 건너뛸 수 있습니다.</li>
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
        <p>아래의 요청을 확인하고 댓글 목록 과업 수행 페이지를 여십시오.</p>
      </div>
      <div class="pill-group">
        <span class="pill">화면 ${screenIndex} / ${state.order.length}</span>
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${commentsTasks.length}</span>
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
          <li>과업 수행 페이지는 새 탭으로 열립니다. 과업 요청을 다시 확인해야 하면 이 창으로 돌아오십시오.</li>
          <li><strong>과업을 모두 수행했다고 판단하면 과업 수행 페이지 하단의 과업 종료 버튼을 누르십시오.</strong></li>
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
            ${isRunning ? '과업 수행 페이지 다시 열기(새 탭 열림)' : '과업 수행 페이지 열기(새 탭 열림)'}
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
        <p class="muted">과업 설명을 읽는 시간과 과업 수행 페이지가 보이지 않는 시간은 실제 완료 시간에서 제외했습니다.</p>
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
  return `
    <section class="card review-hero">
      <p class="eyebrow">댓글 목록 테스트 완료</p>
      <h1 id="final-summary-heading" tabindex="-1">비교안 A/B 최종 비교</h1>
      <p>실제 기록과 사전 예상 기준을 비교하며 결과를 확인할 수 있습니다. 테스트 결과는 서비스 탐색 점검 방법 및 개선 기준 마련 용도로 활용됩니다.</p>
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
      <p class="muted">테스트 중 문제가 있었다면 결과 파일을 내려받아 담당자에게 문제 내용과 함께 보내주십시오. 파일 형식은 JSON이며, 테스트 기록이 텍스트 형식으로 저장되어 있습니다.</p>
      <div class="button-row">
        <a class="button button-secondary" download="comments-list-results.json" href="${exportUrl}">결과 파일 내려받기</a>
      </div>
    </section>
    ${renderStudySurveyTransferPanel()}
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
    </section>
    <section class="card">
      <h2>기록 확인 안내</h2>
      <ul>
        <li>과업 내용 확인 시간은 메인 창에서 분리되며, 과업 수행 페이지가 보이지 않는 동안의 시간은 실제 완료 시간에서 뺍니다.</li>
        <li>과업 종료 버튼을 너무 일찍 누른 기록은 수행 불가능 기록으로 표시됩니다.</li>
      </ul>
      <div class="button-row">
        <button class="button button-secondary" data-action="restart-experiment">처음부터 다시 시작</button>
        <button class="button button-secondary" data-action="go-home">서비스 선택으로 돌아가기</button>
      </div>
    </section>
  `;
}

function renderStudySurveyTransferPanel() {
  return renderSurveyTransferPanel({
    store: readStoredExperimentResults(),
    requireAllServices: true,
  });
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
  const links = [
    { label: '게시글 목록', featureId: 'post-list' },
    { label: '인기 글', featureId: 'popular-posts' },
    { label: '이용 안내', featureId: 'community-guide' },
    { label: '새 글 쓰기', featureId: 'new-post' },
    { label: '알림', featureId: 'notifications' },
    { label: '내 댓글', featureId: 'my-comments' },
    { label: '커뮤니티 규칙', featureId: 'rules' },
    { label: '문의', featureId: 'support' },
  ];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      <div class="sim-topbar">
        <a href="#" class="brand-link" data-action="open-community-panel" data-feature-id="home" data-focus-id="community-home">마음돌봄 커뮤니티</a>
        <div class="sim-post-summary" aria-label="현재 게시글">
          <strong>${escapeHtml(commentsScenario.postTitle)}</strong>
          <span class="muted">댓글 ${commentsScenario.comments.length}개 · 조회 1,284</span>
        </div>
        <div class="sim-actions">
          <button class="button button-ghost" data-action="community-save" data-item-id="post-current" data-focus-id="post-bookmark" data-notice="게시글을 보관함에 넣었습니다.">게시글 보관</button>
          <button class="button button-ghost" data-action="open-community-panel" data-feature-id="report" data-focus-id="post-report">신고</button>
        </div>
      </div>
      <nav aria-label="커뮤니티 보조 내비게이션">
        ${links.map((item, index) => `<a href="#" class="nav-link" data-action="open-community-panel" data-feature-id="${escapeHtml(item.featureId)}" data-focus-id="community-nav-${index + 1}">${escapeHtml(item.label)}</a>`).join('')}
      </nav>
    </header>
  `;
}


function renderCommunityFeaturePanel(run) {
  if (!run.featurePanel) return '';
  return `
    <section class="card feature-panel" aria-labelledby="community-feature-title" data-feature-panel>
      ${renderCommunityFeaturePanelContent(run.featurePanel.featureId, run.featurePanel.commentId, run)}
      <div class="button-row feature-panel-actions">
        <button class="button button-secondary" data-action="close-community-panel" data-focus-id="community-feature-close">이 영역 닫기</button>
      </div>
    </section>
  `;
}

function renderCommunityFeaturePanelContent(featureId, commentId, run) {
  const comment = commentId ? getCommentById(commentId) : null;
  if (featureId === 'home') return renderCommunityHomePanel();
  if (featureId === 'post-list') return renderPostListPanel();
  if (featureId === 'popular-posts') return renderPopularPostsPanel();
  if (featureId === 'community-guide') return renderCommunityGuidePanel();
  if (featureId === 'new-post') return renderNewPostPanel();
  if (featureId === 'notifications') return renderNotificationsPanel(run);
  if (featureId === 'my-comments') return renderMyCommentsPanel();
  if (featureId === 'rules') return renderRulesPanel();
  if (featureId === 'writing-guide') return renderWritingGuidePanel();
  if (featureId === 'support') return renderSupportPanel();
  if (featureId === 'report') return renderReportPanel();
  if (featureId === 'author-profile') return renderAuthorProfilePanel(comment);
  if (featureId === 'comment-timeline') return renderCommentTimelinePanel(comment, run);
  return renderCommunityGuidePanel();
}

function renderCommunityHomePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">커뮤니티 처음 화면</p>
      <h2 id="community-feature-title" tabindex="-1">마음돌봄 커뮤니티</h2>
      <p class="muted">상담 예약 경험, 준비 방법, 이용 후기를 나누는 공간입니다.</p>
    </div>
    <div class="feature-grid">
      <article class="mini-card"><h3>인기 주제</h3><p>예약 변경, 비대면 연결, 상담 전 준비가 많이 읽히고 있습니다.</p></article>
      <article class="mini-card"><h3>최근 안내</h3><p>댓글 알림과 보관함 기능이 일부 개편되었습니다.</p></article>
    </div>
  `;
}

function renderPostListPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">게시글 목록</p>
      <h2 id="community-feature-title" tabindex="-1">최근 게시글</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>예약 변경이 잘 되었던 경험</h3><p>후기 18개 · 새 댓글 4개</p></article>
      <article class="mini-card"><h3>상담 전 준비물 정리</h3><p>질문 7개 · 답변 12개</p></article>
      <article class="mini-card"><h3>비대면 접속 문제 해결</h3><p>질문 11개 · 답변 21개</p></article>
    </div>
  `;
}

function renderPopularPostsPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">인기 글</p>
      <h2 id="community-feature-title" tabindex="-1">많이 읽은 글</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>취소 수수료를 미리 확인하는 방법</h3><p>조회 2,401 · 보관 82</p></article>
      <article class="mini-card"><h3>상담 링크가 열리지 않을 때</h3><p>조회 1,976 · 보관 64</p></article>
    </div>
  `;
}

function renderCommunityGuidePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">이용 안내</p>
      <h2 id="community-feature-title" tabindex="-1">커뮤니티 이용 안내</h2>
    </div>
    <ul class="feature-list">
      <li>상담 예약 번호, 전화번호 같은 개인 정보는 댓글에 남기지 않습니다.</li>
      <li>후기와 질문은 댓글 범위 선택으로 따로 모아 볼 수 있습니다.</li>
      <li>보관한 게시글과 내 댓글은 이 화면 안에서 요약으로 확인할 수 있습니다.</li>
    </ul>
  `;
}

function renderNewPostPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">새 글 쓰기</p>
      <h2 id="community-feature-title" tabindex="-1">새 글 작성</h2>
      <p class="muted">테스트 화면에서는 글을 실제로 저장하지 않고 작성 양식만 보여 줍니다.</p>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <label><span>글 종류</span><select><option>질문</option><option>후기</option><option>정보 공유</option></select></label>
        <label><span>제목</span><input type="text" value="상담 예약 관련 질문"></label>
        <button class="button button-primary" data-action="community-message" data-notice="임시 저장했습니다." data-focus-id="new-post-draft">임시 저장</button>
      </article>
    </div>
  `;
}

function renderNotificationsPanel(run) {
  const enabled = Boolean(run.savedFeatureItems['comment-notification']);
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">알림</p>
      <h2 id="community-feature-title" tabindex="-1">댓글 알림</h2>
    </div>
    <div class="feature-grid">
      <article class="mini-card"><h3>최근 알림</h3><p>운영자 안내 댓글에 새 반응이 있습니다.</p><p>민지 댓글의 답글이 2개로 표시됩니다.</p></article>
      <article class="mini-card"><h3>알림 설정</h3><p>${enabled ? '이 게시글 댓글 알림을 받고 있습니다.' : '이 게시글 댓글 알림이 꺼져 있습니다.'}</p><button class="button button-secondary" data-action="community-save" data-item-id="comment-notification" data-focus-id="comment-notification-toggle" data-notice="댓글 알림 설정을 변경했습니다.">${enabled ? '알림 끄기' : '알림 켜기'}</button></article>
    </div>
  `;
}

function renderMyCommentsPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">내 댓글</p>
      <h2 id="community-feature-title" tabindex="-1">내 활동 요약</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>최근 작성 댓글</h3><p>예약 확정 문자 관련 질문에 답변을 남겼습니다.</p></article>
      <article class="mini-card"><h3>보관한 글</h3><p>현재 게시글과 상담 준비 글이 보관되어 있습니다.</p></article>
    </div>
  `;
}

function renderRulesPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">운영 기준</p>
      <h2 id="community-feature-title" tabindex="-1">댓글 운영 기준</h2>
    </div>
    <ul class="feature-list">
      <li>개인 정보와 예약 번호는 공개 댓글에 쓰지 않습니다.</li>
      <li>같은 질문을 반복해서 올리기 전에 기존 답글을 확인합니다.</li>
      <li>신고된 댓글은 운영자가 확인한 뒤 숨김 처리할 수 있습니다.</li>
    </ul>
  `;
}

function renderWritingGuidePanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">작성 안내</p>
      <h2 id="community-feature-title" tabindex="-1">댓글 작성 안내</h2>
    </div>
    <div class="feature-list">
      <article class="mini-card"><h3>좋은 질문 예시</h3><p>상담 방식, 예약 변경 가능 시간, 준비 서류처럼 확인할 내용을 구체적으로 적습니다.</p></article>
      <article class="mini-card"><h3>피해야 할 내용</h3><p>연락처, 주민등록번호, 상담 내용 전문은 공개 댓글에 쓰지 않습니다.</p></article>
    </div>
  `;
}

function renderSupportPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">문의</p>
      <h2 id="community-feature-title" tabindex="-1">커뮤니티 문의</h2>
    </div>
    <div class="feature-grid">
      <article class="mini-card"><h3>운영자에게 문의</h3><p>댓글 삭제, 신고 처리, 알림 문제를 문의할 수 있습니다.</p><button class="button button-primary" data-action="community-message" data-notice="문의가 접수되었습니다." data-focus-id="support-send">문의 접수</button></article>
      <article class="mini-card"><h3>답변 예상 시간</h3><p>평일 기준 보통 하루 안에 답변합니다.</p></article>
    </div>
  `;
}

function renderReportPanel() {
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">신고</p>
      <h2 id="community-feature-title" tabindex="-1">게시글 신고</h2>
      <p class="muted">신고 내용을 고르면 운영자가 확인합니다.</p>
    </div>
    <div class="feature-grid">
      <article class="mini-card">
        <label><span>신고 사유</span><select><option>개인 정보 노출</option><option>광고 또는 홍보</option><option>부적절한 표현</option></select></label>
        <button class="button button-primary" data-action="community-message" data-notice="신고가 접수되었습니다." data-focus-id="report-submit">신고 접수</button>
      </article>
    </div>
  `;
}

function renderAuthorProfilePanel(comment) {
  if (!comment) return renderCommunityGuidePanel();
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">작성자 정보</p>
      <h2 id="community-feature-title" tabindex="-1">${escapeHtml(comment.author)} 작성자 정보</h2>
    </div>
    <div class="feature-grid">
      <article class="mini-card"><h3>활동 요약</h3><p>${escapeHtml(comment.badge)} 댓글을 주로 작성했습니다. 최근 작성 시각은 ${escapeHtml(comment.timeLabel)}입니다.</p></article>
      <article class="mini-card"><h3>작성자 보관</h3><p>나중에 이 작성자의 댓글을 다시 볼 수 있습니다.</p><button class="button button-secondary" data-action="community-save" data-item-id="author-${escapeHtml(comment.id)}" data-focus-id="author-save-${escapeHtml(comment.id)}" data-notice="작성자를 보관했습니다.">작성자 보관</button></article>
    </div>
  `;
}

function renderCommentTimelinePanel(comment, run) {
  if (!comment) return renderCommunityGuidePanel();
  return `
    <div class="feature-panel-header">
      <p class="eyebrow">댓글 시각</p>
      <h2 id="community-feature-title" tabindex="-1">${escapeHtml(comment.author)} 댓글 기록</h2>
    </div>
    <dl class="meta-list compact">
      <div><dt>작성 시각</dt><dd>${escapeHtml(comment.timeLabel)}</dd></div>
      <div><dt>댓글 종류</dt><dd>${escapeHtml(comment.badge)}</dd></div>
      <div><dt>답글 수</dt><dd>${comment.replyCount}개</dd></div>
      <div><dt>도움이 수</dt><dd>${getEffectiveHelpfulCount(comment, run)}개</dd></div>
    </dl>
  `;
}

function renderCommentControls(conditionId, run) {
  const controlFields = [
    { fieldName: 'sort', label: '정렬 기준', options: commentsScenario.sortOptions, selected: run.sortDraft },
    { fieldName: 'category', label: '댓글 범위', options: commentsScenario.categoryOptions, selected: run.categoryDraft },
  ];
  return `
    <section class="card filters-card ${conditionId === 'variantA' ? 'filters-a' : 'filters-b'}">
      <div class="filters-header">
        <div>
          <h2 id="filters-heading">정렬과 범위 선택</h2>
        </div>
      </div>
      <div class="filters-grid">
        ${controlFields.map((field) => conditionId === 'variantA'
          ? renderPseudoCommentCombo(field)
          : renderNativeCommentSelect(field)
        ).join('')}
      </div>
      <div class="button-row">
        <a href="#" class="inline-link" data-action="open-community-panel" data-feature-id="rules" data-focus-id="comment-policy-link">댓글 운영 기준 보기</a>
        <a href="#" class="inline-link" data-action="open-community-panel" data-feature-id="writing-guide" data-focus-id="comment-help-link">작성 안내 보기</a>
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
              <a href="#" class="inline-link" data-action="open-community-panel" data-feature-id="author-profile" data-comment-id="${comment.id}" data-focus-id="comment-author-${comment.id}">${escapeHtml(comment.author)}</a>
              <span class="pill ${comment.category === 'notice' ? 'pill-warning' : ''}">${escapeHtml(comment.badge)}</span>
              <a href="#" class="inline-link" data-action="open-community-panel" data-feature-id="comment-timeline" data-comment-id="${comment.id}" data-focus-id="comment-time-${comment.id}">${escapeHtml(comment.timeLabel)}</a>
            </div>
            <a href="#" class="inline-link" data-action="community-message" data-focus-id="comment-share-${comment.id}" data-notice="공유 주소를 복사했습니다.">공유</a>
          </div>
          <p class="comment-summary"><strong>${escapeHtml(comment.summary)}</strong></p>
          <p class="muted">${escapeHtml(comment.body)}</p>
          <div class="comment-metrics muted">도움이 ${getEffectiveHelpfulCount(comment, run)} · 답글 ${comment.replyCount}</div>
          <div class="button-row comment-action-row">
            <button class="button button-secondary" data-action="mark-helpful" data-comment-id="${comment.id}" data-focus-id="comment-helpful-${comment.id}">도움이 돼요</button>
            <button class="button button-ghost" data-action="toggle-replies" data-comment-id="${comment.id}" data-focus-id="comment-replies-${comment.id}">${run.expandedCommentId === comment.id ? `답글 ${comment.replyCount}개 닫기` : `답글 ${comment.replyCount}개 보기`}</button>
            <button class="button button-ghost" data-action="open-comment-detail" data-comment-id="${comment.id}" data-focus-id="comment-detail-${comment.id}">댓글 정보 보기</button>
          </div>
          ${run.expandedCommentId === comment.id ? renderReplyList(comment, run) : ''}
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
    ${expandedComment ? renderReplyList(expandedComment, run) : ''}
  `;
}

function renderReplyList(comment, run) {
  return `
    <section class="reply-card" aria-label="${escapeHtml(comment.author)} 댓글의 답글 목록">
      <h3 data-focus-id="reply-heading-${comment.id}" tabindex="-1">${escapeHtml(comment.author)} 댓글의 답글 ${comment.replyCount}개</h3>
      <ul class="reply-list">
        ${comment.replies.map((reply, index) => `
          <li>
            <strong>${escapeHtml(index + 1)}번째 답글</strong> · ${escapeHtml(getRenderedReplyAuthor(run, comment, reply))} · ${escapeHtml(reply.timeLabel ?? '작성 시간 정보 없음')}
            <p>${escapeHtml(reply.text)}</p>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderEndAreaReplyQuestion(run, task) {
  if (!task || task.completion !== 'replyQuestion' || !task.replyQuestion) return '';
  const question = task.replyQuestion;
  const options = getCurrentReplyQuestionOptions(run, task);
  const draftValue = run.replyAnswerDrafts[task.targetCommentId] || '';
  return `
    <section class="runner-end-answer" aria-labelledby="runner-end-answer-heading">
      <h2 id="runner-end-answer-heading">답변 선택</h2>
      <p id="runner-end-answer-question">${escapeHtml(question.prompt)}</p>
      <label for="runner-reply-answer">
        <span>답변</span>
        <select id="runner-reply-answer" name="runner-reply-answer" data-focus-id="runner-reply-answer" aria-describedby="runner-end-answer-question">
          <option value="">선택하십시오</option>
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${draftValue === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
        </select>
      </label>
    </section>
  `;
}

function renderCommentModal(modal, run) {
  if (modal.kind === 'task-end-confirm') {
    const task = getCurrentTask();
    return renderEndTaskConfirmationDialogHtml({
      confirmLabel: task?.completion === 'replyQuestion' ? '예, 제출하고 종료합니다' : '예, 종료합니다',
    });
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

function persistCurrentServiceProgress() {
  if (APP_MODE !== 'main') return null;
  return saveServiceRunSnapshot({
    serviceId: SERVICE_ID,
    serviceLabel: SERVICE_LABEL,
    sessionId: state.sessionId,
    order: state.order,
    taskCount: commentsTasks.length,
    conditionCount: state.order.length,
    measurementRules: MEASUREMENT_RULES,
    actualRuns: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmarkResults: benchmarkResultsComments,
    aggregateActualCondition,
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
    storedServices: readStoredExperimentResults().services,
  });
}

function buildExportDataUrl() {
  return buildSharedExportDataUrl(buildExportPayload());
}


function formatSigned(value, suffix = '') {
  return formatSharedSigned(value, suffix);
}
