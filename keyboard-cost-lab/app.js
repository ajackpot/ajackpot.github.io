import { calendarScenario } from './data/calendar-scenario.js';
import { calendarTasks } from './data/tasks-calendar.js';
import { benchmarkResultsCalendar } from './data/benchmark-results-calendar.js';
import { createTaskLogger } from './lib/logger.js';
import { hashString, uniqueId, formatSeconds, escapeHtml, deepClone, clsx, toQueryString } from './lib/utils.js';

const STORAGE_KEY_SESSION = 'keyboard-cost-lab-session-id';
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

const VARIANT_META = {
  variantA: {
    shortLabel: 'A',
    title: '조건 A · 고비용 구조',
    subtitle: '헤더와 필터 이후에 결과에 도달하고, 슬롯마다 복수 탭 스톱이 있는 구조',
    improvements: [
      '헤더·보조 링크를 모두 지나야 결과를 만날 수 있습니다.',
      '슬롯 행마다 선택/상세가 분리되어 순차 탐색 비용이 누적됩니다.',
      '모달을 열어도 초점이 자동 이동하지 않고, 닫을 때 원래 위치 복귀가 보장되지 않습니다.',
    ],
  },
  variantB: {
    shortLabel: 'B',
    title: '조건 B · 개선 구조',
    subtitle: '스킵 링크, 단일 진입 슬롯 그리드, 모달 초기 초점·복귀를 갖춘 구조',
    improvements: [
      '스킵 링크와 결과 이동으로 첫 진입 비용을 낮춥니다.',
      '슬롯 영역은 단일 탭 스톱으로 진입하고 화살표로 이동합니다.',
      '모달을 열면 첫 액션으로 이동하고 닫으면 호출 슬롯으로 돌아갑니다.',
    ],
  },
};

const root = document.querySelector('#app');
if (!root) {
  throw new Error('#app root not found');
}

const state = createInitialState();
wireEvents();
render();

function createInitialState() {
  const sessionId = getOrCreateSessionId();
  const order = hashString(sessionId) % 2 === 0 ? ['variantA', 'variantB'] : ['variantB', 'variantA'];
  return {
    sessionId,
    order,
    currentConditionIndex: 0,
    currentTaskIndex: 0,
    view: 'intro',
    benchmarkProfileFocus: 'keyboard',
    focusRequest: null,
    runs: {
      variantA: createConditionRuntime('variantA'),
      variantB: createConditionRuntime('variantB'),
    },
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

function wireEvents() {
  root.addEventListener('click', handleRootClick);
  root.addEventListener('change', handleRootChange);
  root.addEventListener('keydown', handleRootKeydown);
}

function handleRootClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;

  if (action === 'start-experiment') {
    event.preventDefault();
    startExperiment();
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
    requestFocus('#results-heading');
    return;
  }
}

function handleRootChange(event) {
  const element = event.target;
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;

  if (element.name === 'benchmark-profile') {
    state.benchmarkProfileFocus = element.value;
    render();
    return;
  }

  if (!isExperimentActive()) return;

  const run = getCurrentRun();
  if (!run) return;
  if (element.name in run.filtersDraft) {
    run.filtersDraft[element.name] = element.value;
  }
}

function handleRootKeydown(event) {
  const run = getCurrentRun();
  if (!run) return;

  if (run.modal && event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (run.modal && getCurrentConditionId() === 'variantB') {
    const dialog = document.querySelector('[data-modal-dialog]');
    if (dialog instanceof HTMLElement && dialog.contains(event.target) && event.key === 'Tab') {
      trapFocusInDialog(dialog, event);
      return;
    }
  }

  if (getCurrentConditionId() === 'variantB') {
    const slotButton = event.target.closest('[data-grid-slot="true"]');
    if (slotButton instanceof HTMLElement) {
      handleGridNavigation(event, slotButton);
    }
  }
}

function isExperimentActive() {
  return ['task', 'taskReview', 'conditionReview', 'final'].includes(state.view);
}

function getCurrentConditionId() {
  return state.order[state.currentConditionIndex] ?? null;
}

function getCurrentRun() {
  const conditionId = getCurrentConditionId();
  return conditionId ? state.runs[conditionId] : null;
}

function getCurrentTask() {
  return calendarTasks[state.currentTaskIndex] ?? null;
}

function resetConditionRuntime(variantId) {
  const fresh = createConditionRuntime(variantId);
  state.runs[variantId] = fresh;
  return fresh;
}

function startExperiment() {
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  resetConditionRuntime('variantA');
  resetConditionRuntime('variantB');
  prepareCurrentTask();
  state.view = 'task';
  requestFocus('#task-heading');
  render();
}

function restartExperiment() {
  const currentRun = getCurrentRun();
  if (currentRun?.currentTaskLogger) {
    currentRun.currentTaskLogger.finish({ success: false, reason: 'restart' });
  }
  state.currentConditionIndex = 0;
  state.currentTaskIndex = 0;
  state.view = 'intro';
  state.runs.variantA = createConditionRuntime('variantA');
  state.runs.variantB = createConditionRuntime('variantB');
  requestFocus('#page-title');
  render();
}

function prepareCurrentTask() {
  const conditionId = getCurrentConditionId();
  const task = getCurrentTask();
  if (!conditionId || !task) return;

  const run = state.runs[conditionId];
  run.modal = null;
  run.isApplying = false;
  run.isWorking = false;
  run.cancelPerformedThisTask = false;
  run.lastTaskCompletionNote = '';
  run.liveStatus = '목표를 맞추기 위해 필터를 적용하고 슬롯을 여십시오.';

  const visibleAvailableSlots = getAvailableVisibleSlots(run);
  run.currentGridSlotId = visibleAvailableSlots[0]?.id ?? null;

  if (run.currentTaskLogger) {
    run.currentTaskLogger.finish({ success: false, reason: 'replaced-before-completion' });
  }

  run.currentTaskLogger = createTaskLogger({
    sessionId: state.sessionId,
    conditionId,
    taskId: task.id,
    taskTitle: task.title,
  });
}

function continueAfterTask() {
  const currentRun = getCurrentRun();
  if (!currentRun) return;

  if (state.currentTaskIndex < calendarTasks.length - 1) {
    state.currentTaskIndex += 1;
    prepareCurrentTask();
    state.view = 'task';
    requestFocus('#task-heading');
    render();
    return;
  }

  state.view = 'conditionReview';
  requestFocus('#condition-review-heading');
  render();
}

function continueAfterCondition() {
  if (state.currentConditionIndex < state.order.length - 1) {
    state.currentConditionIndex += 1;
    state.currentTaskIndex = 0;
    const nextVariant = getCurrentConditionId();
    resetConditionRuntime(nextVariant);
    prepareCurrentTask();
    state.view = 'task';
    requestFocus('#task-heading');
    render();
    return;
  }

  state.view = 'final';
  requestFocus('#final-summary-heading');
  render();
}

function requestFocus(selector) {
  state.focusRequest = selector;
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
  run.liveStatus = '필터를 적용하는 중입니다…';
  render();

  window.setTimeout(() => {
    run.isApplying = false;
    run.filters = normalizeFilters(run.filtersDraft);
    const visibleAvailableSlots = getAvailableVisibleSlots(run);
    run.currentGridSlotId = visibleAvailableSlots.find((slot) => slot.id === run.currentGridSlotId)?.id ?? visibleAvailableSlots[0]?.id ?? null;
    const resultCount = visibleAvailableSlots.length;
    run.liveStatus = `${resultCount}개의 예약 가능 슬롯이 표시되었습니다.`;

    if (getCurrentConditionId() === 'variantB') {
      requestFocus('#results-heading');
    } else {
      requestFocus('[data-focus-id="apply-filters"]');
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

  if (getCurrentConditionId() === 'variantB') {
    requestFocus('[data-dialog-primary]');
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

  if (getCurrentConditionId() === 'variantB') {
    requestFocus('[data-dialog-primary]');
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

  if (getCurrentConditionId() === 'variantB' && closingModal.triggerFocusId) {
    requestFocus(`[data-focus-id="${closingModal.triggerFocusId}"]`);
  } else {
    run.currentTaskLogger?.note('focus-loss', { reason: 'modal-closed-without-return-focus' });
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
      completeCurrentTask(wasCorrect ? 'target-slot-confirmed' : 'task-satisfied-after-reselection');
      return;
    }

    run.liveStatus = wasCorrect
      ? '예약이 반영되었습니다. 과업 성공 조건을 다시 확인하십시오.'
      : '예약은 되었지만 목표 슬롯과 일치하지 않습니다. 다시 시도하십시오.';

    if (getCurrentConditionId() === 'variantB') {
      requestFocus('#booking-summary');
    } else {
      run.currentTaskLogger?.note('focus-loss', { reason: 'variant-a-booking-confirmed' });
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

    run.liveStatus = '기존 예약을 취소했습니다. 새 슬롯을 선택하십시오.';

    if (getCurrentConditionId() === 'variantB') {
      requestFocus('#booking-summary');
    } else {
      run.currentTaskLogger?.note('focus-loss', { reason: 'variant-a-cancel-confirmed' });
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

function completeCurrentTask(reason) {
  const run = getCurrentRun();
  const task = getCurrentTask();
  const conditionId = getCurrentConditionId();
  if (!run || !task || !conditionId || !run.currentTaskLogger) return;

  const summary = run.currentTaskLogger.finish({
    success: true,
    reason,
    notes: [
      `booking=${run.booking?.slotId ?? 'none'}`,
      `cancelPerformed=${run.cancelPerformedThisTask}`,
    ],
  });

  run.currentTaskLogger = null;
  run.lastTaskCompletionNote = reason;
  run.taskResults.push({
    ...summary,
    benchmarkTaskId: task.benchmarkTaskId,
    targetSlotId: task.targetSlotId,
    bookingAfterTask: deepClone(run.booking),
    cancellationPerformed: run.cancelPerformedThisTask,
    conditionId,
  });

  state.view = 'taskReview';
  requestFocus('#review-heading');
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
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function render() {
  root.innerHTML = `
    <div class="page-shell">
      ${renderPage()}
    </div>
  `;
  applyPendingFocus();
}

function renderPage() {
  if (state.view === 'intro') return renderIntroView();
  if (state.view === 'task') return renderTaskView();
  if (state.view === 'taskReview') return renderTaskReviewView();
  if (state.view === 'conditionReview') return renderConditionReviewView();
  return renderFinalView();
}

function renderIntroView() {
  return `
    <header class="hero card">
      <p class="eyebrow">Calendar benchmark prototype</p>
      <h1 id="page-title" tabindex="-1">예약 캘린더 A/B 테스트 프로토타입</h1>
      <p>
        정적 웹앱 안에서 조건 A와 B를 차례로 실행하고, 각 과업의 실제 로그를
        사전 계산한 벤치마크와 나란히 보여주는 첫 번째 서비스 유형 구현입니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>이번 단계에서 구현한 것</h2>
          <ul>
            <li>캘린더 A/B 페이지와 3개 과업</li>
            <li>키 입력·포커스 이동·모달 이탈 등 로그 수집</li>
            <li>키보드 / 화면낭독 / 스위치 프로필별 사전 벤치마크</li>
            <li>docs 폴더용 단계 보고서</li>
          </ul>
        </section>
        <section>
          <h2>세션 정보</h2>
          <dl class="meta-list">
            <div><dt>세션 ID</dt><dd><code>${escapeHtml(state.sessionId)}</code></dd></div>
            <div><dt>조건 순서</dt><dd>${state.order.map((variantId) => VARIANT_META[variantId].shortLabel).join(' → ')}</dd></div>
            <div><dt>현재 범위</dt><dd>예약 캘린더 → 벤치마크 → 결과 요약</dd></div>
          </dl>
        </section>
      </div>
      <div class="button-row">
        <button class="button button-primary" data-action="start-experiment">실험 시작</button>
      </div>
    </header>
    <section class="card muted-card">
      <h2>과업 목록</h2>
      <ol>
        ${calendarTasks.map((task) => `<li><strong>${escapeHtml(task.title)}</strong><br>${escapeHtml(task.goalSummary)}</li>`).join('')}
      </ol>
      <p class="muted">
        권장 사용법: 마우스보다 키보드 중심으로 수행하십시오. 클릭도 허용되지만 결과 요약에 pointer activation이 함께 기록됩니다.
      </p>
    </section>
  `;
}

function renderTaskView() {
  const conditionId = getCurrentConditionId();
  const run = getCurrentRun();
  const task = getCurrentTask();
  const visibleSlots = getVisibleSlots(run);
  const availableSlots = visibleSlots.filter((slot) => slot.available);
  const unavailableSlots = visibleSlots.filter((slot) => !slot.available);
  const meta = VARIANT_META[conditionId];

  return `
    ${conditionId === 'variantB' ? '<a class="skip-link" href="#results-heading">결과 영역으로 건너뛰기</a>' : ''}
    <section class="card top-summary">
      <div>
        <p class="eyebrow">${escapeHtml(meta.title)}</p>
        <h1 id="task-heading" tabindex="-1">${escapeHtml(task.title)}</h1>
        <p>${escapeHtml(meta.subtitle)}</p>
      </div>
      <div class="pill-group">
        <span class="pill">세션 ${escapeHtml(state.sessionId)}</span>
        <span class="pill">조건 ${escapeHtml(meta.shortLabel)}</span>
        <span class="pill">과업 ${state.currentTaskIndex + 1} / ${calendarTasks.length}</span>
      </div>
    </section>

    <section class="task-layout">
      <aside class="task-aside">
        ${renderTaskInstructionCard(task, run)}
        ${conditionId === 'variantB' ? renderBookingPanel(run, true) : ''}
        ${renderStructuralHints(conditionId)}
      </aside>
      <main class="task-main" id="results-anchor">
        ${renderSimulatedHeader(conditionId)}
        ${renderFilters(conditionId, run)}
        ${renderResults(conditionId, run, availableSlots, unavailableSlots)}
        ${conditionId === 'variantA' ? renderBookingPanel(run, false) : ''}
      </main>
    </section>
    ${run.modal ? renderModal(run.modal, run, task) : ''}
  `;
}

function renderTaskInstructionCard(task, run) {
  const snapshot = run.currentTaskLogger?.getSnapshot();
  return `
    <section class="card instruction-card" data-task-instructions>
      <h2>과업 안내</h2>
      <p class="goal">${escapeHtml(task.goalSummary)}</p>
      <ol>
        ${task.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}
      </ol>
      <div class="status-box" aria-live="polite" id="live-status-region">
        ${escapeHtml(run.liveStatus)}
      </div>
      <dl class="meta-list compact">
        <div><dt>현재 예약</dt><dd>${escapeHtml(formatBookingSummary(run.booking))}</dd></div>
        <div><dt>실시간 키 입력</dt><dd>${snapshot ? snapshot.totalKeyInputs : 0}</dd></div>
        <div><dt>포커스 이동</dt><dd>${snapshot ? snapshot.focusChanges : 0}</dd></div>
      </dl>
    </section>
  `;
}

function renderStructuralHints(conditionId) {
  const meta = VARIANT_META[conditionId];
  return `
    <section class="card hint-card">
      <h2>현재 구조 특징</h2>
      <ul>
        ${meta.improvements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>
  `;
}

function renderSimulatedHeader(conditionId) {
  const hasVisibleSkip = conditionId === 'variantB';
  const links = ['홈', '상담사 소개', '패키지', '후기', '가격', 'FAQ', '정책', '문의'];
  return `
    <header class="sim-header ${conditionId === 'variantA' ? 'sim-header-a' : 'sim-header-b'}">
      ${hasVisibleSkip ? '<a class="inline-link" href="#results-heading" data-action="jump-results" data-focus-id="header-skip-results">결과로 바로 이동</a>' : ''}
      <nav aria-label="서비스 보조 내비게이션">
        ${links.map((label, index) => `<a href="#" class="nav-link" data-focus-id="nav-${index + 1}">${escapeHtml(label)}</a>`).join('')}
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
          <h2 id="filters-heading">필터</h2>
          <p class="muted">A와 B는 동일한 정보량을 유지하고, 탐색 구조만 다르게 구성했습니다.</p>
        </div>
        ${conditionId === 'variantB' ? '<button class="button button-secondary" data-action="jump-results" data-focus-id="jump-results-button">결과로 이동</button>' : ''}
      </div>
      <div class="filters-grid">
        <label>
          <span>서비스</span>
          <select name="serviceType" data-focus-id="filter-service">
            ${calendarScenario.serviceTypes.map((serviceType) => `
              <option value="${serviceType.id}" ${run.filtersDraft.serviceType === serviceType.id ? 'selected' : ''}>${escapeHtml(serviceType.label)}</option>
            `).join('')}
          </select>
        </label>
        <label>
          <span>형식</span>
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
          <span>길이</span>
          <select name="duration" data-focus-id="filter-duration">
            ${durationOptions.map((durationValue) => `
              <option value="${durationValue}" ${String(run.filtersDraft.duration) === String(durationValue) ? 'selected' : ''}>
                ${durationValue === 'all' ? '전체 길이' : `${durationValue}분`}
              </option>
            `).join('')}
          </select>
        </label>
      </div>
      <div class="button-row">
        <a href="#" class="inline-link" data-focus-id="policy-link">변경 정책 보기</a>
        <a href="#" class="inline-link" data-focus-id="support-link">이용 안내 보기</a>
        <button class="button button-primary" data-action="apply-filters" data-focus-id="apply-filters" ${run.isApplying ? 'disabled' : ''}>
          ${run.isApplying ? '적용 중…' : '필터 적용'}
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
          <h2 id="results-heading" tabindex="-1">결과</h2>
          <p class="muted">${availableSlots.length}개의 예약 가능 슬롯 · ${unavailableSlots.length}개의 예약 불가 슬롯</p>
        </div>
        ${conditionId === 'variantB' ? '<p class="keyboard-tip">방향키로 이동, Enter/Space로 열기</p>' : '<p class="keyboard-tip">Tab/Shift+Tab으로 슬롯 행을 순차 탐색</p>'}
      </div>
      ${conditionId === 'variantA'
        ? renderVariantAResults(availableSlots, unavailableSlots)
        : renderVariantBResults(run, availableSlots, unavailableSlots)}
    </section>
  `;
}

function renderVariantAResults(availableSlots, unavailableSlots) {
  if (availableSlots.length === 0 && unavailableSlots.length === 0) {
    return '<p class="muted">현재 필터에 맞는 슬롯이 없습니다.</p>';
  }
  return `
    <ul class="slot-list slot-list-a">
      ${availableSlots.map((slot) => `
        <li class="slot-row">
          <div>
            <strong>${escapeHtml(formatSlotLabel(slot))}</strong>
            <p class="muted">예약 가능 슬롯</p>
          </div>
          <div class="button-row compact-row">
            <button class="button button-secondary" data-action="slot-open" data-slot-id="${slot.id}" data-dialog-mode="select" data-focus-id="slot-${slot.id}-select">선택</button>
            <button class="button button-ghost" data-action="slot-open" data-slot-id="${slot.id}" data-dialog-mode="details" data-focus-id="slot-${slot.id}-details">상세</button>
          </div>
        </li>
      `).join('')}
      ${unavailableSlots.map((slot) => `
        <li class="slot-row slot-row-unavailable">
          <div>
            <strong>${escapeHtml(formatSlotLabel(slot))}</strong>
            <p class="muted">현재 예약 불가</p>
          </div>
          <div class="button-row compact-row">
            <span class="pill pill-warning">예약 불가</span>
            <button class="button button-ghost" data-action="slot-open" data-slot-id="${slot.id}" data-dialog-mode="details" data-focus-id="slot-${slot.id}-details">상세</button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderVariantBResults(run, availableSlots, unavailableSlots) {
  if (availableSlots.length === 0 && unavailableSlots.length === 0) {
    return '<p class="muted">현재 필터에 맞는 슬롯이 없습니다.</p>';
  }
  const rows = chunkArray(availableSlots, 4);
  return `
    ${availableSlots.length === 0 ? '<p class="muted">예약 가능한 슬롯은 없고, 아래에 예약 불가 슬롯만 표시됩니다.</p>' : ''}
    <div role="grid" aria-label="예약 가능 슬롯 그리드" class="slot-grid" data-grid-root>
      ${rows.map((row, rowIndex) => `
        <div role="row" class="slot-grid-row">
          ${row.map((slot, columnIndex) => `
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
        <h3>예약 불가 슬롯</h3>
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
      <h2 id="booking-summary" tabindex="-1">현재 예약</h2>
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
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-modal-dialog>
          <h2 id="dialog-title" tabindex="-1">현재 예약을 취소하시겠습니까?</h2>
          <p>${escapeHtml(formatBookingSummary(run.booking))}</p>
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
  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-modal-dialog>
        <h2 id="dialog-title" tabindex="-1">${escapeHtml(formatSlotLabel(slot))}</h2>
        <p>${slot.available ? '예약 가능한 슬롯입니다.' : '현재 예약이 불가능한 슬롯입니다.'}</p>
        <p class="muted">현재 과업 목표 슬롯과 ${isTarget ? '일치합니다' : '일치하지 않습니다'}.</p>
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
      <p>${escapeHtml(task.title)}를 완료했습니다. 실제 로그와 사전 벤치마크를 함께 확인하십시오.</p>
    </section>
    <section class="review-grid">
      <article class="card">
        <h2>실제 로그 요약</h2>
        <dl class="meta-list compact">
          <div><dt>완료 시간</dt><dd>${formatSeconds(result.durationSeconds)}</dd></div>
          <div><dt>총 키 입력</dt><dd>${result.totalKeyInputs}</dd></div>
          <div><dt>포커스 이동</dt><dd>${result.focusChanges}</dd></div>
          <div><dt>backtrack 입력</dt><dd>${result.backtrackInputs}</dd></div>
          <div><dt>wrong selection</dt><dd>${result.wrongSelections}</dd></div>
          <div><dt>modal escape</dt><dd>${result.modalEscapes}</dd></div>
          <div><dt>pointer activation</dt><dd>${result.pointerActivations}</dd></div>
        </dl>
      </article>
      <article class="card">
        <h2>사전 벤치마크</h2>
        ${renderProfileBenchmarkTable(benchmark)}
      </article>
      <article class="card">
        <h2>왜 비용 차이가 나는가</h2>
        <ul>
          ${benchmark.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join('')}
        </ul>
        <div class="benchmark-delta">
          <h3>조건 B 예상 개선폭</h3>
          <ul>
            ${Object.entries(comparison).map(([profileId, value]) => `
              <li><strong>${escapeHtml(benchmarkResultsCalendar.overall[profileId].label)}</strong>: ${value.expectedReductionSeconds}초 감소 (${value.expectedReductionPercent}%)</li>
            `).join('')}
          </ul>
        </div>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-task">
        ${state.currentTaskIndex < calendarTasks.length - 1 ? '다음 과업으로' : '현재 조건 요약 보기'}
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
          <th>프로필</th>
          <th>lower</th>
          <th>expected</th>
          <th>upper</th>
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
      <p class="eyebrow">조건 ${escapeHtml(VARIANT_META[conditionId].shortLabel)} 완료</p>
      <h1 id="condition-review-heading" tabindex="-1">현재 구현 범위 요약</h1>
      <p>${escapeHtml(VARIANT_META[conditionId].title)}에서 3개 과업을 모두 마쳤습니다.</p>
    </section>
    <section class="review-grid">
      <article class="card">
        <h2>실제 수행 합계</h2>
        <dl class="meta-list compact">
          <div><dt>총 완료 시간</dt><dd>${formatSeconds(totals.durationSeconds)}</dd></div>
          <div><dt>총 키 입력</dt><dd>${totals.totalKeyInputs}</dd></div>
          <div><dt>총 포커스 이동</dt><dd>${totals.focusChanges}</dd></div>
          <div><dt>wrong selection</dt><dd>${totals.wrongSelections}</dd></div>
          <div><dt>modal escape</dt><dd>${totals.modalEscapes}</dd></div>
          <div><dt>예약 취소 횟수</dt><dd>${totals.bookingCancels}</dd></div>
        </dl>
      </article>
      <article class="card">
        <h2>예상 비용 합계</h2>
        <table class="summary-table">
          <thead>
            <tr><th>프로필</th><th>expected</th><th>A→B 예상 감소</th></tr>
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
          ${run.taskResults.map((result, index) => `<li><strong>${escapeHtml(calendarTasks[index].title)}</strong> — ${formatSeconds(result.durationSeconds)}, key ${result.totalKeyInputs}, focus ${result.focusChanges}</li>`).join('')}
        </ol>
      </article>
    </section>
    <div class="button-row">
      <button class="button button-primary" data-action="continue-after-condition">
        ${state.currentConditionIndex < state.order.length - 1 ? '다음 조건 시작' : '최종 비교 보기'}
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
      <p class="eyebrow">Calendar benchmark prototype completed</p>
      <h1 id="final-summary-heading" tabindex="-1">조건 A/B 최종 비교</h1>
      <p>실제 로그와 사전 벤치마크를 함께 보면서, 다음 서비스 유형으로 확장할 때 재사용할 기준점을 마련했습니다.</p>
    </section>
    <section class="card toolbar-card">
      <label>
        <span>벤치마크 프로필</span>
        <select name="benchmark-profile">
          ${Object.entries(benchmarkResultsCalendar.overall).map(([profileId, profile]) => `
            <option value="${profileId}" ${profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>
          `).join('')}
        </select>
      </label>
      <div class="button-row">
        <a class="button button-secondary" download="calendar-session-${escapeHtml(state.sessionId)}.json" href="${exportUrl}">세션 JSON 내려받기</a>
        ${surveyUrl ? `<a class="button button-primary" href="${surveyUrl}" target="_blank" rel="noreferrer">설문으로 결과 전달</a>` : '<span class="muted">설문 URL을 설정하면 전달 링크가 생성됩니다.</span>'}
      </div>
    </section>
    <section class="comparison-grid">
      ${renderFinalConditionCard('variantA', actualA, selectedProfileId)}
      ${renderFinalConditionCard('variantB', actualB, selectedProfileId)}
    </section>
    <section class="card">
      <h2>실제 로그 비교</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>지표</th>
            <th>조건 A</th>
            <th>조건 B</th>
            <th>차이</th>
          </tr>
        </thead>
        <tbody>
          <tr><th>총 완료 시간</th><td>${formatSeconds(actualA.durationSeconds)}</td><td>${formatSeconds(actualB.durationSeconds)}</td><td>${formatSigned(actualB.durationSeconds - actualA.durationSeconds, '초')}</td></tr>
          <tr><th>총 키 입력</th><td>${actualA.totalKeyInputs}</td><td>${actualB.totalKeyInputs}</td><td>${formatSigned(actualB.totalKeyInputs - actualA.totalKeyInputs)}</td></tr>
          <tr><th>총 포커스 이동</th><td>${actualA.focusChanges}</td><td>${actualB.focusChanges}</td><td>${formatSigned(actualB.focusChanges - actualA.focusChanges)}</td></tr>
          <tr><th>wrong selection</th><td>${actualA.wrongSelections}</td><td>${actualB.wrongSelections}</td><td>${formatSigned(actualB.wrongSelections - actualA.wrongSelections)}</td></tr>
          <tr><th>modal escape</th><td>${actualA.modalEscapes}</td><td>${actualB.modalEscapes}</td><td>${formatSigned(actualB.modalEscapes - actualA.modalEscapes)}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="card">
      <h2>다음 단계에 바로 쓸 수 있는 포인트</h2>
      <ul>
        <li>이번 구현에서 공통 실험 프레임은 이미 분리되어 있으므로, 다음 서비스 유형은 시나리오 데이터와 화면 조합만 바꾸면 됩니다.</li>
        <li>벤치마크 엔진은 task graph만 추가하면 같은 형식으로 결과를 생성할 수 있습니다.</li>
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
        <div><dt>실제 키 입력</dt><dd>${actualTotals.totalKeyInputs}</dd></div>
        <div><dt>실제 포커스 이동</dt><dd>${actualTotals.focusChanges}</dd></div>
        <div><dt>${escapeHtml(benchmarkOverall.label)} expected</dt><dd>${formatSeconds(expectedSeconds)}</dd></div>
      </dl>
    </article>
  `;
}

function aggregateActualCondition(run) {
  return run.taskResults.reduce(
    (totals, result) => {
      totals.durationSeconds += result.durationSeconds;
      totals.totalKeyInputs += result.totalKeyInputs;
      totals.focusChanges += result.focusChanges;
      totals.wrongSelections += result.wrongSelections;
      totals.modalEscapes += result.modalEscapes;
      totals.bookingCancels += result.bookingCancels;
      return totals;
    },
    {
      durationSeconds: 0,
      totalKeyInputs: 0,
      focusChanges: 0,
      wrongSelections: 0,
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
  return `${prefix}${Number(value.toFixed ? value.toFixed(1) : value)}${suffix}`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
