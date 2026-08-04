import { escapeHtml, formatSeconds, toQueryString } from './utils.js';

export function renderServiceIntroView({ serviceLabel, serviceSummary }) {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">${escapeHtml(serviceLabel)}</h1>
      <p>
        ${escapeHtml(serviceSummary)}
        과업은 새 탭에서 진행합니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>진행 순서</h2>
          <ol>
            <li>내용은 같고 이동 방식이 다른 두 화면을 무작위 순서로 테스트합니다.</li>
            <li>두 화면에서 같은 과업을 수행합니다.</li>
            <li>과업을 마쳤다고 판단하면 수행 페이지 맨 아래의 ‘과업 종료’를 누릅니다.</li>
          </ol>
        </section>
        <section>
          <h2>알아두세요</h2>
          <ul>
            <li>이 테스트는 Windows, macOS 등을 사용하는 데스크톱이나 노트북 PC에서 진행해 주세요.</li>
            <li>과업 요청은 이 창에서 언제든 다시 확인할 수 있습니다.</li>
            <li>과업을 완료하기 어렵더라도 ‘과업 종료’를 누르면 현재 상태를 저장하고 다음 단계로 이동할 수 있습니다.</li>
            <li>두 화면을 모두 마치면 결과를 한 번에 확인할 수 있습니다.</li>
          </ul>
        </section>
      </div>
      <div class="button-row">
        <button class="button button-primary" data-action="start-experiment">첫 과업 준비하기</button>
        <button class="button button-secondary" data-action="go-home">다른 서비스 고르기</button>
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
    return '아직 과업 수행 페이지를 열지 않았습니다. 이번 요청을 확인한 뒤 시작해 주세요.';
  }
  if (activeLaunch.status === 'blocked') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'opening') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'ready') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'started') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'closed') return activeLaunch.lastMessage;
  if (activeLaunch.status === 'completed') return activeLaunch.lastMessage;
  return isRunning ? '과업 수행 페이지가 새 탭에 열려 있습니다.' : '과업을 시작할 준비가 되었습니다.';
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
        <div><dt>실제 수행 시간</dt><dd>${formatSeconds(actualTotals.durationSeconds)}</dd></div>
        <div><dt>총 키 입력</dt><dd>${actualTotals.totalKeyInputs}</dd></div>
        <div><dt>총 초점 이동</dt><dd>${actualTotals.focusChanges}</dd></div>
        <div><dt>완료한 과업</dt><dd>${actualTotals.successCount ?? 0}개</dd></div>
        <div><dt>완료하지 못한 과업</dt><dd>${actualTotals.incompleteCount ?? 0}개</dd></div>
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

export function buildExportPayload({ serviceId, sessionId, order, measurementRules, actualRuns, benchmarkResults, storedServices = null }) {
  return {
    exportedAt: new Date().toISOString(),
    serviceId,
    sessionId,
    order,
    measurementRules,
    actual: actualRuns,
    benchmark: benchmarkResults,
    storedServices,
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
