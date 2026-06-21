import { pathToFileURL } from 'node:url';
import path from 'node:path';

class FakeElement {
  constructor(name='element') { this.name=name; this.innerHTML=''; this.dataset={}; }
  addEventListener() {}
  removeEventListener() {}
  closest() { return null; }
  focus() { this.focused = true; }
  querySelector() { return new FakeElement('child'); }
  hasAttribute() { return false; }
}
class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
const FakeHTMLElement = FakeElement;
const prohibitedInitialHints = [
  '과업 수행에 성공했습니다.',
  '요청한 상담 예약 시간과 다른 시간을 예약했습니다.',
  '요청한 댓글과 다른 댓글에서 작업했습니다.',
  '요청한 자료와 다른 자료에서 작업했습니다.',
  'keyboard-tip',
  'live-status-region',
];
const services = {
  calendar: { module: 'app.js', page: 'index.html', prefix: 'keyboard-cost-lab-launch', marker: '예약 가능 시간', serviceId: 'calendar', taskId: 'task-1-book-remote' },
  comments: { module: 'comments-app.js', page: 'comments.html', prefix: 'keyboard-cost-lab-comments-launch', marker: '댓글 목록', serviceId: 'comments', taskId: 'task-1-newest-review-open-replies' },
  search: { module: 'search-app.js', page: 'search.html', prefix: 'keyboard-cost-lab-search-launch', marker: '검색 결과', serviceId: 'search', taskId: 'task-1-newest-guide-preview-close' },
};
for (const [name, meta] of Object.entries(services)) {
  for (const conditionId of ['variantA','variantB']) {
    const root = new FakeElement('root');
    const storage = new FakeStorage();
    const launchId = `smoke-${name}-${conditionId}`;
    storage.setItem(`${meta.prefix}:${launchId}`, JSON.stringify({
      launchId,
      sessionId: 'smoke-session',
      serviceId: meta.serviceId,
      conditionId,
      taskIndex: 0,
      taskId: meta.taskId,
      runSnapshot: {},
    }));
    globalThis.HTMLElement = FakeHTMLElement;
    globalThis.HTMLInputElement = class {};
    globalThis.HTMLSelectElement = class {};
    globalThis.Element = FakeHTMLElement;
    globalThis.document = {
      title: '',
      visibilityState: 'visible',
      querySelector(selector) { return selector === '#app' ? root : new FakeElement(selector); },
      querySelectorAll() { return []; },
      addEventListener() {},
      removeEventListener() {},
    };
    globalThis.window = {
      location: { href: `https://example.test/${meta.page}?mode=runner&sessionId=smoke-session&service=${meta.serviceId}&condition=${conditionId}&taskIndex=0&launchId=${launchId}` },
      localStorage: storage,
      addEventListener() {},
      setTimeout: globalThis.setTimeout,
      requestAnimationFrame: (cb) => cb(),
      close() {},
      closed: false,
    };
    globalThis.localStorage = storage;
    globalThis.performance = globalThis.performance ?? { now: () => Date.now() };
    const moduleUrl = pathToFileURL(path.resolve(meta.module)).href + `?smoke=${name}-${conditionId}-${Date.now()}-${Math.random()}`;
    await import(moduleUrl);
    const html = root.innerHTML;
    const hasMarker = html.includes(meta.marker);
    const hasFooter = html.includes('과업 종료');
    const hasError = html.includes('수행 창을 준비할 수 없습니다');
    const hintedTerms = prohibitedInitialHints.filter((term) => html.includes(term));
    console.log(`${name} ${conditionId}: marker=${hasMarker} footer=${hasFooter} error=${hasError} hints=${hintedTerms.length} length=${html.length}`);
    if (!hasMarker || !hasFooter || hasError || hintedTerms.length > 0 || html.length < 1000) {
      if (hintedTerms.length > 0) {
        console.error(`Initial runner page contains prohibited hint terms: ${hintedTerms.join(', ')}`);
      }
      process.exitCode = 1;
    }
  }
}
