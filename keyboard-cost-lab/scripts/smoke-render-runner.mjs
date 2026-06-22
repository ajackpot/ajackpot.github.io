import { pathToFileURL } from 'node:url';
import path from 'node:path';

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const services = {
  calendar: {
    appFile: 'app.js',
    pagePath: 'index.html',
    launchPrefix: 'keyboard-cost-lab-launch',
    primaryPattern: /예약 가능 시간/,
    baseSnapshot(condition) {
      return {
        variantId: condition,
        filters: { serviceType: 'counseling', mode: 'all', provider: 'all', duration: 'all' },
        filtersDraft: { serviceType: 'counseling', mode: 'all', provider: 'all', duration: 'all' },
        booking: null,
        bookings: [],
        bookingCompletion: null,
        currentGridSlotId: null,
        cancelPerformedThisTask: false,
        lastTaskCompletionNote: '',
        finalConfirmationAcknowledged: false,
        siteNotice: '',
      };
    },
  },
  comments: {
    appFile: 'comments-app.js',
    pagePath: 'comments.html',
    launchPrefix: 'keyboard-cost-lab-comments-launch',
    primaryPattern: /댓글 목록/,
    baseSnapshot(condition) {
      return {
        variantId: condition,
        sort: 'popular',
        sortDraft: 'popular',
        category: 'all',
        categoryDraft: 'all',
        helpfulByCommentId: {},
        expandedCommentId: null,
        replyListVisitedThisTask: {},
        replyAnswerDrafts: {},
        submittedReplyAnswers: {},
        replyAuthorAssignments: {},
        currentCommentId: null,
        detailVisitedThisTask: {},
        lastTaskCompletionNote: '',
        finalConfirmationAcknowledged: false,
        siteNotice: '',
      };
    },
  },
  search: {
    appFile: 'search-app.js',
    pagePath: 'search.html',
    launchPrefix: 'keyboard-cost-lab-search-launch',
    primaryPattern: /검색 결과/,
    baseSnapshot(condition) {
      return {
        variantId: condition,
        sort: 'relevance',
        sortDraft: 'relevance',
        type: 'all',
        typeDraft: 'all',
        savedByResultId: {},
        saveOptionsByResultId: {},
        saveOptionDraft: { folder: 'general', include: 'summary', format: 'web' },
        previewAnswerDrafts: {},
        submittedPreviewAnswers: {},
        savedFeatureItems: {},
        searchAlertEnabled: false,
        query: '상담',
        queryDraft: '상담',
        featurePanel: null,
        openedResultId: null,
        currentResultId: null,
        previewVisitedThisTask: {},
        lastTaskCompletionNote: '',
        finalConfirmationAcknowledged: false,
        siteNotice: '',
      };
    },
  },
};

class FakeElement {}
class FakeHTMLElement extends FakeElement {
  focus() {}
  closest() { return null; }
  contains() { return false; }
  hasAttribute() { return false; }
}
class FakeHTMLInputElement extends FakeHTMLElement {}
class FakeHTMLSelectElement extends FakeHTMLElement {}
class FakeHTMLFormElement extends FakeHTMLElement {}

function configureGlobals({ serviceId, conditionId, taskIndex, showRequest, snapshotOverrides = {} }) {
  const root = {
    innerHTML: '',
    addEventListener() {},
    removeEventListener() {},
  };
  const storage = new Map();
  const service = services[serviceId];
  const launchId = `smoke-${serviceId}-${conditionId}-${taskIndex}-${showRequest ? 'request' : 'plain'}`;
  const sessionId = 'smoke-session';
  const storageKey = `${service.launchPrefix}:${launchId}`;
  storage.set(storageKey, JSON.stringify({
    launchId,
    sessionId,
    serviceId,
    conditionId,
    taskIndex,
    taskId: `task-${taskIndex + 1}`,
    runSnapshot: {
      ...service.baseSnapshot(conditionId),
      ...snapshotOverrides,
    },
    runnerTaskRequestVisible: showRequest,
  }));

  globalThis.Element = FakeElement;
  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.HTMLInputElement = FakeHTMLInputElement;
  globalThis.HTMLSelectElement = FakeHTMLSelectElement;
  globalThis.HTMLFormElement = FakeHTMLFormElement;
  globalThis.window = {
    location: {
      href: `http://localhost/${service.pagePath}?mode=runner&sessionId=${sessionId}&service=${serviceId}&condition=${conditionId}&taskIndex=${taskIndex}&launchId=${launchId}`,
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { return setTimeout(callback, 0); },
    setTimeout,
    clearTimeout,
    close() { this.closed = true; },
    closed: false,
  };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.document = {
    title: '',
    visibilityState: 'visible',
    activeElement: null,
    querySelector(selector) {
      if (selector === '#app') return root;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  };
  return root;
}

async function renderRunner({ serviceId, conditionId, taskIndex, showRequest, snapshotOverrides = {} }) {
  const root = configureGlobals({ serviceId, conditionId, taskIndex, showRequest, snapshotOverrides });
  const moduleUrl = pathToFileURL(path.join(projectDir, services[serviceId].appFile)).href
    + `?smoke=${Date.now()}-${Math.random()}`;
  await import(moduleUrl);
  const html = root.innerHTML;
  const gridButtons = html.match(/<button[^>]*data-grid-slot="true"[^>]*>/g) ?? [];
  const gridButtonsWithAction = gridButtons.filter((button) => /data-action="slot-open"/.test(button));
  return {
    service: serviceId,
    condition: conditionId,
    taskIndex,
    showRequest,
    htmlLength: html.length,
    buttonCount: (html.match(/<button\b/g) ?? []).length,
    linkCount: (html.match(/<a\b/g) ?? []).length,
    hasRunnerMain: html.includes('runner-main'),
    hasError: html.includes('수행 창을 준비할 수 없습니다'),
    hasEndButton: html.includes('data-action="end-task"'),
    hasPrimaryContent: services[serviceId].primaryPattern.test(html),
    hasTaskRequestPanel: html.includes('runner-task-request-heading'),
    leaksSessionId: html.includes('smoke-session'),
    gridButtonCount: gridButtons.length,
    gridButtonsWithActionCount: gridButtonsWithAction.length,
    hasCalendarFeatureActions: serviceId === 'calendar'
      ? html.includes('data-action="open-feature-panel"')
        && html.includes('data-feature-id="my-counseling"')
        && (conditionId === 'variantB' ? !html.includes('data-feature-id="providers"') : html.includes('data-feature-id="providers"'))
      : true,
    calendarVariantBNavLinksExcluded: serviceId === 'calendar' && conditionId === 'variantB'
      ? !html.includes('data-focus-id="nav-1"')
      : true,
    hasSearchFeatureActions: serviceId === 'search'
      ? html.includes('data-action="open-search-feature"') && html.includes('data-feature-id="help"') && html.includes('data-feature-id="type-help"')
      : true,
    hasFeaturePanel: html.includes('data-feature-panel') && (html.includes('feature-panel-title') || html.includes('community-feature-title') || html.includes('search-feature-title')), 
    placeholderTextCount: (html.match(/현재 점검 중/g) ?? []).length,
    hasRequiredCalendarActions: serviceId === 'calendar'
      ? html.includes('data-action="apply-filters"') && html.includes('data-action="slot-open"') && html.includes('data-action="end-task"')
      : true,
    hasReplyQuestionForm: html.includes('runner-end-answer-heading') && html.includes('답변 제출하고 과업 종료하기'),
    hasBookingCompletionPanel: html.includes('booking-completion-heading') && html.includes('예약이 완료되었습니다'),
    hasGenericTaskFinalDialogText: html.includes('처리가 완료되었습니다.'),
  };
}

const reports = [];
for (const serviceId of Object.keys(services)) {
  for (const conditionId of ['variantA', 'variantB']) {
    for (const taskIndex of [0, 1]) {
      reports.push(await renderRunner({ serviceId, conditionId, taskIndex, showRequest: false }));
    }
  }
  reports.push(await renderRunner({ serviceId, conditionId: 'variantA', taskIndex: 0, showRequest: true }));
}


reports.push(await renderRunner({
  serviceId: 'comments',
  conditionId: 'variantA',
  taskIndex: 0,
  showRequest: false,
  snapshotOverrides: {
    expandedCommentId: 'comment-minji',
    replyListVisitedThisTask: { 'comment-minji': true },
    replyAnswerDrafts: { 'comment-minji': '승민' },
  },
}));

reports.push(await renderRunner({
  serviceId: 'calendar',
  conditionId: 'variantA',
  taskIndex: 0,
  showRequest: false,
  snapshotOverrides: {
    booking: { slotId: 'kim-tue-1430-remote-30', taskId: 'task-1-book-remote', at: '2026-06-22T00:00:00.000Z' },
    bookingCompletion: { slotId: 'kim-tue-1430-remote-30', completedAt: '2026-06-22T00:00:00.000Z' },
  },
}));

for (const featureId of ['home', 'providers', 'passes', 'reviews', 'pricing', 'faq', 'policy', 'support', 'notifications', 'my-counseling', 'usage-guide', 'search']) {
  reports.push(await renderRunner({
    serviceId: 'calendar',
    conditionId: 'variantA',
    taskIndex: 0,
    showRequest: false,
    snapshotOverrides: {
      featurePanel: { featureId, triggerFocusId: 'nav-1', query: '심리 상담' },
      savedFeatureItems: {},
      selectedPass: 'single',
      reminderSettings: { email: true, sms: false },
    },
  }));
}


for (const featureId of ['home', 'post-list', 'popular-posts', 'community-guide', 'new-post', 'notifications', 'my-comments', 'rules', 'writing-guide', 'support', 'report', 'author-profile', 'comment-timeline']) {
  reports.push(await renderRunner({
    serviceId: 'comments',
    conditionId: 'variantA',
    taskIndex: 0,
    showRequest: false,
    snapshotOverrides: {
      featurePanel: { featureId, triggerFocusId: 'community-nav-1', commentId: 'comment-minji' },
      savedFeatureItems: {},
    },
  }));
}

for (const featureId of ['home', 'help', 'history', 'saved', 'folder', 'request', 'guide', 'support', 'alert', 'search-run', 'type-help', 'result-history']) {
  reports.push(await renderRunner({
    serviceId: 'search',
    conditionId: 'variantA',
    taskIndex: 0,
    showRequest: false,
    snapshotOverrides: {
      featurePanel: { featureId, triggerFocusId: 'search-nav-1', resultId: 'result-change-guide', query: '예약 변경' },
      savedFeatureItems: {},
      searchAlertEnabled: featureId === 'alert',
      query: '예약 변경',
      queryDraft: '예약 변경',
    },
  }));
}

let failed = false;
for (const report of reports) {
  const checks = [
    report.hasRunnerMain,
    !report.hasError,
    report.hasEndButton,
    report.hasPrimaryContent,
    !report.leaksSessionId,
    report.showRequest ? report.hasTaskRequestPanel : !report.hasTaskRequestPanel,
    report.hasRequiredCalendarActions,
    report.hasCalendarFeatureActions,
    report.calendarVariantBNavLinksExcluded,
  ];
  if (report.service === 'calendar' && report.condition === 'variantB') {
    checks.push(report.gridButtonCount > 0);
    checks.push(report.gridButtonCount === report.gridButtonsWithActionCount);
  }
  if (report.service === 'calendar' && report.hasFeaturePanel) {
    checks.push(report.placeholderTextCount <= 1);
  }
  if (report.service === 'comments' && report.hasFeaturePanel) {
    checks.push(report.placeholderTextCount === 0);
  }
  if (report.service === 'comments' && report.condition === 'variantA' && report.taskIndex === 0 && report.htmlLength > 14500) {
    checks.push(report.hasReplyQuestionForm);
    checks.push(!report.hasGenericTaskFinalDialogText);
  }
  if (report.service === 'search') {
    checks.push(report.hasSearchFeatureActions);
    checks.push(!report.hasGenericTaskFinalDialogText);
    if (report.hasFeaturePanel) {
      checks.push(report.placeholderTextCount === 0);
    }
  }
  if (report.service === 'calendar' && !report.showRequest && report.condition === 'variantA' && report.taskIndex === 0 && report.htmlLength > 26000 && !report.hasFeaturePanel) {
    checks.push(report.hasBookingCompletionPanel);
  }
  if (report.service === 'calendar' && !report.showRequest && report.taskIndex === 0 && report.condition === 'variantA' && report.htmlLength > 26000) {
    checks.push(report.hasFeaturePanel || report.hasBookingCompletionPanel);
  }
  report.ok = checks.every(Boolean);
  if (!report.ok) failed = true;
  console.log(JSON.stringify(report));
}

if (failed) {
  process.exitCode = 1;
}
