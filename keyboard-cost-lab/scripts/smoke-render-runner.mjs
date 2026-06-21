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
      ? html.includes('data-action="open-feature-panel"') && html.includes('data-feature-id="providers"') && html.includes('data-feature-id="my-counseling"')
      : true,
    hasFeaturePanel: html.includes('data-feature-panel') && html.includes('feature-panel-title'),
    placeholderTextCount: (html.match(/현재 점검 중/g) ?? []).length,
    hasRequiredCalendarActions: serviceId === 'calendar'
      ? html.includes('data-action="apply-filters"') && html.includes('data-action="slot-open"') && html.includes('data-action="end-task"')
      : true,
  };
}

const reports = [];
for (const serviceId of Object.keys(services)) {
  for (const conditionId of ['variantA', 'variantB']) {
    for (const taskIndex of [0, 1, 2]) {
      reports.push(await renderRunner({ serviceId, conditionId, taskIndex, showRequest: false }));
    }
  }
  reports.push(await renderRunner({ serviceId, conditionId: 'variantA', taskIndex: 0, showRequest: true }));
}

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
  ];
  if (report.service === 'calendar' && report.condition === 'variantB') {
    checks.push(report.gridButtonCount > 0);
    checks.push(report.gridButtonCount === report.gridButtonsWithActionCount);
  }
  if (report.service === 'calendar' && report.hasFeaturePanel) {
    checks.push(report.placeholderTextCount <= 1);
  }
  if (report.service === 'calendar' && !report.showRequest && report.taskIndex === 0 && report.condition === 'variantA' && report.htmlLength > 26000) {
    checks.push(report.hasFeaturePanel);
  }
  report.ok = checks.every(Boolean);
  if (!report.ok) failed = true;
  console.log(JSON.stringify(report));
}

if (failed) {
  process.exitCode = 1;
}
