import { commentsScenario } from './data/comments-scenario.js';
import { commentsTasks } from './data/tasks-comments.js';
import { benchmarkResultsComments } from './data/benchmark-results-comments.js';
import { createTaskLogger } from './lib/logger.js';
import { hashString, uniqueId, formatSeconds, escapeHtml, deepClone, toQueryString, renderRunnerFooterHtml } from './lib/utils.js';

const APP_MODE = new URL(window.location.href).searchParams.get('mode') === 'runner' ? 'runner' : 'main';
const STORAGE_KEY_SESSION = 'keyboard-cost-lab-comments-session-id';
const LAUNCH_STORAGE_PREFIX = 'keyboard-cost-lab-comments-launch';
const CHANNEL_PREFIX = 'keyboard-cost-lab-comments-channel';
const CHANNEL_FALLBACK_STORAGE_PREFIX = 'keyboard-cost-lab-comments-channel-fallback';
const SURVEY_CONFIG = {
  baseUrl: '',
};

const MEASUREMENT_RULES = [
  '실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.',
  '수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.',
  '수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다.',
];

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
    term: '사전 계산 기준',
    description: '실제 실험 전에 미리 계산해 둔 예상 조작 부담 값입니다. 실제 기록과 나란히 비교합니다.',
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
  };
}

function getOrCreateSessionId() {
  const stored = window.localStorage.getItem(STORAGE_KEY_SESSION);
  if (stored) return stored;
  const generated = uniqueId('comments-session');
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
  run.detailVisitedThisTask = {};
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

function closeModal() {
  const run = getCurrentRun();
  if (!run || !run.modal) return;
  const closingModal = run.modal;
  run.modal = null;
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
    finishRunnerTask('target-replies-opened');
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
    finishRunnerTask('target-comment-helpful');
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

function finishRunnerTask(reason) {
  if (APP_MODE !== 'runner') return;
  const run = getCurrentRun();
  const task = getCurrentTask();
  if (!run || !task || !run.currentTaskLogger) return;

  const summary = run.currentTaskLogger.finish({
    success: true,
    reason,
    notes: [
      `expandedComment=${run.expandedCommentId ?? 'none'}`,
      `helpful=${Object.keys(run.helpfulByCommentId).filter((commentId) => run.helpfulByCommentId[commentId]).join(',') || 'none'}`,
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
      ${conditionId === 'variantB' ? `<a class="skip-link" href="#comments-heading" data-action="jump-results" data-focus-id="runner-skip-comments">${RUNNER_LABELS.quickJump}</a>` : ''}
      <main class="runner-main" aria-label="댓글 목록 수행 화면">
        <h1 class="sr-only" id="runner-title" tabindex="-1">${escapeHtml(task.title)} · ${escapeHtml(VARIANT_META[conditionId].title)}</h1>
        ${renderCommentsHeader(conditionId)}
        ${renderCommentControls(conditionId, run)}
        ${renderCommentsSection(conditionId, run, visibleComments)}
      </main>
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="live-status-region">${escapeHtml(run.liveStatus)}</div>
      ${renderRunnerFooterHtml({ jumpLabel: RUNNER_LABELS.footerJump })}
      ${run.modal ? renderCommentModal(run.modal, run) : ''}
    </div>
  `;
}

function renderServiceIntroView() {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">댓글 목록</h1>
      <p>
        같은 댓글 내용을 두 가지 다른 이동 구조로 보여 주는 실험 화면입니다.
        이 화면에서 과업 준비 단계로 들어가거나, 다시 서비스 선택 화면으로 돌아갈 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번에 확인하는 것</h2>
          <ul>
            <li>댓글마다 따로 흩어진 작업 버튼이 순차 탐색 부담을 얼마나 키우는지</li>
            <li>댓글을 하나의 선택 항목으로 묶고 작업을 한곳에 모았을 때 부담이 얼마나 줄어드는지</li>
            <li>대화상자를 닫은 뒤 같은 댓글 작업으로 돌아오는 구조가 실제 기록에 어떤 차이를 만드는지</li>
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
  const benchmark = benchmarkResultsComments.variants[conditionId].tasks[task.benchmarkTaskId];
  const activeLaunch = state.activeLaunch;
  const isRunning = state.view === 'taskRunning';
  const targetComment = getCommentById(task.targetCommentId);

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
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${commentsTasks.length}</span>
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
          <div><dt>현재 댓글 상태</dt><dd>${escapeHtml(formatRunStateSummary(run))}</dd></div>
          <div><dt>목표 댓글</dt><dd>${escapeHtml(targetComment ? formatCommentLabel(targetComment, run) : '없음')}</dd></div>
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
        </tbody>
      </table>
      <p class="muted">과업 내용 확인 시간은 메인 창에서 분리되며, 수행 탭이 숨겨진 동안의 시간은 실제 완료 시간에서 뺍니다.</p>
    </section>
    <section class="card">
      <h2>다음 단계에 바로 쓸 수 있는 포인트</h2>
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
  const benchmarkOverall = benchmarkResultsComments.overall[selectedProfileId];
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

function renderCommentsHeader(conditionId) {
  const links = ['게시글 목록', '인기 글', '이용 안내', '새 글 쓰기', '알림', '내 댓글', '커뮤니티 규칙', '문의'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
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
  const variantResults = benchmarkResultsComments.variants[conditionId].tasks;
  const totals = {};
  for (const [profileId, overall] of Object.entries(benchmarkResultsComments.overall)) {
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
    serviceId: 'comments',
    sessionId: state.sessionId,
    order: state.order,
    measurementRules: MEASUREMENT_RULES,
    actual: {
      variantA: state.runs.variantA.taskResults,
      variantB: state.runs.variantB.taskResults,
    },
    benchmark: benchmarkResultsComments,
  };
}

function buildExportDataUrl() {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(buildExportPayload(), null, 2))}`;
}

function buildSurveyUrl() {
  if (!SURVEY_CONFIG.baseUrl) return '';
  const params = {
    sessionId: state.sessionId,
    serviceId: 'comments',
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
