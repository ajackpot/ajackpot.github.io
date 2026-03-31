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


export function formatServiceScreenButtonLabel(serviceLabel) {
  return `${serviceLabel} 화면으로 이동`;
}

export function renderRunnerFooterHtml({ jumpLabel, closeLabel = '이 탭 닫기' } = {}) {
  return `
    <footer class="runner-footer" data-runner-footer data-measurement-exempt="true">
      <button class="button button-secondary" data-action="jump-results" data-focus-id="runner-footer-jump">${escapeHtml(jumpLabel)}</button>
      <button class="button button-primary" data-action="close-runner" data-focus-id="runner-footer-close">${escapeHtml(closeLabel)}</button>
    </footer>
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
