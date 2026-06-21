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

export function renderServiceIntroView({ serviceLabel, serviceSummary }) {
  return `
    <header class="hero card">
      <p class="eyebrow">선택한 서비스 유형</p>
      <h1 id="service-heading" tabindex="-1">${escapeHtml(serviceLabel)}</h1>
      <p>
        ${escapeHtml(serviceSummary)}
        과업 수행은 별도 탭에서 진행하며, 이 창에는 과업 요청이 남아 있습니다.
      </p>
      <div class="hero-grid">
        <section>
          <h2>진행 방법</h2>
          <ul>
            <li>두 개의 화면은 자동으로 섞인 순서로 열립니다.</li>
            <li>각 화면에서 같은 과업 묶음을 수행합니다.</li>
            <li>수행 탭에서 과업이 끝났다고 판단하면 하단의 과업 종료 버튼을 누릅니다.</li>
          </ul>
        </section>
        <section>
          <h2>주의할 점</h2>
          <ul>
            <li>과업 요청은 이 창에서 다시 확인할 수 있습니다.</li>
            <li>수행할 수 없다고 판단해도 수행 탭의 과업 종료 버튼으로 다음 단계로 넘어갑니다.</li>
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
        <div><dt>수행 완료 기록</dt><dd>${actualTotals.successCount ?? 0}개</dd></div>
        <div><dt>수행 불가능 기록</dt><dd>${actualTotals.incompleteCount ?? 0}개</dd></div>
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
