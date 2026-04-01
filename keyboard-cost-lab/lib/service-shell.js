import { escapeHtml, formatSeconds, toQueryString } from './utils.js';

export function renderLanguageGuideCard(glossaryEntries, introText = '이 실험은 사용자가 낯선 영어 표현을 학습하지 않아도 이해할 수 있도록 자주 쓰는 한국어를 우선 사용합니다.') {
  return `
    <details class="card glossary-card">
      <summary>용어 설명 보기</summary>
      <p class="muted">${escapeHtml(introText)}</p>
      <dl class="glossary-list">
        ${glossaryEntries.map((entry) => `
          <div>
            <dt>${escapeHtml(entry.term)}</dt>
            <dd>${escapeHtml(entry.description)}</dd>
          </div>
        `).join('')}
      </dl>
    </details>
  `;
}

export function renderServiceIntroView({ serviceLabel, serviceSummary, introPoints, order, variantMeta, introHeading = '이번에 확인하는 것' }) {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">${escapeHtml(serviceLabel)}</h1>
      <p>
        ${escapeHtml(serviceSummary)}
        이 화면에서 과업 준비 단계로 들어가거나, 다시 서비스 선택 화면으로 돌아갈 수 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>${escapeHtml(introHeading)}</h2>
          <ul>
            ${introPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
          </ul>
        </section>
        <section>
          <h2>실험 설정</h2>
          <dl class="meta-list">
            <div><dt>비교안 순서</dt><dd>${order.map((variantId) => variantMeta[variantId].shortLabel).join(' → ')}</dd></div>
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

export function renderProfileBenchmarkTable(benchmark) {
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

export function renderLaunchStatusMessage(activeLaunch, isRunning) {
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

export function renderFinalConditionCard({ conditionId, actualTotals, selectedProfileId, benchmarkResults, variantMeta }) {
  const benchmarkOverall = benchmarkResults.overall[selectedProfileId];
  const expectedSeconds = conditionId === 'variantA'
    ? benchmarkOverall.variantAExpectedSeconds
    : benchmarkOverall.variantBExpectedSeconds;

  return `
    <article class="card final-condition-card">
      <h2>${escapeHtml(variantMeta[conditionId].title)}</h2>
      <p class="muted">${escapeHtml(variantMeta[conditionId].subtitle)}</p>
      <dl class="meta-list compact">
        <div><dt>실제 완료 시간</dt><dd>${formatSeconds(actualTotals.durationSeconds)}</dd></div>
        <div><dt>총 키 입력</dt><dd>${actualTotals.totalKeyInputs}</dd></div>
        <div><dt>총 초점 이동</dt><dd>${actualTotals.focusChanges}</dd></div>
        <div><dt>${escapeHtml(benchmarkOverall.label)} 기준 예상 시간</dt><dd>${formatSeconds(expectedSeconds)}</dd></div>
      </dl>
    </article>
  `;
}

export function aggregateBenchmarkCondition({ benchmarkResults, conditionId }) {
  const variantResults = benchmarkResults.variants[conditionId].tasks;
  const totals = {};
  for (const [profileId, overall] of Object.entries(benchmarkResults.overall)) {
    const expectedSeconds = Object.values(variantResults)
      .reduce((sum, taskResult) => sum + taskResult.profiles[profileId].ranges.expected.seconds, 0);
    totals[profileId] = {
      label: overall.label,
      expectedSeconds: Number(expectedSeconds.toFixed(1)),
      variantReductionHint: `${overall.expectedReductionSeconds}초 (${overall.expectedReductionPercent}%)`,
    };
  }
  return totals;
}

export function buildExportPayload({ serviceId, sessionId, order, measurementRules, actualRuns, benchmarkResults }) {
  return {
    exportedAt: new Date().toISOString(),
    serviceId,
    sessionId,
    order,
    measurementRules,
    actual: actualRuns,
    benchmark: benchmarkResults,
  };
}

export function buildExportDataUrl(payload) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
}

export function buildSurveyUrl({ baseUrl, sessionId, serviceId, order, actualA, actualB }) {
  if (!baseUrl) return '';
  const params = {
    sessionId,
    serviceId,
    order: order.join(','),
    actualA,
    actualB,
  };
  return `${baseUrl}?${toQueryString(params)}`;
}

export function formatSigned(value, suffix = '') {
  const prefix = value > 0 ? '+' : '';
  const normalized = typeof value === 'number' ? Number(value.toFixed(1)) : Number(value);
  return `${prefix}${normalized}${suffix}`;
}

export function aggregateMetrics(taskResults, metricKeys) {
  return taskResults.reduce((totals, result) => {
    for (const [key, sourceKey] of Object.entries(metricKeys)) {
      totals[key] += result[sourceKey] ?? 0;
    }
    return totals;
  }, Object.fromEntries(Object.keys(metricKeys).map((key) => [key, 0])));
}
