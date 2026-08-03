export function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function uniqueId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}초`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function deepClone(value) {
  return structuredClone(value);
}

export function clsx(...tokens) {
  return tokens.filter(Boolean).join(' ');
}

export function getDefaultConditionOrder() {
  const baseOrder = ['variantA', 'variantB'];
  const randomValue = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
    : Math.random();
  return randomValue < 0.5 ? baseOrder : baseOrder.slice().reverse();
}

export function formatServiceScreenButtonLabel(serviceLabel) {
  return `${serviceLabel} 테스트 시작`;
}

export function renderRunnerFooterHtml({ jumpLabel, endLabel = '과업 종료', beforeEndHtml = '' } = {}) {
  return `
    <footer class="runner-footer" data-runner-footer data-measurement-exempt="true">
      ${beforeEndHtml ? `<div class="runner-footer-extra">${beforeEndHtml}</div>` : ''}
      <div class="runner-footer-actions">
        <button class="button button-secondary" data-action="jump-results" data-focus-id="runner-footer-jump">${escapeHtml(jumpLabel)}</button>
        <button class="button button-primary" data-action="end-task" data-focus-id="runner-footer-end">${escapeHtml(endLabel)}</button>
      </div>
    </footer>
  `;
}

export function renderRunnerCompletionDialogHtml({
  title = '수행 기록을 저장했습니다.',
  description = '수행 기록을 과업 요청이 있는 창으로 보냈습니다. ‘확인’을 누르면 이 탭이 닫힙니다.',
  confirmLabel = '확인',
} = {}) {
  return `
    <div class="modal-backdrop" data-measurement-exempt="true">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="runner-complete-title"
        aria-describedby="runner-complete-description"
        data-completion-dialog
        data-trap-dialog="true"
      >
        <h2 id="runner-complete-title" tabindex="-1">${escapeHtml(title)}</h2>
        <p id="runner-complete-description">${escapeHtml(description)}</p>
        <div class="button-row" data-measurement-exempt="true">
          <button class="button button-primary" data-action="acknowledge-task-complete" data-completion-confirm>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    </div>
  `;
}

export function renderEndTaskConfirmationDialogHtml({
  title = '현재 상태로 과업을 마칠까요?',
  description = '‘예, 종료합니다’를 누르면 현재 기록을 저장하고 이 탭을 닫습니다. ‘아니요, 계속합니다’를 누르면 과업으로 돌아갑니다.',
  confirmLabel = '예, 종료합니다',
  cancelLabel = '아니요, 계속합니다',
} = {}) {
  return `
    <div class="modal-backdrop" data-measurement-exempt="true">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-task-title"
        aria-describedby="end-task-description"
        data-modal-dialog
      >
        <h2 id="end-task-title" tabindex="-1">${escapeHtml(title)}</h2>
        <p id="end-task-description">${escapeHtml(description)}</p>
        <div class="button-row" data-measurement-exempt="true">
          <button class="button button-primary" data-action="confirm-end-task" data-dialog-primary data-focus-id="end-task-confirm">${escapeHtml(confirmLabel)}</button>
          <button class="button button-secondary" data-action="cancel-end-task" data-focus-id="end-task-cancel">${escapeHtml(cancelLabel)}</button>
        </div>
      </div>
    </div>
  `;
}


export function renderTaskRequestVisibilitySwitchHtml({ checked = false } = {}) {
  return `
    <div class="task-request-option">
      <label class="switch-field" for="runner-task-request-visible">
        <input
          id="runner-task-request-visible"
          type="checkbox"
          role="switch"
          name="runner-task-request-visible"
          ${checked ? 'checked' : ''}
          aria-describedby="runner-task-request-visible-help"
        >
        <span>과업 요청을 수행 페이지에도 표시</span>
      </label>
      <p id="runner-task-request-visible-help" class="muted">
        켜면 새 탭 맨 위에도 이번 요청이 보입니다. 끄면 서비스 화면만 표시됩니다.
      </p>
    </div>
  `;
}

export function renderRunnerTaskRequestHtml({ goalSummary, title = '이번 과업 요청' } = {}) {
  if (!goalSummary) return '';
  return `
    <section class="card runner-task-request" data-measurement-exempt="true" aria-labelledby="runner-task-request-heading">
      <h2 id="runner-task-request-heading">${escapeHtml(title)}</h2>
      <p class="goal">${escapeHtml(goalSummary)}</p>
    </section>
  `;
}


export function setRunSiteNotice(run, message) {
  if (!run) return;
  const normalized = String(message ?? '');
  run.siteNotice = normalized;
  run.liveStatus = normalized;
  run.siteNoticeSequence = (Number.isFinite(run.siteNoticeSequence) ? run.siteNoticeSequence : 0) + 1;
}

export function clearRunSiteNotice(run) {
  if (!run) return;
  run.siteNotice = '';
  run.siteNoticeSequence = (Number.isFinite(run.siteNoticeSequence) ? run.siteNoticeSequence : 0) + 1;
}

export function announceStatusMessage(message) {
  if (!message || typeof document === 'undefined') return;
  const regionId = 'keyboard-cost-lab-live-announcer';
  let region = document.getElementById(regionId);
  if (!(region instanceof HTMLElement)) {
    region = document.createElement('div');
    region.id = regionId;
    region.className = 'sr-only';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-relevant', 'text');
    region.setAttribute('data-measurement-exempt', 'true');
    document.body.appendChild(region);
  }

  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = String(message);
  }, 30);
}

export function renderSiteNoticeHtml(message) {
  if (!message) return '';
  return `
    <div class="site-notice" data-measurement-exempt="true">
      ${escapeHtml(message)}
    </div>
  `;
}

export function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  return search.toString();
}
